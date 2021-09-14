/* eslint-disable no-unused-vars */ 
import { Thumbnail } from './thumbnail';

export class GCodeCommand {
  constructor(public gcode?: string, public comment?: string) {}
}

export class MoveCommand extends GCodeCommand {
  constructor(
    gcode: string,
    public params: MoveCommandParams,
    comment?: string
  ) {
    super(gcode, comment);
  }
}
type MoveCommandParamName = 'x' | 'y' | 'z' | 'e' | 'f';
type MoveCommandParams = {
  [key in MoveCommandParamName]?: number;
};

type Metadata = { thumbnails :  Record<string, Thumbnail> };

export class Layer {
  constructor(public layer: number, public commands: GCodeCommand[]) {}
}

export class Parser {
  layers: Layer[] = [];
  currentLayer: Layer;
  curZ = 0;
  maxZ = 0;
  metadata : Metadata = { thumbnails : {} };

  parseGcode(input: string | string[]) : { layers : Layer[], metadata: Metadata } {
    const lines = Array.isArray(input)
      ? input
      : input.split('\n').filter(l => l.length > 0); // discard empty lines

    const commands = this.lines2commands(lines);
    
    this.groupIntoLayers(commands.filter(cmd=>cmd instanceof MoveCommand) as MoveCommand[]);
    this.metadata = this.parseMetadata(commands.filter(cmd=>cmd.comment))
    
    return { layers: this.layers, metadata: this.metadata };
  }

  private lines2commands(lines: string[]) {
    return lines
      .map(l => this.parseCommand(l));
  }

  parseCommand(line: string, keepComments = true): GCodeCommand | null {
    const input = line.trim();
    const splitted = input.split(';');
    const cmd = splitted[0];
    const comment = (keepComments && splitted[1]) || null;

    const parts = cmd.split(/ +/g);
    const gcode = parts[0].toLowerCase();
    let params : MoveCommandParams;
    switch (gcode) {
      case 'g0':
      case 'g1':
        params = this.parseMove(parts.slice(1));
        return new MoveCommand(gcode, params, comment);
      default:
        //console.warn(`Unrecognized gcode: ${gcode}`);
        return new GCodeCommand(gcode, comment);
    }
  }


  // G0 & G1
  parseMove(params: string[]): MoveCommandParams {
    return params.reduce((acc: MoveCommandParams, cur: string) => {
      const key = cur.charAt(0).toLowerCase();
      if (key == 'x' || key == 'y' || key == 'z' || key == 'e' || key == 'f')
        acc[key] = parseFloat(cur.slice(1));
      return acc;
    }, {});
  }

  groupIntoLayers(commands: MoveCommand[]): Layer[] {
    for (const cmd of commands) {
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
        this.currentLayer = new Layer(this.layers.length, [cmd]);
        this.layers.push(this.currentLayer);
        continue;
      }
      if (this.currentLayer) this.currentLayer.commands.push(cmd);
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
