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
  private layersPaths: Path[][] | null = [];
  private indexers: Indexer[] = [
    new TravelTypeIndexer({ travel: this.travelPaths, extrusion: this.extrusionPaths }),
    new LayersIndexer(this.layersPaths)
  ];

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

  get layers(): Path[][] | null {
    return this.layersPaths;
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

  private indexPath(path: Path): void {
    this.indexers.forEach((indexer) => {
      try {
        indexer.sortIn(path);
      } catch (e) {
        this.layersPaths = null;
        const i = this.indexers.indexOf(indexer);
        this.indexers.splice(i, 1);
      }
    });
  }
}

class Indexer {
  protected indexes: Record<string, Path[]> | Path[][];
  constructor(indexes: Record<string, Path[]> | Path[][]) {
    this.indexes = indexes;
  }
  sortIn(path: Path): void {
    path;
    throw new Error('Method not implemented.');
  }
}

class TravelTypeIndexer extends Indexer {
  protected indexes: Record<string, Path[]>;
  constructor(indexes: Record<string, Path[]>) {
    super(indexes);
  }

  sortIn(path: Path): void {
    if (path.travelType === PathType.Extrusion) {
      this.indexes.extrusion.push(path);
    } else {
      this.indexes.travel.push(path);
    }
  }
}

class LayersIndexer extends Indexer {
  protected indexes: Path[][];
  constructor(indexes: Path[][]) {
    super(indexes);
  }

  sortIn(path: Path): void {
    if (path.travelType === PathType.Extrusion && path.vertices.some((_, i, arr) => i % 3 === 2 && arr[i] !== arr[2])) {
      throw new Error("Non-planar paths can't be indexed by layer");
    }

    if (path.travelType === PathType.Extrusion) {
      this.currentLayer().push(path);
    } else {
      if (
        path.vertices.some((_, i, arr) => i % 3 === 2 && arr[i] !== arr[2]) &&
        this.currentLayer().find((p) => p.travelType === PathType.Extrusion)
      ) {
        this.indexes.push([]);
      }
      this.currentLayer().push(path);
    }
  }

  private currentLayer(): Path[] {
    const layer = this.indexes[this.indexes.length - 1];
    if (layer === undefined) {
      this.indexes.push([]);
      return this.currentLayer();
    }
    return layer;
  }
}
