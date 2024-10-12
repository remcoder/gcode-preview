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
  private layersPaths: Path[][] | null;
  private indexers: Indexer[];
  inprogressPath: Path | undefined;

  constructor(state?: State) {
    this.paths = [];
    this.state = state || State.initial;
    this.layersPaths = [[]];
    this.indexers = [
      new TravelTypeIndexer({ travel: this.travelPaths, extrusion: this.extrusionPaths }),
      new LayersIndexer(this.layersPaths)
    ];
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

  finishPath(): void {
    if (this.inprogressPath === undefined) {
      return;
    }
    if (this.inprogressPath.vertices.length > 0) {
      this.addPath(this.inprogressPath);
    }
  }

  addPath(path: Path): void {
    this.paths.push(path);
    this.indexPath(path);
  }

  isPlanar(): boolean {
    return this.paths.find((path) => path.travelType === PathType.Extrusion && path.hasVerticalMoves()) === undefined;
  }

  private indexPath(path: Path): void {
    this.indexers.forEach((indexer) => {
      try {
        indexer.sortIn(path);
      } catch (e) {
        if (e instanceof NonApplicableIndexer) {
          if (e instanceof NonPlanarPathError) {
            this.layersPaths = null;
          }
          const i = this.indexers.indexOf(indexer);
          this.indexers.splice(i, 1);
        } else {
          throw e;
        }
      }
    });
  }
}

class NonApplicableIndexer extends Error {}
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
  protected declare indexes: Record<string, Path[]>;
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

class NonPlanarPathError extends NonApplicableIndexer {
  constructor() {
    super("Non-planar paths can't be indexed by layer");
  }
}
class LayersIndexer extends Indexer {
  protected declare indexes: Path[][];
  constructor(indexes: Path[][]) {
    super(indexes);
  }

  sortIn(path: Path): void {
    if (path.travelType === PathType.Extrusion && path.vertices.some((_, i, arr) => i % 3 === 2 && arr[i] !== arr[2])) {
      throw new NonPlanarPathError();
    }

    if (path.travelType === PathType.Extrusion) {
      this.lastLayer().push(path);
    } else {
      if (
        path.vertices.some((_, i, arr) => i % 3 === 2 && arr[i] !== arr[2]) &&
        this.lastLayer().find((p) => p.travelType === PathType.Extrusion)
      ) {
        this.createLayer();
      }
      this.lastLayer().push(path);
    }
  }

  private lastLayer(): Path[] {
    if (this.indexes === undefined) {
      this.indexes = [[]];
    }

    if (this.indexes[this.indexes.length - 1] === undefined) {
      this.createLayer();
      return this.lastLayer();
    }
    return this.indexes[this.indexes.length - 1];
  }

  private createLayer(): void {
    const newLayer: Path[] = [];
    this.indexes.push(newLayer);
  }
}
