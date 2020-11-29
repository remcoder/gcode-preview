import { Parser, MoveCommand } from './gcode-parser';
import * as THREE from 'three';
import * as OrbitControls from 'three-orbitcontrols';
import { LineMaterial } from './three-line2/LineMaterial';
import { LineGeometry } from './three-line2/LineGeometry';
import { LineSegments2 } from './three-line2/LineSegments2';
import { GridHelper } from './gridHelper';
import { LineBox } from './lineBox';

type RenderLayer = { extrusion: number[]; travel: number[]; z: number };
type Vector3 = { x: number; y: number; z: number };
type Point = Vector3;
type BuildVolume = Vector3;
type State = { x: number; y: number; z: number; e: number }; // feedrate?

type WebGLPreviewOptions = {
  canvas?: HTMLCanvasElement;
  endLayer?: number;
  startLayer?: number;
  targetId?: string;
  // limit?: number;
  topLayerColor?: number;
  lastSegmentColor?: number;
  lineWidth?: number;
  buildVolume?: BuildVolume;
};

export class WebGLPreview {
  parser = new Parser();
  // limit?: number;
  targetId: string;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  group: THREE.Group;
  backgroundColor = 0xe0e0e0;
  travelColor = 0x990000;
  extrusionColor = 0x00ff00;
  topLayerColor?: number;
  lastSegmentColor?: number;
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  renderExtrusion = true;
  renderTravel = false;
  lineWidth?: number;
  startLayer?: number;
  endLayer?: number;
  singleLayerMode: boolean = false;
  buildVolume: BuildVolume;

  constructor(opts: WebGLPreviewOptions) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.backgroundColor);
    this.canvas = opts.canvas;
    this.targetId = opts.targetId;
    // this.endLayer = opts.limit;
    this.endLayer = opts.endLayer;
    this.startLayer = opts.startLayer;
    this.topLayerColor = opts.topLayerColor;
    this.lastSegmentColor = opts.lastSegmentColor;
    this.lineWidth = opts.lineWidth;
    this.buildVolume = opts.buildVolume;

    console.debug('opts', opts);

    if (!this.canvas && !this.targetId) {
      throw Error('Set either opts.canvas or opts.targetId');
    }

    if (!this.canvas) {
      const container = document.getElementById(this.targetId);
      if (!container)
        throw new Error('Unable to find element ' + this.targetId);

      this.renderer = new THREE.WebGLRenderer({preserveDrawingBuffer: true});
      this.canvas = this.renderer.domElement;
      
      container.appendChild( this.canvas );
    }
    else {
      this.renderer = new THREE.WebGLRenderer( {
        canvas: this.canvas,
        preserveDrawingBuffer: true
      });
    }

    this.camera = new THREE.PerspectiveCamera( 25, this.canvas.offsetWidth/this.canvas.offsetHeight, 10, 5000 );
    this.camera.position.set( 0, 0, 50 );
    const fogFar = (this.camera as THREE.PerspectiveCamera).far;
    const fogNear = fogFar * 0.8;
    this.scene.fog = new THREE.Fog( this.scene.background, fogNear, fogFar);

    this.resize();

    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.animate();
  }

  get layers() {
    return this.parser.layers;
  }

  // convert from 1-based to 0-based
  get maxLayerIndex() {
    return (this.endLayer ?? this.layers.length) -1;
  }

  // convert from 1-based to 0-based
  get minLayerIndex() {
    return this.singleLayerMode ? this.maxLayerIndex : (this.startLayer ?? 0) - 1;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  processGCode(gcode: string | string[]) {
    this.parser.parseGcode(gcode);
    this.render();
  }

  render() {
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    
    // for debugging 
    // const axesHelper = new THREE.AxesHelper( 100 );
    // this.scene.add( axesHelper );

    if (this.buildVolume) {
      this.drawBuildVolume();
    }

    this.group = new THREE.Group();
    this.group.name = 'gcode';
    const state = { x: 0, y: 0, z: 0, e: 0 };

    for (let index = 0; index < this.layers.length; index++) {
      if (index > this.maxLayerIndex) break;

      const currentLayer: RenderLayer = {
        extrusion: [],
        travel: [],
        z: state.z
      };
      const l = this.layers[index];
      for (const cmd of l.commands) {
        if (cmd.gcode == 'g0' || cmd.gcode == 'g1') {
          const g = cmd as MoveCommand;

          const next: State = {
            x: g.params.x !== undefined ? g.params.x : state.x,
            y: g.params.y !== undefined ? g.params.y : state.y,
            z: g.params.z !== undefined ? g.params.z : state.z,
            e: g.params.e !== undefined ? g.params.e : state.e
          };
          
          if (index >= this.minLayerIndex) {
            const extrude = g.params.e > 0;
            if (
              (extrude && this.renderExtrusion) ||
              (!extrude && this.renderTravel)
            ) {
              this.addLineSegment(currentLayer, state, next, extrude);
            }
          }

          // update state
          if (g.params.x) state.x = g.params.x;
          if (g.params.y) state.y = g.params.y;
          if (g.params.z) state.z = g.params.z;
          if (g.params.e) state.e = g.params.e;
        }
      }

      if (this.renderExtrusion) {
        const brightness = Math.round((80 * index) / this.layers.length);
        const extrusionColor = new THREE.Color(
          `hsl(0, 0%, ${brightness}%)`
        ).getHex();

        if (index == this.layers.length - 1) {
          const layerColor = this.topLayerColor ?? extrusionColor;
          const lastSegmentColor = this.lastSegmentColor ?? layerColor;

          const endPoint = currentLayer.extrusion.splice(-3);
          this.addLine(currentLayer.extrusion, layerColor);
          const preendPoint = currentLayer.extrusion.splice(-3);
          this.addLine([...preendPoint, ...endPoint], lastSegmentColor);
        } else {
          this.addLine(currentLayer.extrusion, extrusionColor);
        }
      }

      if (this.renderTravel) {
        this.addLine(currentLayer.travel, this.travelColor);
      }
    }

    this.group.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    
    if (this.buildVolume) {
      this.group.position.set(-this.buildVolume.x/2, 0, this.buildVolume.y/2);
    }
    else {
      // FIXME: this is just a very crude approximation for centering
      this.group.position.set(-100, 0, 100);
    }
    
    this.scene.add(this.group);
    this.renderer.render(this.scene, this.camera);
  }

  drawBuildVolume() {
    this.scene.add( new GridHelper( this.buildVolume.x, 10, this.buildVolume.y, 10 ));
  
    const geometryBox = LineBox(
      this.buildVolume.x, 
      this.buildVolume.z, 
      this.buildVolume.y,
      0x888888);

    geometryBox.position.setY(this.buildVolume.z/2);
    this.scene.add( geometryBox );
  }

  clear() {
    this.startLayer = 1;
    this.endLayer = Infinity;
    this.singleLayerMode = false;
    this.parser = new Parser();
  }

  resize() {
    const [w, h] = [this.canvas.offsetWidth, this.canvas.offsetHeight];
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(w, h, false);
  }

  addLineSegment(layer: RenderLayer, p1: Point, p2: Point, extrude: boolean) {
    const line = extrude ? layer.extrusion : layer.travel;
    line.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
  }

  addLine(vertices: number[], color: number) {
    if (typeof this.lineWidth == 'number' && this.lineWidth > 0) {
      this.addThickLine(vertices, color);
      return;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    const material = new THREE.LineBasicMaterial({ color: color });
    const lineSegments = new THREE.LineSegments(geometry, material);
    this.group.add(lineSegments);
  }

  addThickLine(vertices: number[], color: number) {
    if (!vertices.length) return;

    const geometry = new LineGeometry();
    
    const matLine = new LineMaterial({
      color: color,
      linewidth: this.lineWidth / (1000 * window.devicePixelRatio)
    });
    
    geometry.setPositions(vertices);
    const line = new LineSegments2(geometry, matLine);
    
    this.group.add(line);
  }
}
