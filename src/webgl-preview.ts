import { Parser, MoveCommand, Layer } from './gcode-parser';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2';
import { GridHelper } from './gridHelper';
import { LineBox } from './lineBox';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Group,
  Color,
  REVISION,
  Fog,
  AxesHelper,
  Euler,
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
} from 'three';

type RenderLayer = { extrusion: number[]; travel: number[]; z: number };
type Vector3 = {
  x: number;
  y: number;
  z: number;
  r: number;
  i: number;
  j: number;
};
type Point = Vector3;
type BuildVolume = Vector3;
type State = {
  x: number;
  y: number;
  z: number;
  r: number;
  e: number;
  i: number;
  j: number;
}; // feedrate?

export type GCodePreviewOptions = {
  canvas?: HTMLCanvasElement;
  endLayer?: number;
  startLayer?: number;
  targetId?: string;
  // limit?: number;
  topLayerColor?: number;
  lastSegmentColor?: number;
  lineWidth?: number;
  buildVolume?: BuildVolume;
  initialCameraPosition?: number[];
  debug?: boolean;
  allowDragNDrop?: boolean;
  nonTravelMoves?: string[];
};

export class WebGLPreview {
  parser = new Parser();
  // limit?: number;
  targetId: string;
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  group: Group;
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
  singleLayerMode = false;
  buildVolume: BuildVolume;
  initialCameraPosition = [-100, 400, 450];
  debug = false;
  allowDragNDrop = false;
  controls: OrbitControls;
  beyondFirstMove = false;
  inches = false;
  nonTravelmoves: string[] = [];
  private disposables: { dispose(): void }[] = [];

  constructor(opts: GCodePreviewOptions) {
    this.scene = new Scene();
    this.scene.background = new Color(this.backgroundColor);
    this.canvas = opts.canvas;
    this.targetId = opts.targetId;
    // this.endLayer = opts.limit;
    this.endLayer = opts.endLayer;
    this.startLayer = opts.startLayer;
    this.topLayerColor = opts.topLayerColor;
    this.lastSegmentColor = opts.lastSegmentColor;
    this.lineWidth = opts.lineWidth;
    this.buildVolume = opts.buildVolume;
    this.initialCameraPosition =
      opts.initialCameraPosition ?? this.initialCameraPosition;
    this.debug = opts.debug ?? this.debug;
    this.allowDragNDrop = opts.allowDragNDrop ?? this.allowDragNDrop;
    this.nonTravelmoves = opts.nonTravelMoves ?? this.nonTravelmoves;

    console.info('Using THREE r' + REVISION);
    console.debug('opts', opts);

    if (this.targetId) {
      console.warn(
        '`targetId` is deprecated and will removed in the future. Use `canvas` instead.'
      );
    }

    if (!this.canvas && !this.targetId) {
      throw Error('Set either opts.canvas or opts.targetId');
    }

    if (!this.canvas) {
      const container = document.getElementById(this.targetId);
      if (!container)
        throw new Error('Unable to find element ' + this.targetId);

      this.renderer = new WebGLRenderer({ preserveDrawingBuffer: true });
      this.canvas = this.renderer.domElement;

      container.appendChild(this.canvas);
    } else {
      this.renderer = new WebGLRenderer({
        canvas: this.canvas,
        preserveDrawingBuffer: true,
      });
    }

    this.camera = new PerspectiveCamera(
      25,
      this.canvas.offsetWidth / this.canvas.offsetHeight,
      10,
      5000
    );
    this.camera.position.fromArray(this.initialCameraPosition);
    const fogFar = (this.camera as PerspectiveCamera).far;
    const fogNear = fogFar * 0.8;
    this.scene.fog = new Fog(this.scene.background, fogNear, fogFar);

    this.resize();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.animate();

    if (this.allowDragNDrop) this._enableDropHandler();
  }

  resetView(): void {
    this.camera.position.fromArray(this.initialCameraPosition);
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
    return this.singleLayerMode
      ? this.maxLayerIndex
      : (this.startLayer ?? 0) - 1;
  }

  animate(): void {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  processGCode(gcode: string | string[]): void {
    this.parser.parseGCode(gcode);
    this.render();
  }

  render(): void {
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    while (this.disposables.length > 0) {
      this.disposables.pop().dispose();
    }

    if (this.debug) {
      // show webgl axes
      const axesHelper = new AxesHelper(
        Math.max(this.buildVolume.x / 2, this.buildVolume.y / 2) + 20
      );
      this.scene.add(axesHelper);
    }

    if (this.buildVolume) {
      this.drawBuildVolume();
    }

    this.group = new Group();
    this.group.name = 'gcode';
    const state = { x: 0, y: 0, z: 0, r: 0, e: 0, i: 0, j: 0 };

    for (let index = 0; index < this.layers.length; index++) {
      if (index > this.maxLayerIndex) break;

      const currentLayer: RenderLayer = {
        extrusion: [],
        travel: [],
        z: state.z,
      };
      const l = this.layers[index];
      for (const cmd of l.commands) {
        if (cmd.gcode == 'g20') {
          this.setInches();
        } else if (
          ['g0', 'g00', 'g1', 'g01', 'g2', 'g02', 'g3', 'g03'].indexOf(
            cmd.gcode
          ) > -1
        ) {
          const g = cmd as MoveCommand;
          const next: State = {
            x: g.params.x ?? state.x,
            y: g.params.y ?? state.y,
            z: g.params.z ?? state.z,
            r: g.params.r ?? state.r,
            e: g.params.e ?? state.e,
            i: g.params.i ?? state.i,
            j: g.params.j ?? state.j,
          };

          if (index >= this.minLayerIndex) {
            const extrude =
              g.params.e > 0 || this.nonTravelmoves.indexOf(cmd.gcode) > -1;
            if (
              (extrude && this.renderExtrusion) ||
              (!extrude && this.renderTravel)
            ) {
              if (
                cmd.gcode == 'g2' ||
                cmd.gcode == 'g3' ||
                cmd.gcode == 'g02' ||
                cmd.gcode == 'g03'
              ) {
                this.addArcSegment(
                  currentLayer,
                  state,
                  next,
                  extrude,
                  cmd.gcode == 'g2' || cmd.gcode == 'g02'
                );
              } else {
                this.addLineSegment(currentLayer, state, next, extrude);
              }
            }
          }

          // update state
          if (next.x) state.x = next.x;
          if (next.y) state.y = next.y;
          if (next.z) state.z = next.z;
          // if (next.e) state.e = next.e; // where not really tracking e as distance (yet) but we only check if some commands are extruding (positive e)
          if (!this.beyondFirstMove) this.beyondFirstMove = true;
        }
      }

      if (this.renderExtrusion) {
        const brightness = Math.round((80 * index) / this.layers.length);
        const extrusionColor = new Color(`hsl(0, 0%, ${brightness}%)`).getHex();

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

    this.group.quaternion.setFromEuler(new Euler(-Math.PI / 2, 0, 0));

    if (this.buildVolume) {
      this.group.position.set(
        -this.buildVolume.x / 2,
        0,
        this.buildVolume.y / 2
      );
    } else {
      // FIXME: this is just a very crude approximation for centering
      this.group.position.set(-100, 0, 100);
    }

    this.scene.add(this.group);
    this.renderer.render(this.scene, this.camera);
  }

  setInches(): void {
    if (this.beyondFirstMove) {
      console.warn(
        'Switching units after movement is already made is discouraged and is not supported.'
      );
      return;
    }
    this.inches = true;
    console.log('Units set to inches');
  }

  drawBuildVolume(): void {
    this.scene.add(
      new GridHelper(this.buildVolume.x, 10, this.buildVolume.y, 10)
    );

    const geometryBox = LineBox(
      this.buildVolume.x,
      this.buildVolume.z,
      this.buildVolume.y,
      0x888888
    );

    geometryBox.position.setY(this.buildVolume.z / 2);
    this.scene.add(geometryBox);
  }

  clear(): void {
    this.startLayer = 1;
    this.endLayer = Infinity;
    this.singleLayerMode = false;
    this.parser = new Parser();
    this.beyondFirstMove = false;
  }

  resize(): void {
    const [w, h] = [this.canvas.offsetWidth, this.canvas.offsetHeight];
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(w, h, false);
  }

  addLineSegment(
    layer: RenderLayer,
    p1: Point,
    p2: Point,
    extrude: boolean
  ): void {
    const line = extrude ? layer.extrusion : layer.travel;
    line.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
  }

  addArcSegment(
    layer: RenderLayer,
    p1: Point,
    p2: Point,
    extrude: boolean,
    cw: boolean
  ): void {
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
      totalArc = cw
        ? arcCurrentAngle - finalTheta
        : finalTheta - arcCurrentAngle;
      if (totalArc < 0.0) {
        totalArc += 2 * Math.PI;
      }
    }
    let totalSegments = (arcRadius * totalArc) / 1.8; //arcSegLength + 0.8;
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

    //get points for the arc
    let px = currX;
    let py = currY;
    let pz = currZ;
    //calculate segments
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
      line.push(
        points[idx].x,
        points[idx].y,
        points[idx].z,
        points[idx + 1].x,
        points[idx + 1].y,
        points[idx + 1].z
      );
    }
  }

  addLine(vertices: number[], color: number): void {
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

    this.group.add(lineSegments);
  }

  addThickLine(vertices: number[], color: number): void {
    if (!vertices.length) return;

    const geometry = new LineGeometry();
    this.disposables.push(geometry);

    const matLine = new LineMaterial({
      color: color,
      linewidth: this.lineWidth / (1000 * window.devicePixelRatio),
    });
    this.disposables.push(matLine);

    geometry.setPositions(vertices);
    const line = new LineSegments2(geometry, matLine);

    this.group.add(line);
  }

  // experimental DnD support
  private _enableDropHandler() {
    this.canvas.addEventListener('dragover', (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'copy';
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
      const files = evt.dataTransfer.files;
      const file = files[0];

      this.clear();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this._readFromStream(
        file.stream() as unknown as ReadableStream<any>
      );
      this.render();
    });
  }

  async _readFromStream(stream: ReadableStream): Promise<void> {
    const reader = stream.getReader();
    let result;
    let tail = '';
    let size = 0;
    do {
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
