/* eslint-disable no-unused-vars */
import { Thumbnail } from './thumbnail';

type singleLetter =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z';
type CommandParams = { [key in singleLetter]?: number };

type MoveCommandParamName = 'x' | 'y' | 'z' | 'r' | 'e' | 'f' | 'i' | 'j';
type MoveCommandParams = {
  [key in MoveCommandParamName]?: number;
};
export class GCodeCommand {
  public lineNumber: number;
  public state: State;
  constructor(
    public src: string,
    public gcode: string,
    public params: CommandParams,
    public comment?: string
  ) {}
}

export class MoveCommand extends GCodeCommand {
  constructor(
    src: string,
    gcode: string,
    public params: MoveCommandParams,
    comment?: string
  ) {
    super(src, gcode, params, comment);
  }
}

export class SelectToolCommand extends GCodeCommand {
  constructor(
    src: string,
    gcode: string,
    comment?: string,
    public toolIndex?: number
  ) {
    super(src, gcode, undefined, comment);
  }
}

type Metadata = { thumbnails: Record<string, Thumbnail> };

export class Layer {
  constructor(
    public layer: number,
    public commands: GCodeCommand[],
    public lineNumber: number,
    public height: number = 0
  ) {}
}

export class State {
  constructor(
    public x: number | undefined,
    public y: number | undefined,
    public z: number | undefined,
    public e: number | undefined,
    public maxZ: number | undefined,
    public toolIndex: number | undefined,
    public lineNumber: number
  ) {}

  copy(): State {
    return new State(this.x, this.y, this.z, this.e, this.maxZ, this.toolIndex, this.lineNumber);
  }
}

export type ParsedGCode = {
  commands: GCodeCommand[];
  preamble: GCodeCommand[];
  isPlanar: boolean | undefined;
  layers: GCodeCommand[][];
  paths: GCodeCommand[][];
  metadata: Metadata;
};

export class Parser {
  lines: string[] = [];

  /**
   * @experimental GCode commands before extrusion starts.
   */
  preamble = new Layer(-1, [], 0); // TODO: remove preamble and treat as a regular layer? Unsure of the benefit
  layers: Layer[] = [];
  curZ = 0;
  maxZ = 0;
  metadata: Metadata = { thumbnails: {} };
  tolerance = 0; // The higher the tolerance, the fewer layers are created, so performance will improve.

  parsedGCode: ParsedGCode = {
    isPlanar: undefined,
    commands: [],
    layers: [],
    paths: [],
    preamble: [],
    metadata: { thumbnails: {} }
  };

  state: State;

  /**
   * Create a new Parser instance.
   *
   * @param minLayerThreshold - If specified, the minimum layer height to be considered a new layer. If not specified, the default value is 0.
   * @returns A new Parser instance.
   */
  constructor(minLayerThreshold?: number) {
    this.tolerance = minLayerThreshold ?? this.tolerance;
    this.state = new State(0, 0, 0, undefined, undefined, undefined, 0);
  }

  clear(): void {
    this.lines = [];
    this.preamble = new Layer(-1, [], 0);
    this.layers = [];
    this.curZ = 0;
    this.maxZ = 0;
    this.metadata = { thumbnails: {} };
    this.tolerance = 0;
    this.parsedGCode = {
      isPlanar: undefined,
      commands: [],
      layers: [],
      paths: [],
      preamble: [],
      metadata: { thumbnails: {} }
    };
    this.state = new State(0, 0, 0, undefined, undefined, undefined, 0);
  }

  parseGCode(input: string | string[]): {
    layers: Layer[];
    metadata: Metadata;
  } {
    const lines = Array.isArray(input) ? input : input.split('\n');

    this.lines = this.lines.concat(lines);

    for (let i = 0; i < lines.length; i++) {
      // build the command object
      const command = this.parseCommand(lines[i]);
      command.lineNumber = this.state.lineNumber + 1;
      command.state = this.state.copy();
      this.parsedGCode.commands.push(command);

      // Planar slicing specific logic
      if (
        this.parsedGCode.isPlanar === undefined &&
        command instanceof MoveCommand &&
        command.params.z &&
        command.params.e
      ) {
        this.parsedGCode.isPlanar = false;
        this.parsedGCode.layers = [];
      } else {
        let currentLayer = this.parsedGCode.layers[this.parsedGCode.layers.length - 1];
        if (!currentLayer) {
          currentLayer = [];
          this.parsedGCode.layers.push(currentLayer);
        }

        if (command instanceof MoveCommand) {
          const params = command.params;

          if (
            (params.e ?? 0) > 0 && // extruding?
            (params.x != undefined || params.y != undefined) && // moving?
            Math.abs(this.state.z - (this.state.maxZ || -Infinity)) > this.tolerance // new layer?
          ) {
            this.state.maxZ = this.state.z;
            this.parsedGCode.layers.push([]);
          }
        }

        // Split movements into paths
        let currentPath = this.parsedGCode.paths[this.parsedGCode.paths.length - 1];
        if (command instanceof MoveCommand) {
          if (!currentPath) {
            currentPath = [];
            this.parsedGCode.paths.push(currentPath);
          }

          if (
            command.params.e &&
            !this.state.e && // start extruding?
            !command.params.e &&
            this.state.e // stop extruding?
          ) {
            this.parsedGCode.paths[this.parsedGCode.paths.length - 1].push(command);
          }
          currentPath.push(command);
        } else if (command instanceof SelectToolCommand) {
          this.parsedGCode.paths.push([]);
        }
      }

      // update state
      this.state.x = command.params?.x || this.state.x;
      this.state.y = command.params?.y || this.state.y;
      this.state.z = command.params?.z || this.state.z;
      this.state.e = command.params?.e;
      this.state.lineNumber++;
    }

    // this.parsedGCode.paths = this.parsedGCode.paths.filter((path) => path.length > 0);

    if (this.parsedGCode.isPlanar === undefined) {
      this.parsedGCode.isPlanar = true;
    }

    // const commands = this.lines2commands(lines);

    // this.groupIntoLayers(commands);

    // merge thumbs
    // const thumbs = this.parseMetadata(commands.filter((cmd) => cmd.comment)).thumbnails;
    // for (const [key, value] of Object.entries(thumbs)) {
    //   this.metadata.thumbnails[key] = value;
    // }

    return { layers: this.layers, metadata: this.metadata };
  }

  private lines2commands(lines: string[]) {
    return lines.map((l) => this.parseCommand(l)).filter((cmd) => cmd != null) as GCodeCommand[];
  }

  parseCommand(line: string, keepComments = true): GCodeCommand | null {
    const input = line.trim();
    const splitted = input.split(';');
    const cmd = splitted[0];
    const comment = (keepComments && splitted[1]) || undefined;

    const parts = cmd
      .split(/([a-zA-Z])/g)
      .slice(1)
      .map((s) => s.trim());

    const gcode = !parts.length ? '' : `${parts[0]?.toLowerCase()}${parts[1]}`;
    const params = this.parseParams(parts.slice(2));
    switch (gcode) {
      case 'g0':
      case 'g00':
      case 'g1':
      case 'g01':
      case 'g2':
      case 'g02':
      case 'g3':
      case 'g03':
        return new MoveCommand(line, gcode, params, comment);
      case 't0':
        this.state.toolIndex = 0;
        return new SelectToolCommand(line, gcode, comment, 0);
      case 't1':
        this.state.toolIndex = 1;
        return new SelectToolCommand(line, gcode, comment, 1);
      case 't2':
        this.state.toolIndex = 2;
        return new SelectToolCommand(line, gcode, comment, 2);
      case 't3':
        this.state.toolIndex = 3;
        return new SelectToolCommand(line, gcode, comment, 3);
      case 't4':
        this.state.toolIndex = 4;
        return new SelectToolCommand(line, gcode, comment, 4);
      case 't5':
        this.state.toolIndex = 5;
        return new SelectToolCommand(line, gcode, comment, 5);
      case 't6':
        this.state.toolIndex = 6;
        return new SelectToolCommand(line, gcode, comment, 6);
      case 't7':
        this.state.toolIndex = 7;
        return new SelectToolCommand(line, gcode, comment, 7);
      default:
        return new GCodeCommand(line, gcode, params, comment);
    }
  }

  // G0 & G1
  private parseMove(params: string[]): MoveCommandParams {
    return params.reduce((acc: MoveCommandParams, cur: string) => {
      const key = cur.charAt(0).toLowerCase();
      if (key == 'x' || key == 'y' || key == 'z' || key == 'e' || key == 'r' || key == 'f' || key == 'i' || key == 'j')
        acc[key] = parseFloat(cur.slice(1));
      return acc;
    }, {});
  }

  private isAlpha(char: string | singleLetter): char is singleLetter {
    const code = char.charCodeAt(0);
    return (code >= 97 && code <= 122) || (code >= 65 && code <= 90);
  }

  private parseParams(params: string[]): CommandParams {
    return params.reduce((acc: CommandParams, cur: string, idx: number, array) => {
      // alternate bc we're processing in pairs
      if (idx % 2 == 0) return acc;

      let key = array[idx - 1];
      key = key.toLowerCase();
      if (this.isAlpha(key)) acc[key] = parseFloat(cur);

      return acc;
    }, {});
  }

  private groupIntoLayers(commands: GCodeCommand[]): Layer[] {
    for (let lineNumber = 0; lineNumber < commands.length; lineNumber++) {
      const cmd = commands[lineNumber];

      if (cmd instanceof MoveCommand) {
        const params = cmd.params;

        // update current z?
        if (params.z) {
          this.curZ = params.z; // abs mode
        }

        if (
          (params.e ?? 0) > 0 && // extruding?
          (params.x != undefined || params.y != undefined) && // moving?
          Math.abs(this.curZ - (this.maxZ || -Infinity)) > this.tolerance // new layer?
        ) {
          const layerHeight = Math.abs(this.curZ - this.maxZ);
          this.maxZ = this.curZ;
          this.layers.push(new Layer(this.layers.length, [], lineNumber, layerHeight));
        }
      }

      this.maxLayer.commands.push(cmd);
    }

    return this.layers;
  }

  get maxLayer(): Layer {
    return this.layers[this.layers.length - 1] ?? this.preamble;
  }

  parseMetadata(metadata: GCodeCommand[]): Metadata {
    const thumbnails: Record<string, Thumbnail> = {};

    let thumb: Thumbnail | undefined;

    for (const cmd of metadata) {
      const comment = cmd.comment;
      if (!comment) continue;
      const idxThumbBegin = comment.indexOf('thumbnail begin');
      const idxThumbEnd = comment.indexOf('thumbnail end');

      if (idxThumbBegin > -1) {
        thumb = Thumbnail.parse(comment.slice(idxThumbBegin + 15).trim());
      } else if (thumb) {
        if (idxThumbEnd == -1) {
          thumb.chars += comment.trim();
        } else {
          if (thumb.isValid) {
            thumbnails[thumb.size] = thumb;
          }
          thumb = undefined;
        }
      }
    }

    return { thumbnails };
  }
}
