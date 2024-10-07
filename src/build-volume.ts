import { Grid } from './helpers/grid-helper';
import { AxesHelper, Group, Vector3 } from 'three';
import { LineBox } from './helpers/line-box';
import { type Disposable } from './helpers/three-utils';

export class BuildVolume {
  x: number;
  y: number;
  z: number;
  color: number;
  private disposables: Disposable[] = [];

  constructor(x: number, y: number, z: number, color: number = 0x888888) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.color = color;
  }

  createAxes(): AxesHelper {
    const axes = new AxesHelper(10);

    const scale = new Vector3(1, 1, 1);
    scale.z *= -1;

    axes.scale.multiply(scale);
    axes.position.setZ(this.y / 2);
    axes.position.setX(-this.x / 2);

    return axes;
  }

  createGrid(): Grid {
    return new Grid(this.x, 10, this.y, 10, this.color);
  }

  createLineBox(): LineBox {
    return new LineBox(this.x, this.z, this.y, this.color);
  }

  createGroup(): Group {
    const group = new Group();
    group.add(this.createLineBox());
    group.add(this.createGrid());
    group.add(this.createAxes());

    return group;
  }

  dispose(): void {
    this.disposables.forEach((disposable) => disposable.dispose());
  }
}
