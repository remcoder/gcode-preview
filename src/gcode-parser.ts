/* eslint-disable no-unused-vars */ 
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

export class Layer {
  constructor(public layer: number, public commands: GCodeCommand[]) {}
}

const prefix = 'data:image/jpeg;base64,';

export class Thumb {
  public infoParts: string[];
  public size: string;
  public sizeParts: string[];
  public width: number;
  public height: number;
  public charLength: number;
  public chars = '';

  constructor(public thumbInfo: string)
  {
    this.infoParts = thumbInfo.split(' ');
    this.size = this.infoParts[0];
    this.sizeParts = this.size.split('x');
    this.width = +this.sizeParts[0];
    this.height = +this.sizeParts[1];
    this.charLength = +this.infoParts[1];
  }

  get src() : string {
    return prefix + this.chars;
  } 
}

export class Parser {
  layers: Layer[] = [];
  currentLayer: Layer;
  curZ = 0;
  maxZ = 0;
  metadata = { thumbnails : new Map<string,Thumb>()};
  parseMetadata = true;

  parseGcode(input: string | string[]) : { layers : Layer[], thumbs: Map<string,Thumb> } {
    const lines = Array.isArray(input)
      ? input
      : input.split('\n').filter(l => l.length > 0); // discard empty lines

    const commands = this.lines2commands(lines);
    
    this.groupIntoLayers(commands.filter(cmd=>cmd instanceof MoveCommand) as MoveCommand[]);
    this.metadata.thumbnails = this.processMetadata(commands.filter(cmd=>cmd.comment))
    
    return { layers: this.layers, thumbs: this.metadata.thumbnails };
  }

  private lines2commands(lines: string[]) {
    return lines
      .map(l => this.parseCommand(l));
  }

  parseCommand(line: string, keepComments = true, parseMetadata = true): GCodeCommand | null {
    this.parseMetadata = parseMetadata;
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

  processMetadata(metadata: GCodeCommand[]) : Map<string,Thumb> {
    const thumbnails = new Map<string,Thumb>();
    
    let thumb : Thumb = null;

    for(const cmd of metadata) {
      const comment = cmd.comment;
      const idxThumbBegin = comment.indexOf('thumbnail begin');
      const idxThumbEnd = comment.indexOf('thumbnail end');
      
      if (idxThumbBegin > -1) {
        thumb = new Thumb(comment.slice(idxThumbBegin + 15).trim());
      }
      else if (thumb) {
        if (idxThumbEnd == -1) {
          thumb.chars += comment.trim();
        }
        else  {
          thumbnails.set(thumb.size, thumb);
          console.debug('thumb found' , thumb.size);
          console.debug('declared length', thumb.charLength, 'actual length', thumb.chars.length);
          thumb = null;
        }
      }
    }

    return thumbnails;
  }
}
