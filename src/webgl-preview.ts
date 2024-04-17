import { Parser, MoveCommand, Layer, SelectToolCommand } from './gcode-parser';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2';
import { GridHelper } from './gridHelper';
import { LineBox } from './lineBox';
import {
  AmbientLight,
  AxesHelper,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ColorRepresentation,
  Euler,
  Float32BufferAttribute,
  Fog,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  PointLight,
  REVISION,
  Scene,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
  WireframeGeometry
} from 'three';

type RenderLayer = { extrusion: number[]; travel: number[]; z: number };
type GVector3 = {
  x: number;
  y: number;
  z: number;
};
type Arc = GVector3 & { r: number; i: number; j: number };

type Point = GVector3;
type BuildVolume = GVector3;
export class State {
  x: number;
  y: number;
  z: number;
  r: number;
  e: number;
  i: number;
  j: number;
  t: number; // tool index
  // feedrate?
  static get initial(): State {
    const state = new State();
    Object.assign(state, { x: 0, y: 0, z: 0, r: 0, e: 0, i: 0, j: 0, t: 0 });
    return state;
  }
}

export type GCodePreviewOptions = {
  allowDragNDrop?: boolean;
  buildVolume?: BuildVolume;
  backgroundColor?: ColorRepresentation;
  canvas?: HTMLCanvasElement;
  debug?: boolean;
  endLayer?: number;
  extrusionColor?: ColorRepresentation | ColorRepresentation[];
  initialCameraPosition?: number[];
  lastSegmentColor?: ColorRepresentation;
  lineWidth?: number;
  nonTravelMoves?: string[];
  minLayerThreshold?: number;
  renderExtrusion?: boolean;
  renderTravel?: boolean;
  renderTubes?: boolean;
  startLayer?: number;
  targetId?: string;
  topLayerColor?: ColorRepresentation;
  travelColor?: ColorRepresentation;
  toolColors?: Record<number, ColorRepresentation>;
  disableGradient?: boolean;
};

const target = {
  h: 0,
  s: 0,
  l: 0
};

export class WebGLPreview {
  minLayerThreshold = 0.05;
  parser: Parser;
  targetId?: string; // deprecated
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls;
  container?: HTMLElement;
  canvas: HTMLCanvasElement;
  renderExtrusion = true;
  renderTravel = false;
  renderTubes = false;
  lineWidth?: number;
  startLayer?: number;
  endLayer?: number;
  singleLayerMode = false;
  buildVolume?: BuildVolume;
  initialCameraPosition = [-100, 400, 450];
  debug = false; // deprecated
  allowDragNDrop = false; // deprecated
  inches = false;
  nonTravelmoves: string[] = [];
  disableGradient = false;

  // gcode processing state
  private state: State = State.initial;
  private prevState: State;
  private prevLayerIndex?: number = undefined;
  private beyondFirstMove = false;

  // rendering
  private group?: Group;
  private disposables: { dispose(): void }[] = [];
  static readonly defaultExtrusionColor = new Color('hotpink');
  private _extrusionColor: Color | Color[] = WebGLPreview.defaultExtrusionColor;
  private animationFrameId?: number;

  // colors
  private _backgroundColor = new Color(0xe0e0e0);
  private _travelColor = new Color(0x990000);
  private _topLayerColor?: Color;
  private _lastSegmentColor?: Color;
  private _toolColors: Record<number, Color> = {};

  constructor(opts: GCodePreviewOptions) {
    this.minLayerThreshold = opts.minLayerThreshold ?? this.minLayerThreshold;
    this.parser = new Parser(this.minLayerThreshold);
    this.scene = new Scene();
    this.scene.background = this._backgroundColor;
    if (opts.backgroundColor !== undefined) {
      this.backgroundColor = new Color(opts.backgroundColor);
    }
    this.targetId = opts.targetId;
    this.endLayer = opts.endLayer;
    this.startLayer = opts.startLayer;
    this.lineWidth = opts.lineWidth;
    this.buildVolume = opts.buildVolume;
    this.initialCameraPosition = opts.initialCameraPosition ?? this.initialCameraPosition;
    this.debug = opts.debug ?? this.debug;
    this.allowDragNDrop = opts.allowDragNDrop ?? this.allowDragNDrop;
    this.renderExtrusion = opts.renderExtrusion ?? this.renderExtrusion;
    this.renderTravel = opts.renderTravel ?? this.renderTravel;
    this.nonTravelmoves = opts.nonTravelMoves ?? this.nonTravelmoves;
    this.renderTubes = opts.renderTubes ?? this.renderTubes;

    if (opts.extrusionColor !== undefined) {
      this.extrusionColor = opts.extrusionColor;
    }
    if (opts.travelColor !== undefined) {
      this.travelColor = new Color(opts.travelColor);
    }
    if (opts.topLayerColor !== undefined) {
      this.topLayerColor = new Color(opts.topLayerColor);
    }
    if (opts.lastSegmentColor !== undefined) {
      this.lastSegmentColor = new Color(opts.lastSegmentColor);
    }
    if (opts.toolColors) {
      this._toolColors = {};
      for (const [key, value] of Object.entries(opts.toolColors)) {
        this._toolColors[parseInt(key)] = new Color(value);
      }
    }

    if (opts.disableGradient !== undefined) {
      this.disableGradient = opts.disableGradient;
    }

    console.info('Using THREE r' + REVISION);
    console.debug('opts', opts);

    if (this.targetId) {
      console.warn('`targetId` is deprecated and will removed in the future. Use `canvas` instead.');
    }

    if (!opts.canvas) {
      if (!this.targetId) {
        throw Error('Set either opts.canvas or opts.targetId');
      }
      const container = document.getElementById(this.targetId);
      if (!container) throw new Error('Unable to find element ' + this.targetId);

      this.renderer = new WebGLRenderer({ preserveDrawingBuffer: true });
      this.canvas = this.renderer.domElement;

      container.appendChild(this.canvas);
    } else {
      this.canvas = opts.canvas;
      this.renderer = new WebGLRenderer({
        canvas: this.canvas,
        preserveDrawingBuffer: true
      });
    }

    this.camera = new PerspectiveCamera(25, this.canvas.offsetWidth / this.canvas.offsetHeight, 2, 5000);
    this.camera.position.fromArray(this.initialCameraPosition);
    const fogFar = (this.camera as PerspectiveCamera).far;
    const fogNear = fogFar * 0.8;
    this.scene.fog = new Fog(this._backgroundColor, fogNear, fogFar);

    this.resize();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.initScene();
    this.animate();

    if (this.allowDragNDrop) this._enableDropHandler();
  }

  get extrusionColor(): Color | Color[] {
    return this._extrusionColor;
  }
  set extrusionColor(value: number | string | Color | ColorRepresentation[]) {
    if (Array.isArray(value)) {
      this._extrusionColor = [];
      // loop over the object and convert all colors to Color
      for (const [index, color] of value.entries()) {
        this._extrusionColor[index] = new Color(color);
      }
      return;
    }
    this._extrusionColor = new Color(value);
  }

  // get tool color based on current state
  get currentToolColor(): Color {
    if (this._extrusionColor === undefined) {
      return WebGLPreview.defaultExtrusionColor;
    }
    if (this._extrusionColor instanceof Color) {
      return this._extrusionColor;
    }

    return this._extrusionColor[this.state.t] ?? WebGLPreview.defaultExtrusionColor;
  }

  get backgroundColor(): Color {
    return this._backgroundColor;
  }

  set backgroundColor(value: number | string | Color) {
    this._backgroundColor = new Color(value);
    this.scene.background = this._backgroundColor;
  }

  get travelColor(): Color {
    return this._travelColor;
  }
  set travelColor(value: number | string | Color) {
    this._travelColor = new Color(value);
  }

  get topLayerColor(): ColorRepresentation | undefined {
    return this._topLayerColor;
  }
  set topLayerColor(value: ColorRepresentation | undefined) {
    this._topLayerColor = value !== undefined ? new Color(value) : undefined;
  }

  get lastSegmentColor(): ColorRepresentation | undefined {
    return this._lastSegmentColor;
  }
  set lastSegmentColor(value: ColorRepresentation | undefined) {
    this._lastSegmentColor = value !== undefined ? new Color(value) : undefined;
  }

  get layers(): Layer[] {
    return [this.parser.preamble].concat(this.parser.layers.concat());
  }

  // convert from 1-based to 0-based
  get maxLayerIndex(): number {
    return (this.endLayer ?? this.layers.length) - 1;
  }

  // convert from 1-based to 0-based
  get minLayerIndex(): number {
    return this.singleLayerMode ? this.maxLayerIndex : (this.startLayer ?? 0) - 1;
  }

  animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  processGCode(gcode: string | string[]): void {
    this.parser.parseGCode(gcode);
    this.render();
  }

  initScene() {
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    while (this.disposables.length > 0) {
      const disposable = this.disposables.pop();
      if (disposable) disposable.dispose();
    }

    if (this.debug && this.buildVolume) {
      // show webgl axes
      const axesHelper = new AxesHelper(Math.max(this.buildVolume.x / 2, this.buildVolume.y / 2) + 20);
      this.scene.add(axesHelper);
    }

    if (this.buildVolume) {
      this.drawBuildVolume();
    }

    if (this.renderTubes) {
      console.warn('Volumetric rendering is experimental. It may not work as expected or change in the future.');
      const light = new AmbientLight(0xcccccc, 0.3 * Math.PI);
      // threejs assumes meters but we use mm. So we need to scale the decay of the light
      const dLight = new PointLight(0xffffff, Math.PI, undefined, 1 / 1000);
      dLight.position.set(0, 500, 500);
      this.scene.add(light);
      this.scene.add(dLight);
    }
  }

  createGroup(name: string): Group {
    const group = new Group();
    group.name = name;
    group.quaternion.setFromEuler(new Euler(-Math.PI / 2, 0, 0));
    if (this.buildVolume) {
      group.position.set(-this.buildVolume.x / 2, 0, this.buildVolume.y / 2);
    } else {
      // FIXME: this is just a very crude approximation for centering
      group.position.set(-100, 0, 100);
    }
    return group;
  }

  renderIncremental(): void {
    // console.log('removing layer', this.prevLayerIndex);
    this.scene.remove(this.group);
    this.state = this.prevState ?? State.initial;

    for (let index = this.prevLayerIndex ?? 0; index < this.layers.length; index++) {
      this.group = this.createGroup('layer' + index);
      // console.log('rendering layer', index);

      this.prevState = { ...this.state };
      this.renderLayer(index);

      this.scene.add(this.group);
    }

    this.renderer.render(this.scene, this.camera);

    this.prevLayerIndex = this.layers.length - 1;
  }

  render(): void {
    console.log('rendering all layers');
    this.group = this.createGroup('allLayers');
    this.state = State.initial;
    this.initScene();

    while (this.disposables.length > 0) {
      const disposable = this.disposables.pop();
      if (disposable) disposable.dispose();
    }

    for (let index = 0; index < this.layers.length; index++) {
      this.renderLayer(index);
    }

    this.group.quaternion.setFromEuler(new Euler(-Math.PI / 2, 0, 0));

    if (this.buildVolume) {
      this.group.position.set(-this.buildVolume.x / 2, 0, this.buildVolume.y / 2);
    } else {
      // FIXME: this is just a very crude approximation for centering
      this.group.position.set(-100, 0, 100);
    }

    this.scene.add(this.group);
    this.renderer.render(this.scene, this.camera);
  }

  renderLayer(index: number): void {
    if (index > this.maxLayerIndex) return;

    const currentLayer: RenderLayer = {
      extrusion: [],
      travel: [],
      z: this.state.z
    };
    const l = this.layers[index];
    for (const cmd of l.commands) {
      if (cmd.gcode == 'g20') {
        this.setInches();
        continue;
      }

      if (cmd.gcode.startsWith('t')) {
        // flush render queue
        this.doRenderExtrusion(currentLayer, index);
        currentLayer.extrusion = [];

        const tool = cmd as SelectToolCommand;
        this.state.t = tool.toolIndex;
        continue;
      }

      if (['g0', 'g00', 'g1', 'g01', 'g2', 'g02', 'g3', 'g03'].indexOf(cmd.gcode) > -1) {
        const g = cmd as MoveCommand;
        const next: State = {
          x: g.params.x ?? this.state.x,
          y: g.params.y ?? this.state.y,
          z: g.params.z ?? this.state.z,
          r: g.params.r ?? this.state.r,
          e: g.params.e ?? this.state.e,
          i: g.params.i ?? this.state.i,
          j: g.params.j ?? this.state.j,
          t: this.state.t
        };

        if (index >= this.minLayerIndex) {
          const extrude = (g.params.e ?? 0) > 0 || this.nonTravelmoves.indexOf(cmd.gcode) > -1;
          const moving = next.x != this.state.x || next.y != this.state.y || next.z != this.state.z;
          if (moving) {
            if ((extrude && this.renderExtrusion) || (!extrude && this.renderTravel)) {
              if (cmd.gcode == 'g2' || cmd.gcode == 'g3' || cmd.gcode == 'g02' || cmd.gcode == 'g03') {
                this.addArcSegment(currentLayer, this.state, next, extrude, cmd.gcode == 'g2' || cmd.gcode == 'g02');
              } else {
                this.addLineSegment(currentLayer, this.state, next, extrude);
              }
            }
          }
        }

        // update this.state
        this.state.x = next.x;
        this.state.y = next.y;
        this.state.z = next.z;
        // if (next.e) state.e = next.e; // where not really tracking e as distance (yet) but we only check if some commands are extruding (positive e)
        if (!this.beyondFirstMove) this.beyondFirstMove = true;
      }
    }

    if (currentLayer.extrusion.length || currentLayer.travel.length) this.doRenderExtrusion(currentLayer, index);
  }

  doRenderExtrusion(layer: RenderLayer, index: number): void {
    console.log('doRenderExtrusion', index, layer);
    if (this.renderExtrusion) {
      let extrusionColor = this.currentToolColor;

      if (!this.singleLayerMode && !this.renderTubes && !this.disableGradient) {
        const brightness = 0.1 + (0.7 * index) / this.layers.length;

        extrusionColor.getHSL(target);
        extrusionColor = new Color().setHSL(target.h, target.s, brightness);
      }

      if (index == this.layers.length - 1 && this._topLayerColor) {
        const layerColor = this._topLayerColor ?? extrusionColor;
        const lastSegmentColor = this._lastSegmentColor ?? layerColor;

        const endPoint = layer.extrusion.splice(-3);
        const preendPoint = layer.extrusion.splice(-3);
        if (this.renderTubes) {
          this.addTubeLine(layer.extrusion, layerColor.getHex());
          this.addTubeLine([...preendPoint, ...endPoint], lastSegmentColor.getHex());
        } else {
          this.addLine(layer.extrusion, layerColor.getHex());
          this.addLine([...preendPoint, ...endPoint], lastSegmentColor.getHex());
        }
      } else {
        if (this.renderTubes) {
          this.addTubeLine(layer.extrusion, extrusionColor.getHex());
        } else {
          this.addLine(layer.extrusion, extrusionColor.getHex());
        }
      }
    }

    if (this.renderTravel) {
      this.addLine(layer.travel, this._travelColor.getHex());
    }
  }

  setInches(): void {
    if (this.beyondFirstMove) {
      console.warn('Switching units after movement is already made is discouraged and is not supported.');
      return;
    }
    this.inches = true;
  }

  drawBuildVolume(): void {
    if (!this.buildVolume) return;

    this.scene.add(new GridHelper(this.buildVolume.x, 10, this.buildVolume.y, 10));

    const geometryBox = LineBox(this.buildVolume.x, this.buildVolume.z, this.buildVolume.y, 0x888888);

    geometryBox.position.setY(this.buildVolume.z / 2);
    this.scene.add(geometryBox);
  }

  clear(): void {
    this.startLayer = 1;
    this.endLayer = Infinity;
    this.singleLayerMode = false;
    this.parser = new Parser(this.minLayerThreshold);
    this.beyondFirstMove = false;
    this.state = State.initial;
    this.prevState = undefined;
  }

  resize(): void {
    const [w, h] = [this.canvas.offsetWidth, this.canvas.offsetHeight];
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(w, h, false);
  }

  addLineSegment(layer: RenderLayer, p1: Point, p2: Point, extrude: boolean): void {
    const line = extrude ? layer.extrusion : layer.travel;
    line.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
  }

  addArcSegment(layer: RenderLayer, p1: Point, p2: Arc, extrude: boolean, cw: boolean): void {
    const line = extrude ? layer.extrusion : layer.travel;

    const currX = p1.x,
      currY = p1.y,
      currZ = p1.z,
      x = p2.x,
      y = p2.y,
      z = p2.z;
    let r = p2.r;

    let i = p2.i,
      j = p2.j;

    if (r) {
      // in r mode a minimum radius will be applied if the distance can otherwise not be bridged
      const deltaX = x - currX; // assume abs mode
      const deltaY = y - currY;

      // apply a minimal radius to bridge the distance
      const minR = Math.sqrt(Math.pow(deltaX / 2, 2) + Math.pow(deltaY / 2, 2));
      r = Math.max(r, minR);

      const dSquared = Math.pow(deltaX, 2) + Math.pow(deltaY, 2);
      const hSquared = Math.pow(r, 2) - dSquared / 4;
      // if (dSquared == 0 || hSquared < 0) {
      //   return { position: { x: x, y: z, z: y }, points: [] }; //we'll abort the render and move te position to the new position.
      // }
      let hDivD = Math.sqrt(hSquared / dSquared);

      // Ref RRF DoArcMove for details
      if ((cw && r < 0.0) || (!cw && r > 0.0)) {
        hDivD = -hDivD;
      }
      i = deltaX / 2 + deltaY * hDivD;
      j = deltaY / 2 - deltaX * hDivD;
      // } else {
      //     //the radial point is an offset from the current position
      //     ///Need at least on point
      //     if (i == 0 && j == 0) {
      //         return { position: { x: x, y: y, z: z }, points: [] }; //we'll abort the render and move te position to the new position.
      //     }
    }

    const wholeCircle = currX == x && currY == y;
    const centerX = currX + i;
    const centerY = currY + j;

    const arcRadius = Math.sqrt(i * i + j * j);
    const arcCurrentAngle = Math.atan2(-j, -i);
    const finalTheta = Math.atan2(y - centerY, x - centerX);

    let totalArc;
    if (wholeCircle) {
      totalArc = 2 * Math.PI;
    } else {
      totalArc = cw ? arcCurrentAngle - finalTheta : finalTheta - arcCurrentAngle;
      if (totalArc < 0.0) {
        totalArc += 2 * Math.PI;
      }
    }
    let totalSegments = (arcRadius * totalArc) / 1.8;
    if (this.inches) {
      totalSegments *= 25;
    }
    if (totalSegments < 1) {
      totalSegments = 1;
    }
    let arcAngleIncrement = totalArc / totalSegments;
    arcAngleIncrement *= cw ? -1 : 1;

    const points = [];

    points.push({ x: currX, y: currY, z: currZ });

    const zDist = currZ - z;
    const zStep = zDist / totalSegments;

    // get points for the arc
    let px = currX;
    let py = currY;
    let pz = currZ;
    // calculate segments
    let currentAngle = arcCurrentAngle;

    for (let moveIdx = 0; moveIdx < totalSegments - 1; moveIdx++) {
      currentAngle += arcAngleIncrement;
      px = centerX + arcRadius * Math.cos(currentAngle);
      py = centerY + arcRadius * Math.sin(currentAngle);
      pz += zStep;
      points.push({ x: px, y: py, z: pz });
    }

    points.push({ x: p2.x, y: p2.y, z: p2.z });

    for (let idx = 0; idx < points.length - 1; idx++) {
      line.push(points[idx].x, points[idx].y, points[idx].z, points[idx + 1].x, points[idx + 1].y, points[idx + 1].z);
    }
  }

  addLine(vertices: number[], color: number): void {
    console.log('addLine', vertices.length, vertices);
    if (typeof this.lineWidth === 'number' && this.lineWidth > 0) {
      this.addThickLine(vertices, color);
      return;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.disposables.push(geometry);
    const material = new LineBasicMaterial({ color: color });
    this.disposables.push(material);
    const lineSegments = new LineSegments(geometry, material);

    this.group?.add(lineSegments);
  }

  addTubeLine(vertices: number[], color: number): void {
    let curvePoints: Vector3[] = [];
    const curves: CatmullRomCurve3[] = [];
    console.log('addTubeLine', vertices.length, vertices);
    // Merging into one curve for performance
    for (let i = 0; i < vertices.length; i += 6) {
      const v = vertices.slice(i, i + 6);
      const startPoint = new Vector3(v[0], v[1], v[2]);
      const endPoint = new Vector3(v[3], v[4], v[5]);

      if (curvePoints.length === 0) {
        curvePoints.push(startPoint);
      }

      if (!curvePoints[curvePoints.length - 1].equals(startPoint)) {
        curves.push(new CatmullRomCurve3(curvePoints, false, 'catmullrom', 0));
        curvePoints = [];
        curvePoints.push(startPoint);
      }

      curvePoints.push(endPoint);
    }

    if (curvePoints.length > 1) {
      curves.push(new CatmullRomCurve3(curvePoints, false, 'catmullrom', 0));
    }

    console.log('# curves', curves.length);
    curves.forEach((curve) => {
      const material = new MeshLambertMaterial({ color: color });
      this.disposables.push(material);
      const segments = Math.ceil(curve.getLength() * 2);
      console.log(' # segments', segments);
      const geometry = new TubeGeometry(curve, segments, 0.3, 4, false);
      this.disposables.push(geometry);
      // const lineSegments = new Mesh(geometry, material);

      const wireframe = new WireframeGeometry(geometry);

      const line = new LineSegments(wireframe);
      // line.material.depthTest = false;
      // line.material.opacity = 0.25;
      // line.material.transparent = true;

      this.group?.add(line);

      // this.group?.add(lineSegments);
    });
  }

  addThickLine(vertices: number[], color: number): void {
    if (!vertices.length || !this.lineWidth) return;

    const geometry = new LineSegmentsGeometry();
    this.disposables.push(geometry);

    const matLine = new LineMaterial({
      color: color,
      linewidth: this.lineWidth / (1000 * window.devicePixelRatio)
    });
    this.disposables.push(matLine);

    geometry.setPositions(vertices);
    const line = new LineSegments2(geometry, matLine);

    this.group?.add(line);
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.controls.dispose();
    this.renderer.dispose();

    this.cancelAnimation();
  }

  private cancelAnimation(): void {
    if (this.animationFrameId !== undefined) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = undefined;
  }

  private _enableDropHandler() {
    console.warn('Drag and drop is deprecated as a library feature. See the demo how to implement your own.');
    this.canvas.addEventListener('dragover', (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      if (evt.dataTransfer) evt.dataTransfer.dropEffect = 'copy';
      this.canvas.classList.add('dragging');
    });

    this.canvas.addEventListener('dragleave', (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      this.canvas.classList.remove('dragging');
    });

    this.canvas.addEventListener('drop', async (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      this.canvas.classList.remove('dragging');
      const files: FileList | [] = evt.dataTransfer?.files ?? [];
      const file = files[0];

      this.clear();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this._readFromStream(file.stream() as unknown as ReadableStream<any>);
      this.render();
    });
  }

  async _readFromStream(stream: ReadableStream): Promise<void> {
    const reader = stream.getReader();
    let result;
    let tail = '';
    let size = 0;
    do {
      console.debug('reading from stream');
      result = await reader.read();
      size += result.value?.length ?? 0;
      const str = decode(result.value);
      const idxNewLine = str.lastIndexOf('\n');
      const maxFullLine = str.slice(0, idxNewLine);

      // parse increments but don't render yet
      this.parser.parseGCode(tail + maxFullLine);
      tail = str.slice(idxNewLine);
    } while (!result.done);
    console.debug('read from stream', size);
  }
}

function decode(uint8array: Uint8Array) {
  return new TextDecoder('utf-8').decode(uint8array);
}
