import { GridHelper } from './helpers/grid-helper';
import { LineBox } from './helpers/line-box';
import { Object3D, AxesHelper, Group, Vector3 } from 'three';

export class BuildVolume {
  x: number;
  y: number;
  z: number;
  color: number;

  constructor(x: number, y: number, z: number, color: number = 0x888888) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.color = color;
  }

  axesHelper(): Object3D {
    const axes = new AxesHelper(10);

    const scale = new Vector3(1, 1, 1);
    // scale.x *= -1;
    scale.z *= -1;

    axes.scale.multiply(scale);
    axes.position.setZ(this.y / 2);
    axes.position.setX(-this.x / 2);

    return axes;
  }

  gridHelper(): Object3D {
    return new GridHelper(this.x, 10, this.y, 10, this.color);
  }

  volume(): Object3D {
    return LineBox(this.x, this.z, this.y, this.color);
  }

  group(): Group {
    const group = new Group();
    group.add(this.volume());
    group.add(this.gridHelper());
    group.add(this.axesHelper());
    return group;
  }
}
