export abstract class GCodeCommand{
  constructor(public gcode?: string, public comment?: string) {}
};

export class MoveCommand extends GCodeCommand {
  constructor(gcode: string, public params: MoveCommandParams, comment?: string) {
    super(gcode, comment);
  }
}
type MoveCommandParamName = "x" | "y" | "z" | "e";
type MoveCommandParams = {
  [key in MoveCommandParamName]? : number  
}

export class Layer {
  constructor(public layer: number, public commands: GCodeCommand[],) {
  }
}

export class Parser {

  parseCommand(line: string, keepComments = true) : GCodeCommand | null {
    const input = line.trim();
    const splitted = input.split(';');
    const cmd = splitted[0];
    const comment = (keepComments && splitted[1]) || null;

    const parts = cmd.split(/ +/g);
    const gcode = parts[0].toLowerCase();
    switch(gcode) {
      case 'g0':
      case 'g1':
        const params = this.parseMove(parts.slice(1));
        return new MoveCommand(gcode, params, comment);
      default:
        //console.warn(`Unrecognized gcode: ${gcode}`);
        return null;
    }
  }
 
  // G0 & G1
  parseMove(params: string[]) : MoveCommandParams {
    return params.reduce((acc: MoveCommandParams, cur: string) => {
      
      const key = cur.charAt(0).toLowerCase();
      if (key == 'x' || key == 'y' || key == 'z' || key == 'e')
        acc[ key ] = parseFloat(cur.slice(1));
      return acc
    }, {}); 
  }

  groupIntoLayers(commands : GCodeCommand[]) : Layer[] {
    const layers = [];
    let currentLayer : Layer;
    let maxZ = 0;
    const firstLayerMaxZ = 2;

    for(const cmd of commands.filter(cmd => cmd instanceof MoveCommand) as MoveCommand[]) {
      const params = cmd.params;
        // create a new layer when
        // 1. z movement is detected
        // 2. the z movement reaches a new height (allows up/down movement within a layer)
        // 3. the first z movement isn't higher than 1 (keeps initial high z movement from being interpreted as a layer floatin in the air)
        if (params.z && params.z > maxZ && (maxZ != 0 || params.z < firstLayerMaxZ)) {
          maxZ = params.z;
          currentLayer = new Layer(layers.length, [cmd]);
          layers.push(currentLayer);
          continue;
        }
        if (currentLayer)
            currentLayer.commands.push(cmd);
    }

    return layers;
  }

  parseGcode(input: string) {
    console.time('parsing');
    const lines = input
        .split('\n')
        .filter(l => l.length>0); // discard empty lines

    const commands : GCodeCommand[] = lines
      .map(l => this.parseCommand(l))
      .filter(cmd => cmd !== null);

    const header = { slicer: "MySlicer" }; //this.parseHeader(commands);
    const layers = this.groupIntoLayers(commands);
    const limit = layers.length - 1;
    console.timeEnd('parsing');
    return { header, layers, limit };
  }

  // TODO: prevent scanning the whole gcode file
  parseHeader(commands: GCodeCommand[]) {
    const comments = commands
      .filter(cmd => cmd.comment !== null)
      .map(cmd => cmd.comment);

    const slicer = comments
        .filter(com => /(G|g)enerated/.test(com) )
        .map(com => {
            if(com.includes('Slic3r'))
                return 'Slic3r';
            if (com.includes('Simplify3D'))
                return 'Simplify3D';
            if (com.includes('Cura_SteamEngine'))
                return 'Cura_SteamEngine';
        })[0];

    return {
        slicer
    };
  }
}
