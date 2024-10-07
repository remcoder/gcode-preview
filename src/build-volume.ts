import { GridHelper } from './grid-helper';
import { LineBox } from './line-box';
import { Object3D, AxesHelper } from 'three';

export class BuildVolume {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  axesHelper(): Object3D {
    return new AxesHelper(Math.max(this.x / 2, this.y / 2) + 20);
  }

  gridHelper(): Object3D {
    return new GridHelper(this.x, 10, this.y, 10);
  }

  geometry(): Object3D {
    const geometryBox = LineBox(this.x, this.z, this.y, 0x888888);

    geometryBox.position.setY(this.z / 2);
    return geometryBox;
  }
}
