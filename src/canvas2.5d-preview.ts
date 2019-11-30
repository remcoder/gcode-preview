import { Parser, Layer, MoveCommand } from './gcode-parser';

export type PreviewOptions = Partial<{
  limit: number,
  scale: number,
  lineWidth: number,
  rotation: number,
  rotationAnimation: boolean,
  zoneColors: boolean,
  canvas: HTMLCanvasElement,
  targetId: string
}>

export class Preview implements PreviewOptions {
  limit : number
  rotation : number
  lineWidth = 0.6
  rotationAnimation : boolean
  scale : number
  zoneColors : boolean
  targetId: string
  container: HTMLElement
  canvas : HTMLCanvasElement
  ctx : CanvasRenderingContext2D
  layers : Layer[]
  header : { slicer: string }
  center : {
    x: number,
    y: number,
  }
  parser = new Parser()
  maxProjectionOffset : {x:number, y:number}

  constructor(opts: PreviewOptions) {
    this.limit = opts.limit;
    this.scale = opts.scale;
    if (opts.lineWidth) this.lineWidth = opts.lineWidth;
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
      this.container = document.getElementById(this.targetId);
      if (!this.container) throw new Error('Unable to find element ' + this.targetId);
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.container.appendChild(this.canvas);
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

  resize() {
    this.canvas.width = (this.canvas.parentNode as HTMLElement).offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }

  // getZoneColor(zone, layerIndex) {

  //     const brightness = Math.round(layerIndex/this.layers.length * 80);
  //     if (!this.zoneColors)
  //         return 'hsl(0, 0%, '+brightness+'%)';

  //     const colors = Colors[this.header.slicer];
  //     return colors[zone];
  // }

  renderWithColor(l: Layer, layerIndex: number, color?: string) {
    if (color)
      this.ctx.strokeStyle = color; 
    else {
      const brightness = Math.round(layerIndex/this.layers.length * 80);
      this.ctx.strokeStyle = 'hsl(0, 0%, '+brightness+'%)';
    }

    this.ctx.beginPath();
    for (const cmd of l.commands) {
      if (cmd.gcode == 'g0') {
        const g0 = (cmd as MoveCommand);
        this.ctx.moveTo(g0.params.x, g0.params.y);
      }
      else if (cmd.gcode == 'g1') {
        const g1 = (cmd as MoveCommand);
        if (g1.params.e > 0)
          this.ctx.lineTo(g1.params.x, g1.params.y);
        else
          this.ctx.moveTo(g1.params.x, g1.params.y);
      }
    }
    this.ctx.stroke();
  }

  drawLayer(index: number, limit: number) {
      if (index > limit) return;

      const layer = this.layers[index];
      const offset = this.projectIso({x:0, y:0}, index);

      this.ctx.save();

      this.ctx.scale(this.scale, this.scale);

      this.ctx.translate(offset.x, offset.y);
      this.ctx.rotate(this.rotation * Math.PI / 180);

      // center model
      if (this.center)
        this.ctx.translate(-this.center.x, -this.center.y);

      this.renderWithColor(layer, index);

      // if (index === 0)
      //   this.drawBounds(layer, 'red');

      this.ctx.restore();
  }

  render() {
      // reset
      this.canvas.width = this.canvas.width;
      this.ctx.lineWidth = this.lineWidth;

      // if (!this.scale)
      //   this.scale = this.autoscale();

      this.ctx.scale(1,-1);

      // put the origin 0,0 in the center
      this.ctx.translate(this.canvas.width/2,-this.canvas.height/2);

      // center model
      this.center = this.getAdjustedCenter();

      for (let index=0 ; index < this.layers.length ; index++ ) {
          this.drawLayer(index, this.limit);
      }
  }

  processGCode(gcode: string) {
      const { header, layers } = this.parser.parseGcode(gcode);

      this.header = header;
      this.layers = layers;
      this.limit = layers.length -1;

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

  getOuterBounds(layer:Layer) {
    const l = layer || this.layers[0];
    let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;

    for(let cmd of l.commands as MoveCommand[]) {
      if (cmd.gcode == 'g91') break;
      if (cmd.gcode != 'g0' && cmd.gcode != 'g1') continue;
      if (cmd.params.x < minX) minX = cmd.params.x;
      if (cmd.params.x > maxX) maxX = cmd.params.x;
      if (cmd.params.y < minY) minY = cmd.params.y;
      if (cmd.params.y > maxY) maxY = cmd.params.y;
    }

    if (minX === Infinity || maxX === -Infinity || minY === Infinity || minY === -Infinity)
      return null;

    return {
        minX,
        maxX,
        minY,
        maxY
    };
}

getCenter(layer: Layer) {
  const bounds = this.getOuterBounds(layer);
  
  if (!bounds) return null;
  
  return {
      x : bounds.minX + (bounds.maxX - bounds.minX) / 2,
      y : bounds.minY + (bounds.maxY - bounds.minY) / 2
  };
}

getAdjustedCenter() {
  let center = null;
  let l = 0;
  // some gcode sequences, like priming lines, don't move in the Y direction, in which case there isn't really a bounding box
  while(!center && l<this.layers.length) {
    center = this.getCenter(this.layers[l]);
    l++;
  }
  
  if (!center) {
    console.warn('Could not determine center of toolpath.');
    return null;
  }
  this.maxProjectionOffset = this.projectIso({x:0,y:0}, this.layers.length-1);
  center.x += this.maxProjectionOffset.x/2;
  center.y += this.maxProjectionOffset.y/2;

  return center;
}

getSize(layer? : Layer) {
    const l = layer || this.layers[0];
    const bounds = this.getOuterBounds(l);

    const sizeX = bounds.maxX - bounds.minX;
    const sizeY = bounds.maxY - bounds.minY;
    return {sizeX, sizeY};
}

drawBounds(layer: Layer, color: string) {
  this.ctx.strokeStyle = color;

  const {minX, maxX, minY, maxY} = this.getOuterBounds(layer);
  console.log(minX, minY, maxX-minX, maxY-minY)
  this.ctx.strokeRect(minX, minY, maxX-minX, maxY-minY);
}

autoscale() {
  const {sizeX, sizeY} = this.getSize();
  const {width, height} = this.canvas;
  var scale;

  if (sizeX / sizeY > width / height)
    scale = width / sizeX

  else
    scale = height / sizeY

  scale *= 0.2;

  return scale;
}

projectIso(point : { x : number, y: number}, layerIndex : number  ) {
  return {
      x : point.x,
      y : point.y + 0.1 * layerIndex
   }
}
}