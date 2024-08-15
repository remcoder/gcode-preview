import { Path, PathType } from './path';
import { GCodeCommand, SelectToolCommand } from './gcode-parser';

export class State {
  x: number;
  y: number;
  z: number;
  r: number;
  e: number;
  i: number;
  j: number;
  t: number;

  static get initial(): State {
    const state = new State();
    Object.assign(state, { x: 0, y: 0, z: 0, r: 0, e: 0, i: 0, j: 0, t: 0 });
    return state;
  }
}

class Print {
  paths: Path[];
  state: State;

  constructor(state?: State) {
    this.paths = [];
    this.state = state || State.initial;
  }
}

export class Interpreter {
  execute(commands: GCodeCommand[], initialState?: State): Print {
    const print = new Print(initialState);

    commands.forEach((command) => {
      if (command.code !== undefined) {
        this[command.code](command, print);
      }
    });

    return print;
  }

  G0(command: GCodeCommand, print: Print): void {
    const { x, y, z, e } = command.params;
    const { state } = print;

    let lastPath = print.paths[print.paths.length - 1];
    const pathType = e ? PathType.Extrusion : PathType.Travel;

    if (lastPath === undefined || lastPath.type !== pathType) {
      lastPath = new Path(pathType, 0.6, 0.2, state.t);
      print.paths.push(lastPath);
      lastPath.addPoint(state.x, state.y, state.z);
    }

    state.x = x || state.x;
    state.y = y || state.y;
    state.z = z || state.z;

    lastPath.addPoint(state.x, state.y, state.z);
  }

  G1 = this.G0;
  G2(command: GCodeCommand, print: Print): void {
    console.log(command.src, print);
  }
  G3(command: GCodeCommand, print: Print): void {
    console.log(command.src, print);
  }

  T0(command: SelectToolCommand, print: Print): void {
    print.state.t = 0;
  }
  T1(command: SelectToolCommand, print: Print): void {
    print.state.t = 1;
  }
  T2(command: SelectToolCommand, print: Print): void {
    print.state.t = 2;
  }
  T3(command: SelectToolCommand, print: Print): void {
    print.state.t = 3;
  }
  T4(command: SelectToolCommand, print: Print): void {
    print.state.t = 4;
  }
  T5(command: SelectToolCommand, print: Print): void {
    print.state.t = 5;
  }
  T6(command: SelectToolCommand, print: Print): void {
    print.state.t = 6;
  }
  T7(command: SelectToolCommand, print: Print): void {
    print.state.t = 7;
  }
}
