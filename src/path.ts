/* eslint-disable no-unused-vars */
import { BufferGeometry, Vector3 } from 'three';
import { ExtrusionGeometry } from './extrusion-geometry';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

export enum PathType {
  Travel = 'Travel',
  Extrusion = 'Extrusion'
}

export class Path {
  public travelType: PathType;
  public vertices: number[];
  extrusionWidth: number;
  lineHeight: number;
  tool: number;

  constructor(travelType: PathType, extrusionWidth = 0.6, lineHeight = 0.2, tool = 0) {
    this.travelType = travelType;
    this.vertices = [];
    this.extrusionWidth = extrusionWidth;
    this.lineHeight = lineHeight;
    this.tool = tool;
  }

  addPoint(x: number, y: number, z: number): void {
    this.vertices.push(x, y, z);
  }

  checkLineContinuity(x: number, y: number, z: number): boolean {
    if (this.vertices.length < 3) {
      return false;
    }

    const lastX = this.vertices[this.vertices.length - 3];
    const lastY = this.vertices[this.vertices.length - 2];
    const lastZ = this.vertices[this.vertices.length - 1];

    return x === lastX && y === lastY && z === lastZ;
  }

  path(): Vector3[] {
    const path: Vector3[] = [];

    for (let i = 0; i < this.vertices.length; i += 3) {
      path.push(new Vector3(this.vertices[i], this.vertices[i + 1], this.vertices[i + 2]));
    }
    return path;
  }

  geometry(): BufferGeometry {
    if (this.vertices.length < 3) {
      return new BufferGeometry();
    }

    return new ExtrusionGeometry(this.path(), this.extrusionWidth, this.lineHeight, 4);
  }

  line(): LineSegmentsGeometry {
    return new LineSegmentsGeometry().setPositions(this.vertices);
  }
}
