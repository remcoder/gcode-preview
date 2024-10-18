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

export class Layer {
  public layer: number;
  public paths: Path[];
  public lineNumber: number;
  public height: number = 0;
  public z: number = 0;
  constructor(layer: number, paths: Path[], lineNumber: number, height: number = 0, z: number = 0) {
    this.layer = layer;
    this.paths = paths;
    this.lineNumber = lineNumber;
    this.height = height;
    this.z = z;
  }
}

export class Job {
  paths: Path[] = [];
  state: State;
  private travelPaths: Path[] = [];
  private extrusionPaths: Path[] = [];
  private _layers: Layer[] = [];
  private indexers: Indexer[];
  inprogressPath: Path | undefined;

  constructor(opts: { state?: State; minLayerThreshold?: number } = {}) {
    this.state = opts.state || State.initial;
    this.indexers = [
      new TravelTypeIndexer({ travel: this.travelPaths, extrusion: this.extrusionPaths }),
      new LayersIndexer(this._layers, opts.minLayerThreshold)
    ];
  }

  get extrusions(): Path[] {
    return this.extrusionPaths;
  }

  get travels(): Path[] {
    return this.travelPaths;
  }

  get layers(): Layer[] {
    return this._layers;
  }

  addPath(path: Path): void {
    this.paths.push(path);
    this.indexPath(path);
  }

  finishPath(): void {
    if (this.inprogressPath === undefined) {
      return;
    }
    if (this.inprogressPath.vertices.length > 0) {
      this.addPath(this.inprogressPath);
      this.inprogressPath = undefined;
    }
  }

  resumeLastPath(): void {
    this.inprogressPath = this.paths.pop();
    [this.extrusionPaths, this.travelPaths, this.layers[this.layers.length - 1]?.paths].forEach((indexer) => {
      if (indexer === undefined || indexer.length === 0) {
        return;
      }
      const travelIndex = indexer.indexOf(this.inprogressPath);
      if (travelIndex > -1) {
        indexer.splice(travelIndex, 1);
      }
    });
  }

  isPlanar(): boolean {
    return this.layers.length > 0;
  }

  private indexPath(path: Path): void {
    this.indexers.forEach((indexer) => {
      try {
        indexer.sortIn(path);
      } catch (e) {
        if (e instanceof NonApplicableIndexer) {
          if (e instanceof NonPlanarPathError) {
            this._layers = [];
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
  protected indexes: Record<string, Path[]> | Layer[];
  constructor(indexes: Record<string, Path[]> | Layer[]) {
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
  protected declare indexes: Layer[];
  private tolerance: number;
  constructor(indexes: Layer[], tolerance: number = LayersIndexer.DEFAULT_TOLERANCE) {
    super(indexes);
    this.tolerance = tolerance;
  }

  sortIn(path: Path): void {
    if (path.travelType === PathType.Extrusion && path.vertices.some((_, i, arr) => i % 3 === 2 && arr[i] !== arr[2])) {
      throw new NonPlanarPathError();
    }
    if (this.indexes[this.indexes.length - 1] === undefined) {
      this.createLayer(path.vertices[2]);
    }

    if (path.travelType === PathType.Extrusion) {
      this.lastLayer().paths.push(path);
    } else {
      const verticalTravels = path.vertices
        .map((_, i, arr) => {
          if (i % 3 === 2 && arr[i] - arr[2] > this.tolerance) {
            return arr[i] - arr[2];
          }
        })
        .filter((z) => z !== undefined);
      const hasVerticalTravel = verticalTravels.length > 0;
      const hasExtrusions = this.lastLayer().paths.find((p) => p.travelType === PathType.Extrusion);

      if (hasVerticalTravel && hasExtrusions) {
        this.createLayer(path.vertices[2]);
      }
      this.lastLayer().paths.push(path);
    }
  }

  private lastLayer(): Layer {
    return this.indexes[this.indexes.length - 1];
  }

  private createLayer(z: number): void {
    const layerNumber = this.indexes.length;
    const height = z - this.lastLayer()?.z;
    this.indexes.push(new Layer(this.indexes.length, [], layerNumber, height, z));
  }
}
