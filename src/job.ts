import { Path, PathType } from './path';

export class State {
  x: number;
  y: number;
  z: number;
  e: number;
  tool: number;
  units: 'mm' | 'in';

  static get initial(): State {
    const state = new State();
    Object.assign(state, { x: 0, y: 0, z: 0, e: 0, tool: 0, units: 'mm' });
    return state;
  }
}

export class Job {
  paths: Path[];
  state: State;

  constructor(state?: State) {
    this.paths = [];
    this.state = state || State.initial;
  }

  isPlanar(): boolean {
    return (
      this.paths.find(
        (path) =>
          path.travelType === PathType.Extrusion && path.vertices.some((_, i, arr) => i % 3 === 2 && arr[i] !== arr[2])
      ) === undefined
    );
  }

  layers(): Path[][] | null {
    if (!this.isPlanar()) {
      return null;
    }

    const layers: Path[][] = [];
    let currentLayer: Path[] = [];

    this.paths.forEach((path) => {
      if (path.travelType === PathType.Extrusion) {
        currentLayer.push(path);
      } else {
        if (path.vertices.some((_, i, arr) => i % 3 === 2 && arr[i] !== arr[2])) {
          layers.push(currentLayer);
          currentLayer = [];
        }
        currentLayer.push(path);
      }
    });

    return layers;
  }

  extrusions(): Path[] {
    return this.paths.filter((path) => path.travelType === PathType.Extrusion);
  }

  travels(): Path[] {
    return this.paths.filter((path) => path.travelType === PathType.Travel);
  }
}
