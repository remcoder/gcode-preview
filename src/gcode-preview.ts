import Colors  from "./gcode-colors"
import { Parser, Layer, MoveCommand }  from "./gcode-parser"
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
export { Colors };

type RenderLayer = { extrusion: number[], travel: number[], z: number };
type Point = {x:number, y:number, z:number};
type State = {x:number, y:number, z:number, e:number}; // feedrate?

type PreviewOptions = Partial<{
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
    lineWidth : number
    rotationAnimation : boolean
    scale : number
    zoneColors : boolean
    canvas : HTMLCanvasElement
    ctx : CanvasRenderingContext2D
    targetId: string
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
      this.lineWidth = opts.lineWidth || 0.6;
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
        const { header, layers, limit } = this.parser.parseGcode(gcode);

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

      return {
          minX,
          maxX,
          minY,
          maxY
      };
  }

  getCenter(layer: Layer) {
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

export class WebGlPreview implements PreviewOptions {
  parser = new Parser()
  limit : number
  lineWidth : number
  scale : number
  zoneColors : boolean
  canvas : HTMLCanvasElement
  ctx : CanvasRenderingContext2D
  targetId: string
  layers : Layer[]
  header : { slicer: string }
  center : {
    x: number,
    y: number,
  }
  maxProjectionOffset : {x:number, y:number}
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  group: THREE.Group
  travelColor = 0x990000
  extrusionColor = 0x00FF00
  container : HTMLElement

  constructor(opts: PreviewOptions) {
    this.limit = opts.limit;
    this.scale = opts.scale;
    this.lineWidth = opts.lineWidth || 0.6;
    this.zoneColors = opts.zoneColors;

    this.scene =  new THREE.Scene();

    this.targetId = opts.targetId;
    this.container = document.getElementById(this.targetId);
    if (!this.container) throw new Error('Unable to find element ' + this.targetId);
    
    this.camera = new THREE.PerspectiveCamera( 75, this.container.offsetWidth/this.container.offsetHeight, 0.1, 1000 );
    this.camera.position.set( 0, 0, 50 );
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize( this.container.offsetWidth, this.container.offsetHeight );
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild( this.renderer.domElement );
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.animate();
  }

  animate() {
    this.renderer.render( this.scene, this.camera );
    requestAnimationFrame(() => this.animate() );
  }

  processGCode(gcode: string) {
    const { header, layers, limit } = this.parser.parseGcode(gcode);

    this.header = header;
    this.layers = layers;
    this.limit = limit;

    console.time('rendering webgl');
    this.render();
    console.timeEnd('rendering webgl');  
  }

  render() {
    this.group = new THREE.Group();
    this.group.name = 'gcode';
    const state = {x:0, y:0, z:0, e:0};

    for (let index=0 ; index < this.layers.length ; index++ ) {
      if (index > this.limit) break;
    
      const currentLayer : RenderLayer = { extrusion: [], travel: [], z: state.z };
      const l = this.layers[index];
      for (const cmd of l.commands) {
        if (cmd.gcode == 'g0' || cmd.gcode == 'g1') {
          const g = (cmd as MoveCommand);
          
          const next : State = {
            x: g.params.x !== undefined ? g.params.x : state.x,
            y: g.params.y !== undefined ? g.params.y : state.y,
            z: g.params.z !== undefined ? g.params.z : state.z,
            e: g.params.e !== undefined ? g.params.e : state.e
          };
          const extrude = g.params.e > 0;
          this.addLineSegment(currentLayer, state, next, extrude);
          
          // update state 
          if (g.params.x) state.x = g.params.x;
          if (g.params.y) state.y = g.params.y;
          if (g.params.z) state.z = g.params.z;
          if (g.params.e) state.e = g.params.e;
        }
      }
      
      const color = Math.round(0xff * index/this.layers.length) * 0xff;
      this.addLine( currentLayer.extrusion, color);
      this.addLine( currentLayer.travel, this.travelColor);
    }

    this.group.quaternion.setFromEuler( new THREE.Euler( -Math.PI/2, 0, 0 ) );
    this.group.position.set( - 100, - 20, 100 );
    this.scene.add( this.group );
    this.renderer.render( this.scene, this.camera );
  }

  resize() {
    this.renderer.setSize( this.container.offsetWidth, this.container.offsetHeight );
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
    this.camera.updateProjectionMatrix();
  }

  addLineSegment(layer: RenderLayer, p1: Point, p2: Point, extrude: boolean) {
    const line = extrude ? layer.extrusion : layer.travel;
    line.push( p1.x, p1.y, p1.z );
    line.push( p2.x, p2.y, p2.z );
  }

  addLine(vertices: number[], color: number) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
    
    const material = new THREE.LineBasicMaterial( { color: color } );
    const lineSegments = new THREE.LineSegments( geometry, material );
    this.group.add( lineSegments );
  }
}
