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

  parseGcode(input: string | string[]) {
    const lines = Array.isArray(input)
      ? input
      : input.split('\n').filter(l => l.length > 0); // discard empty lines

    this.lines = lines;

    const commands = lines.map(l => this.parseCommand(l));
    this.groupIntoLayers(commands);
    return { layers: this.layers };
  }
}
