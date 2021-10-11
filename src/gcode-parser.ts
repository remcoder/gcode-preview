/* eslint-disable no-unused-vars */ 
import { Thumbnail } from './thumbnail';

type singleLetter = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' 
| 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' 
| 'y' | 'z' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' 
| 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' 
| 'Y' | 'Z';
type CommandParams = { [key in singleLetter]?: number };

type MoveCommandParamName = 'x' | 'y' | 'z' | 'e' | 'f';
type MoveCommandParams = {
  [key in MoveCommandParamName]?: number;
};
export class GCodeCommand {
  constructor(public src: string, 
    public gcode: string, 
    public params: CommandParams, 
    public comment?: string) {}
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

type Metadata = { thumbnails :  Record<string, Thumbnail> };

export class Layer {
  constructor(
    public layer: number, 
    public commands: GCodeCommand[],
    public lineNumber: number
  ) {}
}

export class Parser {
  lines: string[];
  preamble = new Layer(-1, [], 0);
  layers: Layer[] = [];
  currentLayer: Layer;
  curZ = 0;
  maxZ = 0;
  metadata : Metadata = { thumbnails : {} };

  parseGcode(input: string | string[]) : { layers : Layer[], metadata: Metadata } {
    this.lines = Array.isArray(input)
      ? input
      : input.split('\n');

    const commands = this.lines2commands(this.lines);
    
    this.groupIntoLayers(commands.filter(cmd=>cmd instanceof MoveCommand) as MoveCommand[]);
    this.metadata = this.parseMetadata(commands.filter(cmd=>cmd.comment))
    
    return { layers: this.layers, metadata: this.metadata };
  }

  private lines2commands(lines: string[]) {
    return lines
      .map(l => this.parseCommand(l));
  }

  private parseCommand(line: string, keepComments = true): GCodeCommand | null {
    const input = line.trim();
    const splitted = input.split(';');
    const cmd = splitted[0];
    const comment = (keepComments && splitted[1]) || null;

    const parts = cmd.split(/ +/g);
    const gcode = parts[0].toLowerCase();
    let params;
    switch (gcode) {
      case 'g0':
      case 'g1':
        params = this.parseMove(parts.slice(1));
        return new MoveCommand(line, gcode, params, comment);
      default:
        params = this.parseParams (parts.slice(1));
        // console.warn(`non-move code: ${gcode} ${params}`);
        return new GCodeCommand(line, gcode, params, comment);
    }
  }


  // G0 & G1
  private parseMove(params: string[]): MoveCommandParams {
    return params.reduce((acc: MoveCommandParams, cur: string) => {
      const key = cur.charAt(0).toLowerCase();
      if (key == 'x' || key == 'y' || key == 'z' || key == 'e' || key == 'f')
        acc[key] = parseFloat(cur.slice(1));
      return acc;
    }, {});
  }

  private  isAlpha(char : string | singleLetter) : char is singleLetter {
    const code = char.charCodeAt(0);
    return (code >= 97 && code <= 122) || (code >= 65 && code <= 90);
  }

  private parseParams(params: string[]): CommandParams {
    return params.reduce((acc: CommandParams, cur: string) => {
      const key = cur.charAt(0).toLowerCase();
      if (this.isAlpha(key))
        acc[key] = parseFloat(cur.slice(1));
      return acc;
    }, {});
  }

  private groupIntoLayers(commands: GCodeCommand[]): Layer[] {
    for (let lineNumber = 0; lineNumber < commands.length; lineNumber++) {
      const cmd = commands[lineNumber];

      if (! (cmd instanceof MoveCommand)) {
        if (this.currentLayer) 
          this.currentLayer.commands.push(cmd);
        else  
          this.preamble.commands.push(cmd);
        continue;
      }
      const params = cmd.params;
      if (params.z) {
        // abs mode
        this.curZ = params.z;
      }

      if (
        params.e > 0 &&
        (params.x != undefined || params.y != undefined) &&
        this.curZ > this.maxZ
      ) {
        this.maxZ = this.curZ;
        this.currentLayer = new Layer(this.layers.length, [cmd], lineNumber);
        this.layers.push(this.currentLayer);
        continue;
      }
        
      if (this.currentLayer) 
        this.currentLayer.commands.push(cmd);
      else  
        this.preamble.commands.push(cmd);
    }

    return this.layers;
  }

  parseMetadata(metadata: GCodeCommand[]) : Metadata {
    const thumbnails : Record<string,Thumbnail> = {};
    
    let thumb : Thumbnail = null;

    for(const cmd of metadata) {
      const comment = cmd.comment;
      const idxThumbBegin = comment.indexOf('thumbnail begin');
      const idxThumbEnd = comment.indexOf('thumbnail end');
      
      if (idxThumbBegin > -1) {
        thumb = Thumbnail.parse(comment.slice(idxThumbBegin + 15).trim());
      }
      else if (thumb) {
        if (idxThumbEnd == -1) {
          thumb.chars += comment.trim();
        }
        else  {
          if (thumb.isValid) {
            thumbnails[thumb.size] = thumb;
            console.debug('thumb found' , thumb.size);
            console.debug('declared length', thumb.charLength, 'actual length', thumb.chars.length);
          }
          else {
            console.warn('thumb found but seems to be invalid');
          }
          thumb = null;
        }
      }
    }

    return { thumbnails };
  }
}
