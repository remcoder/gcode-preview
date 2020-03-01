export abstract class GCodeCommand {
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
type MoveCommandParamName = 'x' | 'y' | 'z' | 'e';
type MoveCommandParams = {
  [key in MoveCommandParamName]?: number;
};

export class Layer {
  constructor(public layer: number, public commands: GCodeCommand[]) {}
}

export class Parser {
  layers: Layer[] = [];
  currentLayer: Layer;
  curZ = 0;
  maxZ = 0;

  parseCommand(line: string, keepComments = true): GCodeCommand | null {
    const input = line.trim();
    const splitted = input.split(';');
    const cmd = splitted[0];
    const comment = (keepComments && splitted[1]) || null;

    const parts = cmd.split(/ +/g);
    const gcode = parts[0].toLowerCase();
    switch (gcode) {
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
  parseMove(params: string[]): MoveCommandParams {
    return params.reduce((acc: MoveCommandParams, cur: string) => {
      const key = cur.charAt(0).toLowerCase();
      if (key == 'x' || key == 'y' || key == 'z' || key == 'e')
        acc[key] = parseFloat(cur.slice(1));
      return acc;
    }, {});
  }

  groupIntoLayers(commands: GCodeCommand[]): Layer[] {
    for (const cmd of commands.filter(
      cmd => cmd instanceof MoveCommand
    ) as MoveCommand[]) {
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

  parseGcode(input: string | string[]) {
    const lines = Array.isArray(input)
      ? input
      : input.split('\n').filter(l => l.length > 0); // discard empty lines

    const commands = this.lines2commands(lines);
    this.groupIntoLayers(commands);
    return { layers: this.layers };
  }

  private lines2commands(lines: string[]) {
    return lines
      .filter(l => l.length > 0) // discard empty lines
      .map(l => this.parseCommand(l))
      .filter(cmd => cmd !== null);
  }
}
