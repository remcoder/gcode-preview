import { Path, PathType } from './path';
import { Code, GCodeCommand } from './gcode-parser';
import { Job } from './job';

export class Interpreter {
  execute(commands: GCodeCommand[], job = new Job()): Job {
    commands.forEach((command) => {
      if (command.code !== undefined) {
        this[command.code](command, job);
      }
    });

    return job;
  }

  G0(command: GCodeCommand, job: Job): void {
    const { x, y, z, e } = command.params;
    const { state } = job;

    let lastPath = job.paths[job.paths.length - 1];
    const pathType = e ? PathType.Extrusion : PathType.Travel;

    if (lastPath === undefined || lastPath.travelType !== pathType) {
      lastPath = this.breakPath(job, pathType);
    }

    state.x = x || state.x;
    state.y = y || state.y;
    state.z = z || state.z;

    lastPath.addPoint(state.x, state.y, state.z);
  }

  G1 = this.G0;

  G2(command: GCodeCommand, job: Job): void {
    const { x, y, z, e } = command.params;
    let { i, j, r } = command.params;
    const { state } = job;

    const cw = command.code === Code.G2;
    let lastPath = job.paths[job.paths.length - 1];
    const pathType = e ? PathType.Extrusion : PathType.Travel;

    if (lastPath === undefined || lastPath.travelType !== pathType) {
      lastPath = this.breakPath(job, pathType);
    }

    if (r) {
      // in r mode a minimum radius will be applied if the distance can otherwise not be bridged
      const deltaX = x - state.x; // assume abs mode
      const deltaY = y - state.y;

      // apply a minimal radius to bridge the distance
      const minR = Math.sqrt(Math.pow(deltaX / 2, 2) + Math.pow(deltaY / 2, 2));
      r = Math.max(r, minR);

      const dSquared = Math.pow(deltaX, 2) + Math.pow(deltaY, 2);
      const hSquared = Math.pow(r, 2) - dSquared / 4;
      // if (dSquared == 0 || hSquared < 0) {
      //   return { position: { x: x, y: z, z: y }, points: [] }; //we'll abort the render and move te position to the new position.
      // }
      let hDivD = Math.sqrt(hSquared / dSquared);

      // Ref RRF DoArcMove for details
      if ((cw && r < 0.0) || (!cw && r > 0.0)) {
        hDivD = -hDivD;
      }
      i = deltaX / 2 + deltaY * hDivD;
      j = deltaY / 2 - deltaX * hDivD;
      // } else {
      //     //the radial point is an offset from the current position
      //     ///Need at least on point
      //     if (i == 0 && j == 0) {
      //         return { position: { x: x, y: y, z: z }, points: [] }; //we'll abort the render and move te position to the new position.
      //     }
    }

    const wholeCircle = state.x == x && state.y == y;
    const centerX = state.x + i;
    const centerY = state.y + j;

    const arcRadius = Math.sqrt(i * i + j * j);
    const arcCurrentAngle = Math.atan2(-j, -i);
    const finalTheta = Math.atan2(y - centerY, x - centerX);

    let totalArc;
    if (wholeCircle) {
      totalArc = 2 * Math.PI;
    } else {
      totalArc = cw ? arcCurrentAngle - finalTheta : finalTheta - arcCurrentAngle;
      if (totalArc < 0.0) {
        totalArc += 2 * Math.PI;
      }
    }
    let totalSegments = (arcRadius * totalArc) / 0.5;
    if (state.units == 'in') {
      totalSegments *= 25;
    }
    if (totalSegments < 1) {
      totalSegments = 1;
    }
    let arcAngleIncrement = totalArc / totalSegments;
    arcAngleIncrement *= cw ? -1 : 1;

    const zDist = state.z - (z || state.z);
    const zStep = zDist / totalSegments;

    // get points for the arc
    let px = state.x;
    let py = state.y;
    let pz = state.z;
    // calculate segments
    let currentAngle = arcCurrentAngle;

    for (let moveIdx = 0; moveIdx < totalSegments - 1; moveIdx++) {
      currentAngle += arcAngleIncrement;
      px = centerX + arcRadius * Math.cos(currentAngle);
      py = centerY + arcRadius * Math.sin(currentAngle);
      pz += zStep;
      lastPath.addPoint(px, py, pz);
    }

    state.x = x || state.x;
    state.y = y || state.y;
    state.z = z || state.z;

    lastPath.addPoint(state.x, state.y, state.z);
  }

  G3 = this.G2;

  G20(command: GCodeCommand, job: Job): void {
    job.state.units = 'in';
  }

  G21(command: GCodeCommand, job: Job): void {
    job.state.units = 'mm';
  }

  G28(command: GCodeCommand, job: Job): void {
    job.state.x = 0;
    job.state.y = 0;
    job.state.z = 0;
  }

  T0(command: GCodeCommand, job: Job): void {
    job.state.tool = 0;
  }
  T1(command: GCodeCommand, job: Job): void {
    job.state.tool = 1;
  }
  T2(command: GCodeCommand, job: Job): void {
    job.state.tool = 2;
  }
  T3(command: GCodeCommand, job: Job): void {
    job.state.tool = 3;
  }
  T4(command: GCodeCommand, job: Job): void {
    job.state.tool = 4;
  }
  T5(command: GCodeCommand, job: Job): void {
    job.state.tool = 5;
  }
  T6(command: GCodeCommand, job: Job): void {
    job.state.tool = 6;
  }
  T7(command: GCodeCommand, job: Job): void {
    job.state.tool = 7;
  }

  private breakPath(job: Job, newType: PathType): Path {
    const lastPath = new Path(newType, 0.6, 0.2, job.state.tool);
    job.paths.push(lastPath);
    lastPath.addPoint(job.state.x, job.state.y, job.state.z);
    return lastPath;
  }
}
