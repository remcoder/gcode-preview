import { Parser } from './gcode-parser';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

import { BuildVolume } from './build-volume';
import { type Disposable } from './helpers/three-utils';
import Stats from 'three/examples/jsm/libs/stats.module.js';

import { DevGUI, DevModeOptions } from './dev-gui';
import { Interpreter } from './interpreter';
import { Job } from './job';
import { Path } from './path';

import {
  AmbientLight,
  BatchedMesh,
  BufferGeometry,
  Color,
  ColorRepresentation,
  Euler,
  Fog,
  Group,
  Material,
  MeshLambertMaterial,
  PerspectiveCamera,
  Plane,
  PlaneHelper,
  PointLight,
  REVISION,
  Scene,
  Vector3,
  WebGLRenderer
} from 'three';

export type GCodePreviewOptions = {
  buildVolume?: BuildVolume;
  backgroundColor?: ColorRepresentation;
  canvas?: HTMLCanvasElement;
  debug?: boolean;
  endLayer?: number;
  extrusionColor?: ColorRepresentation | ColorRepresentation[];
  initialCameraPosition?: number[];
  lastSegmentColor?: ColorRepresentation;
  lineWidth?: number;
  lineHeight?: number;
  nonTravelMoves?: string[];
  minLayerThreshold?: number;
  renderExtrusion?: boolean;
  renderTravel?: boolean;
  startLayer?: number;
  topLayerColor?: ColorRepresentation;
  travelColor?: ColorRepresentation;
  toolColors?: Record<number, ColorRepresentation>;
  disableGradient?: boolean;
  extrusionWidth?: number;
  renderTubes?: boolean;
  /**
   * @deprecated Please see the demo how to implement drag and drop.
   */
  allowDragNDrop?: boolean;
  /**
   * @deprecated Please use the `canvas` param instead.
   */
  targetId?: string;
  /** @experimental */
  devMode?: boolean | DevModeOptions;
};

export class WebGLPreview {
  minLayerThreshold: number;
  /**
   * @deprecated Please use the `canvas` param instead.
   */
  targetId?: string;
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls;
  canvas: HTMLCanvasElement;
  renderExtrusion = true;
  renderTravel = false;
  renderTubes = false;
  extrusionWidth?: number;
  lineWidth?: number;
  lineHeight?: number;
  _startLayer?: number;
  _endLayer?: number;
  singleLayerMode = false;
  buildVolume?: BuildVolume;
  initialCameraPosition = [-100, 400, 450];
  /**
   * @deprecated Use the dev mode options instead.
   */
  debug = false;
  inches = false;
  nonTravelmoves: string[] = [];
  disableGradient = false;

  private job: Job;
  interpreter = new Interpreter();
  parser = new Parser();

  // rendering
  private group?: Group;
  private disposables: Disposable[] = [];
  static readonly defaultExtrusionColor = new Color('hotpink');
  private _extrusionColor: Color | Color[] = WebGLPreview.defaultExtrusionColor;
  private animationFrameId?: number;
  private renderPathIndex?: number;
  private minPlane = new Plane(new Vector3(0, 1, 0), 0.6);
  private maxPlane = new Plane(new Vector3(0, -1, 0), 0.1);
  planeHelper = new PlaneHelper(this.minPlane, 200, 0xff0000);
  planeHelper2 = new PlaneHelper(this.maxPlane, 200, 0x00ff00);

  // colors
  private _backgroundColor = new Color(0xe0e0e0);
  private _travelColor = new Color(0x990000);
  private _topLayerColor?: Color;
  private _lastSegmentColor?: Color;
  private _toolColors: Record<number, Color> = {};

  // debug
  private devMode?: boolean | DevModeOptions = false;
  private _lastRenderTime = 0;
  private _wireframe = false;
  private stats?: Stats;
  private statsContainer?: HTMLElement;
  private devGui?: DevGUI;

  constructor(opts: GCodePreviewOptions) {
    this.minLayerThreshold = opts.minLayerThreshold ?? this.minLayerThreshold;
    this.job = new Job({ minLayerThreshold: this.minLayerThreshold });
    this.scene = new Scene();
    this.scene.background = this._backgroundColor;
    if (opts.backgroundColor !== undefined) {
      this.backgroundColor = new Color(opts.backgroundColor);
    }
    this.targetId = opts.targetId;
    this.endLayer = opts.endLayer;
    this.startLayer = opts.startLayer;
    this.lineWidth = opts.lineWidth ?? 1;
    this.lineHeight = opts.lineHeight;
    this.buildVolume = opts.buildVolume && new BuildVolume(opts.buildVolume.x, opts.buildVolume.y, opts.buildVolume.z);
    this.initialCameraPosition = opts.initialCameraPosition ?? this.initialCameraPosition;
    this.debug = opts.debug ?? this.debug;
    this.renderExtrusion = opts.renderExtrusion ?? this.renderExtrusion;
    this.renderTravel = opts.renderTravel ?? this.renderTravel;
    this.nonTravelmoves = opts.nonTravelMoves ?? this.nonTravelmoves;
    this.renderTubes = opts.renderTubes ?? this.renderTubes;
    this.extrusionWidth = opts.extrusionWidth;
    this.devMode = opts.devMode ?? this.devMode;
    this.stats = this.devMode ? new Stats() : undefined;

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

    this.renderer.localClippingEnabled = true;
    this.camera = new PerspectiveCamera(25, this.canvas.offsetWidth / this.canvas.offsetHeight, 10, 5000);
    this.camera.position.fromArray(this.initialCameraPosition);
    const fogFar = (this.camera as PerspectiveCamera).far;
    const fogNear = fogFar * 0.8;
    this.scene.fog = new Fog(this._backgroundColor, fogNear, fogFar);

    this.resize();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.initScene();
    this.animate();

    if (opts.allowDragNDrop) this._enableDropHandler();

    this.initStats();
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

  get countLayers(): number {
    return this.job.layers.length;
  }

  get startLayer(): number {
    return this._startLayer;
  }
  set startLayer(value: number) {
    this._startLayer = value;
    if (this.countLayers > 0) {
      if (value <= this.countLayers) {
        const layer = this.job.layers[value - 1];
        // The geometry should be changed to have it's center in the middle line height
        this.minPlane.constant = -this.minPlane.normal.y * layer.z - layer.height * 0.5;
      } else {
        this.minPlane.constant = 0;
      }
    }
  }

  get endLayer(): number {
    return this._endLayer;
  }
  set endLayer(value: number) {
    this._endLayer = value;
    if (this.countLayers > 0) {
      if (value <= this.countLayers) {
        const layer = this.job.layers[value - 1];
        this.maxPlane.constant = -this.maxPlane.normal.y * layer.z + layer.height * 0.5;
      } else {
        this.maxPlane.constant = 0;
      }
    }
  }

  /** @internal */
  animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.stats?.update();
  }

  processGCode(gcode: string | string[]): void {
    const { commands } = this.parser.parseGCode(gcode);
    this.interpreter.execute(commands, this.job);
    this.render();
  }

  private initScene() {
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    while (this.disposables.length > 0) {
      const disposable = this.disposables.pop();
      if (disposable) disposable.dispose();
    }

    if (this.buildVolume) {
      this.disposables.push(this.buildVolume);
      this.scene.add(this.buildVolume.createGroup());
    }

    if (this.renderTubes) {
      const light = new AmbientLight(0xcccccc, 0.3 * Math.PI);
      // threejs assumes meters but we use mm. So we need to scale the decay of the light
      const dLight = new PointLight(0xffffff, Math.PI, undefined, 1 / 1000);
      dLight.position.set(0, 500, 500);
      this.scene.add(light);
      this.scene.add(dLight);
    }
  }

  private createGroup(name: string): Group {
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

  render(): void {
    const startRender = performance.now();
    this.group = this.createGroup('allLayers');
    this.initScene();

    this.renderPaths();

    this.scene.add(this.group);
    this.renderer.render(this.scene, this.camera);
    this._lastRenderTime = performance.now() - startRender;
  }

  // create a new render method to use an animation loop to render the layers incrementally
  /** @experimental */
  async renderAnimated(pathCount = 1): Promise<void> {
    this.initScene();

    this.renderPathIndex = 0;

    return this.renderFrameLoop(pathCount > 0 ? pathCount : 1);
  }

  private renderFrameLoop(pathCount: number): Promise<void> {
    return new Promise((resolve) => {
      const loop = () => {
        if (this.renderPathIndex >= this.job.paths.length - 1) {
          resolve();
        } else {
          this.renderFrame(pathCount);
          requestAnimationFrame(loop);
        }
      };
      loop();
    });
  }

  private renderFrame(pathCount: number): void {
    this.group = this.createGroup('parts' + this.renderPathIndex);
    const endPathNumber = Math.min(this.renderPathIndex + pathCount, this.job.paths.length - 1);
    this.renderPaths(endPathNumber);
    this.renderPathIndex = endPathNumber;
    this.scene.add(this.group);
  }

  // reset parser & processing state
  clear(): void {
    this.resetState();
    this.parser = new Parser();
    this.job = new Job({ minLayerThreshold: this.minLayerThreshold });
  }

  // reset processing state
  private resetState(): void {
    this.startLayer = 1;
    this.endLayer = Infinity;
    this.singleLayerMode = false;
    this.devGui?.reset();
  }

  resize(): void {
    const [w, h] = [this.canvas.offsetWidth, this.canvas.offsetHeight];
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(w, h, false);
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

  private renderPaths(endPathNumber: number = Infinity): void {
    if (this.renderTravel) {
      this.renderPathsAsLines(this.job.travels.slice(this.renderPathIndex, endPathNumber), this._travelColor);
    }

    if (this.renderExtrusion) {
      this.job.toolPaths.forEach((toolPaths, index) => {
        const color = Array.isArray(this._extrusionColor) ? this._extrusionColor[index] : this._extrusionColor;
        if (this.renderTubes) {
          this.renderPathsAsTubes(toolPaths.slice(this.renderPathIndex, endPathNumber), color);
        } else {
          this.renderPathsAsLines(toolPaths.slice(this.renderPathIndex, endPathNumber), color);
        }
      });
    }
  }

  private renderPathsAsLines(paths: Path[], color: Color): void {
    const material = new LineMaterial({
      color: Number(color.getHex()),
      linewidth: this.lineWidth,
      clippingPlanes: [this.maxPlane, this.minPlane]
    });

    const lineVertices: number[] = [];
    paths.forEach((path) => {
      for (let i = 0; i < path.vertices.length - 3; i += 3) {
        lineVertices.push(path.vertices[i], path.vertices[i + 1], path.vertices[i + 2]);
        lineVertices.push(path.vertices[i + 3], path.vertices[i + 4], path.vertices[i + 5]);
      }
    });

    const geometry = new LineSegmentsGeometry().setPositions(lineVertices);
    const line = new LineSegments2(geometry, material);

    this.disposables.push(material);
    this.disposables.push(geometry);
    this.group?.add(line);
  }

  private renderPathsAsTubes(paths: Path[], color: Color): void {
    const colorNumber = Number(color.getHex());
    const geometries: BufferGeometry[] = [];

    const material = new MeshLambertMaterial({
      color: colorNumber,
      wireframe: this._wireframe,
      clippingPlanes: [this.maxPlane, this.minPlane]
    });

    paths.forEach((path) => {
      const geometry = path.geometry({
        extrusionWidthOverride: this.extrusionWidth,
        lineHeightOverride: this.lineHeight
      });
      this.disposables.push(geometry);
      geometries.push(geometry);
    });

    const batchedMesh = this.createBatchMesh(geometries, material);
    this.disposables.push(material);
    this.disposables.push(batchedMesh);

    this.group?.add(batchedMesh);
  }

  private createBatchMesh(geometries: BufferGeometry[], material: Material): BatchedMesh {
    const maxVertexCount = geometries.reduce((acc, geometry) => geometry.attributes.position.count * 3 + acc, 0);

    const batchedMesh = new BatchedMesh(geometries.length, maxVertexCount, undefined, material);
    this.disposables.push(batchedMesh);

    geometries.forEach((geometry) => {
      const geometryId = batchedMesh.addGeometry(geometry);
      batchedMesh.addInstance(geometryId);
    });

    return batchedMesh;
  }

  /** @experimental  */
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

  private initGui() {
    if (typeof this.devMode === 'boolean' && this.devMode === true) {
      this.devGui = new DevGUI(this);
    } else if (typeof this.devMode === 'object') {
      this.devGui = new DevGUI(this, this.devMode);
    }
  }

  private initStats() {
    if (this.stats) {
      if (typeof this.devMode === 'object') {
        this.statsContainer = this.devMode.statsContainer;
      }
      (this.statsContainer ?? document.body).appendChild(this.stats.dom);
      this.stats.dom.classList.add('stats');
      this.initGui();
    }
  }
}

function decode(uint8array: Uint8Array) {
  return new TextDecoder('utf-8').decode(uint8array);
}
