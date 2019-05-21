import Colors  from "./gcode-colors"
import Parser  from "./gcode-parser"



export class Preview {
    limit : number
    rotation : number
    rotationAnimation : Boolean
    scale : number
    zoneColors : Boolean
    canvas : HTMLCanvasElement
    ctx : CanvasRenderingContext2D
    targetId: string
    layers : []
    header : {}
    center : {
      x: number,
      y: number,
    }
    constructor(opts) {
        this.limit = opts.limit;
        this.scale = opts.scale;
        this.rotation = opts.rotation === undefined ? 0 : opts.rotation;
        this.rotationAnimation = opts.rotationAnimation;
        this.zoneColors = opts.zoneColors;

        if (opts.canvas instanceof HTMLCanvasElement) {
          this.canvas = opts.canvas;
          this.ctx = this.canvas.getContext('2d');
        }
        else
        {
          this.targetId = opts.targetId;
          const target = document.getElementById(this.targetId);
          if (!target) throw new Error('Unable to find element ' + this.targetId);
          this.canvas = document.createElement('canvas');
          this.ctx = this.canvas.getContext('2d');
          target.appendChild(this.canvas);
          this.resize();
        }
    }

    clear() {
        this.ctx.clearRect(
            -this.canvas.width/2,
            -this.canvas.height/2,
            this.canvas.width,
            this.canvas.height);
    }

    resize () {
      console.log('offsetWidth', this.canvas.parentNode.offsetWidth)

      this.canvas.width = this.canvas.parentNode.offsetWidth;
      this.canvas.height = this.canvas.offsetHeight;
    }

    getZoneColor(zone, layerIndex) {

        const brightness = Math.round(layerIndex/this.layers.length * 80);
        if (!this.zoneColors)
            return 'hsl(0, 0%, '+brightness+'%)';

        const colors = Colors[this.header.slicer];
        return colors[zone];
    }

    renderZone(l, layerIndex) {
        this.ctx.strokeStyle = this.getZoneColor(l.zone, layerIndex);
        this.ctx.beginPath();
        for (const cmd of l.commands) {
            if (cmd.g == 0)
              this.ctx.moveTo(cmd.x, cmd.y);
            else if (cmd.g == 1) {
              if (cmd.e > 0)
                this.ctx.lineTo(cmd.x, cmd.y);
              else
                this.ctx.moveTo(cmd.x, cmd.y);
            }
        }
        this.ctx.stroke();
    }

    drawLayer(index, limit) {
        if (index > limit) return;

        const layer = this.layers[index];
        const offset = this.projectIso({x:0, y:0}, index);

        this.ctx.save();


        this.ctx.scale(this.scale, this.scale);

        this.ctx.translate(offset.x, offset.y);
        this.ctx.rotate(this.rotation * Math.PI / 180);

        // center model
        this.ctx.translate(-this.center.x, -this.center.y);

        // draw zones
        for (const zone of layer.zones) {
            this.renderZone(zone, index);
        }

        // if (index === 0)
        //   this.drawBounds();

        this.ctx.restore();
    }

    render() {
        // reset
        this.canvas.width = this.canvas.width;
        this.ctx.lineWidth = 0.1;

        if (!this.scale)
          this.scale = this.autoscale();

        this.ctx.scale(1,-1);

        // put the origin 0,0 in the center
        this.ctx.translate(this.canvas.width/2,-this.canvas.height/2);

        // center model and adjusr for perspective projection
        this.center = this.getAdjustedCenter();

        for (let index=0 ; index < this.layers.length ; index++ ) {
            this.drawLayer(index, this.limit);
        }
    }

    processGCode(gcode) {
        console.time('parsing');
        const { header, layers, limit } = GCodeThumbs.parseGcode(gcode);
        console.timeEnd('parsing');

        this.header = header;
        this.layers = layers;
        this.limit = limit;

        console.time('rendering');
        this.render();
        console.timeEnd('rendering');
    }

    animationLoop() {
        if (!this.rotationAnimation) return;
        requestAnimationFrame(this.animationLoop.bind(this));

        this.rotation += 2;
        this.rotation %= 360;
        // rotationSlider.value = rotation;
        this.render();
    }

    startAnimation() {
        this.rotationAnimation = true;
        // rotationSlider.setAttribute('disabled', 'disabled');
        this.animationLoop();
    }
    stopAnimation() {
        this.rotationAnimation = false;
        // rotationSlider.removeAttribute('disabled');
    }

    getOuterBounds(layer) {
      const l = layer || this.layers[0];
      let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;

      outer:
      for(let zone of l.zones) {
          inner:
          for(let cmd of zone.commands) {
              if (cmd.g == 91) break outer; // quick hack to detect we're at the end
              if (cmd.g != 0 && cmd.g != 1) continue inner;
              if (cmd.x < minX) minX = cmd.x;
              if (cmd.x > maxX) maxX = cmd.x;
              if (cmd.y < minY) minY = cmd.y;
              if (cmd.y > maxY) maxY = cmd.y;
          }
      }

      return {
          minX,
          maxX,
          minY,
          maxY
      };
  }

  getCenter(layer) {
      const l = layer || this.layers[0];
      const bounds = this.getOuterBounds(l);

      return {
          x : bounds.minX + (bounds.maxX - bounds.minX) / 2,
          y : bounds.minY + (bounds.maxY - bounds.minY) / 2
      };
  }

  getAdjustedCenter() {
    const center = this.getCenter(this.layers[0]);
    this.maxProjectionOffset = this.projectIso({x:0,y:0}, this.layers.length-1);
    console.log(this.maxProjectionOffset)
    center.x += this.maxProjectionOffset.x/2;
    center.y += this.maxProjectionOffset.y/2;

    return center;
  }

  getSize(layer) {
      const l = layer || this.layers[0];
      const bounds = this.getOuterBounds(l);

      const sizeX = bounds.maxX - bounds.minX;
      const sizeY = bounds.maxY - bounds.minY;
      return {sizeX, sizeY};
  }

  drawBounds(layer) {
    const l = layer || this.layers[0];
    const {minX, maxX, minY, maxY} = this.getOuterBounds(l);
    this.ctx.moveTo(minX, 0);
		this.ctx.lineTo(minX, this.canvas.height);
    this.ctx.stroke();

    this.ctx.moveTo(maxX, 0);
		this.ctx.lineTo(maxX, this.canvas.height);
    this.ctx.stroke();

    this.ctx.moveTo(0, minY);
		this.ctx.lineTo(this.canvas.width, minY);
    this.ctx.stroke();

    this.ctx.moveTo(0, maxY);
		this.ctx.lineTo(this.canvas.width, maxY);
    this.ctx.stroke();
  }

  autoscale() {
    const {sizeX, sizeY} = this.getSize();
    const {width, height} = this.canvas;
    var scale;

    if (sizeX / sizeY > width / height)
      scale = width / sizeX

    else
      scale = height / sizeY

    this.scale *= 0.8;

    return scale;
  }

  projectIso(point : { x : number, y: number}, layerIndex : number  ) {
    return {
        x : point.x,
        y : point.y + 0.1 * layerIndex
     }
  }
}
}
