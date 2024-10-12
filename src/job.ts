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
  private travelPaths: Path[] = [];
  private extrusionPaths: Path[] = [];
  private layersPaths: Path[][] = [];
  private indexers: Indexer[] = [new TravelTypeIndexer({ travel: this.travelPaths, extrusion: this.extrusionPaths })];

  constructor(state?: State) {
    this.paths = [];
    this.state = state || State.initial;
  }

  get extrusions(): Path[] {
    return this.extrusionPaths;
  }

  get travels(): Path[] {
    return this.travelPaths;
  }

  addPath(path: Path): void {
    this.paths.push(path);
    this.indexPath(path);
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
        if (
          path.vertices.some((_, i, arr) => i % 3 === 2 && arr[i] !== arr[2]) &&
          currentLayer.find((p) => p.travelType === PathType.Extrusion)
        ) {
          layers.push(currentLayer);
          currentLayer = [];
        }
        currentLayer.push(path);
      }
    });

    layers.push(currentLayer);

    return layers;
  }

  private indexPath(path: Path): void {
    this.indexers.forEach((indexer) => indexer.sortIn(path));
  }
}

class Indexer {
  protected indexes: Record<string, Path[]>;
  constructor(_indexes: Record<string, Path[]>) {
    this.indexes = _indexes;
  }
  sortIn(path: Path): boolean {
    path;
    throw new Error('Method not implemented.');
  }
}

class TravelTypeIndexer extends Indexer {
  constructor(indexes: Record<string, Path[]>) {
    super(indexes);
  }

  sortIn(path: Path): boolean {
    if (path.travelType === PathType.Extrusion) {
      this.indexes.extrusion.push(path);
    } else {
      this.indexes.travel.push(path);
    }
    return true;
  }
}
