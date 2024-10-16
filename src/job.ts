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

  constructor(opts: { state?: State; minLayerThreshold?: number } = {}) {
    this.paths = [];
    this.state = opts.state || State.initial;
    this.layersPaths = [[]];
    this.indexers = [
      new TravelTypeIndexer({ travel: this.travelPaths, extrusion: this.extrusionPaths }),
      new LayersIndexer(this.layersPaths, opts.minLayerThreshold)
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
    return this.layersPaths !== null;
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
export class Indexer {
  protected indexes: Record<string, Path[]> | Path[][];
  constructor(indexes: Record<string, Path[]> | Path[][]) {
    this.indexes = indexes;
  }
  sortIn(path: Path): void {
    path;
    throw new Error('Method not implemented.');
  }
}

export class TravelTypeIndexer extends Indexer {
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
export class LayersIndexer extends Indexer {
  static readonly DEFAULT_TOLERANCE = 0.05;
  protected declare indexes: Path[][];
  private tolerance: number;
  constructor(indexes: Path[][], tolerance: number = LayersIndexer.DEFAULT_TOLERANCE) {
    super(indexes);
    this.tolerance = tolerance;
  }

  sortIn(path: Path): void {
    if (path.travelType === PathType.Extrusion && path.vertices.some((_, i, arr) => i % 3 === 2 && arr[i] !== arr[2])) {
      throw new NonPlanarPathError();
    }

    if (path.travelType === PathType.Extrusion) {
      this.lastLayer().push(path);
    } else {
      const verticalTravels = path.vertices
        .map((_, i, arr) => {
          if (i % 3 === 2 && arr[i] - arr[2] > this.tolerance) {
            return arr[i] - arr[2];
          }
        })
        .filter((z) => z !== undefined);
      const hasVerticalTravel = verticalTravels.length > 0;
      const hasExtrusions = this.lastLayer().find((p) => p.travelType === PathType.Extrusion);

      if (hasVerticalTravel && hasExtrusions) {
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
