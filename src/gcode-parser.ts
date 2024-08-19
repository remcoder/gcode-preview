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

export enum Code {
  G0 = 'G0',
  G1 = 'G1',
  G2 = 'G2',
  G3 = 'G3',
  G28 = 'G28',
  T0 = 'T0',
  T1 = 'T1',
  T2 = 'T2',
  T3 = 'T3',
  T4 = 'T4',
  T5 = 'T5',
  T6 = 'T6',
  T7 = 'T7'
}
export class GCodeCommand {
  public code?: Code;
  constructor(
    public src: string,
    public gcode: string,
    public params: CommandParams,
    public comment?: string
  ) {
    this.code = this.match(gcode);
  }

  match(gcode: string): Code {
    switch (gcode) {
      case 'g0':
      case 'g00':
        return Code.G0;
      case 'g1':
      case 'g01':
        return Code.G1;
      case 'g2':
      case 'g02':
        return Code.G2;
      case 'g3':
      case 'g03':
        return Code.G3;
      case 't0':
        return Code.T0;
      case 't1':
        return Code.T1;
      case 't2':
        return Code.T2;
      case 't3':
        return Code.T3;
      case 't4':
        return Code.T4;
      case 't5':
        return Code.T5;
      case 't6':
        return Code.T6;
      case 't7':
        return Code.T7;
      default:
        return undefined;
    }
  }
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

export class Parser {
  lines: string[] = [];
  commands: GCodeCommand[] = [];

  /**
   * @experimental GCode commands before extrusion starts.
   */
  preamble = new Layer(-1, [], 0); // TODO: remove preamble and treat as a regular layer? Unsure of the benefit
  layers: Layer[] = [];
  curZ = 0;
  maxZ = 0;
  metadata: Metadata = { thumbnails: {} };
  tolerance = 0; // The higher the tolerance, the fewer layers are created, so performance will improve.

  /**
   * Create a new Parser instance.
   *
   * @param minLayerThreshold - If specified, the minimum layer height to be considered a new layer. If not specified, the default value is 0.
   * @returns A new Parser instance.
   */
  constructor(minLayerThreshold: number) {
    this.tolerance = minLayerThreshold ?? this.tolerance;
  }

  parseGCode(input: string | string[]): {
    layers: Layer[];
    metadata: Metadata;
    commands: GCodeCommand[];
  } {
    const lines = Array.isArray(input) ? input : input.split('\n');

    this.lines = this.lines.concat(lines);

    this.commands = this.lines2commands(lines);

    // this.groupIntoLayers(this.commands);

    // merge thumbs
    const thumbs = this.parseMetadata(this.commands.filter((cmd) => cmd.comment)).thumbnails;
    for (const [key, value] of Object.entries(thumbs)) {
      this.metadata.thumbnails[key] = value;
    }

    return { layers: this.layers, metadata: this.metadata, commands: this.commands };
  }

  private lines2commands(lines: string[]) {
    return lines.map((l) => this.parseCommand(l)) as GCodeCommand[];
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
        return new SelectToolCommand(line, gcode, comment, 0);
      case 't1':
        return new SelectToolCommand(line, gcode, comment, 1);
      case 't2':
        return new SelectToolCommand(line, gcode, comment, 2);
      case 't3':
        return new SelectToolCommand(line, gcode, comment, 3);
      case 't4':
        return new SelectToolCommand(line, gcode, comment, 4);
      case 't5':
        return new SelectToolCommand(line, gcode, comment, 5);
      case 't6':
        return new SelectToolCommand(line, gcode, comment, 6);
      case 't7':
        return new SelectToolCommand(line, gcode, comment, 7);
      default:
        return new GCodeCommand(line, gcode, params, comment);
    }
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
