/* eslint-disable no-unused-vars */
import { Thumbnail } from './thumbnail';

type CommandParams = Record<string, number>;

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

type Metadata = { thumbnails: Record<string, Thumbnail> };

export class Parser {
  lines: string[] = [];
  commands: GCodeCommand[] = [];

  metadata: Metadata = { thumbnails: {} };

  parseGCode(input: string | string[]): {
    metadata: Metadata;
    commands: GCodeCommand[];
  } {
    const lines = Array.isArray(input) ? input : input.split('\n');

    this.lines = this.lines.concat(lines);

    this.commands = this.lines2commands(lines);

    // merge thumbs
    const thumbs = this.parseMetadata(this.commands.filter((cmd) => cmd.comment)).thumbnails;
    for (const [key, value] of Object.entries(thumbs)) {
      this.metadata.thumbnails[key] = value;
    }

    return { metadata: this.metadata, commands: this.commands };
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
    return new GCodeCommand(line, gcode, params, comment);
  }

  private isAlpha(char: string): char is string {
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
