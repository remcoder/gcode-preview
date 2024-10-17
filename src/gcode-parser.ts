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

export class GCodeCommand {
  constructor(
    public src: string,
    public gcode: string,
    public params: CommandParams,
    public comment?: string
  ) {}
}

type Metadata = { thumbnails: Record<string, Thumbnail> };

export class Parser {
  metadata: Metadata = { thumbnails: {} };
  lines: string[] = [];

  parseGCode(input: string | string[]): {
    metadata: Metadata;
    commands: GCodeCommand[];
  } {
    this.lines = Array.isArray(input) ? input : input.split('\n');
    const commands = this.lines2commands(this.lines);

    // merge thumbs
    const thumbs = this.parseMetadata(commands.filter((cmd) => cmd.comment)).thumbnails;
    for (const [key, value] of Object.entries(thumbs)) {
      this.metadata.thumbnails[key] = value;
    }

    return { metadata: this.metadata, commands: commands };
  }

  private lines2commands(lines: string[]) {
    return lines.map((l) => this.parseCommand(l));
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

    const gcode = !parts.length ? '' : `${parts[0]?.toLowerCase()}${Number(parts[1])}`;
    const params = this.parseParams(parts.slice(2));
    return new GCodeCommand(line, gcode, params, comment);
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
