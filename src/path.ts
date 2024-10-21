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
  public extrusionWidth: number;
  public lineHeight: number;
  public tool: number;
  private _vertices: number[];

  constructor(travelType: PathType, extrusionWidth = 0.6, lineHeight = 0.2, tool = 0) {
    this.travelType = travelType;
    this._vertices = [];
    this.extrusionWidth = extrusionWidth;
    this.lineHeight = lineHeight;
    this.tool = tool;
  }

  get vertices(): number[] {
    return this._vertices;
  }

  addPoint(x: number, y: number, z: number): void {
    this._vertices.push(x, y, z);
  }

  checkLineContinuity(x: number, y: number, z: number): boolean {
    if (this._vertices.length < 3) {
      return false;
    }

    const lastX = this._vertices[this._vertices.length - 3];
    const lastY = this._vertices[this._vertices.length - 2];
    const lastZ = this._vertices[this._vertices.length - 1];

    return x === lastX && y === lastY && z === lastZ;
  }

  path(): Vector3[] {
    const path: Vector3[] = [];

    for (let i = 0; i < this._vertices.length; i += 3) {
      path.push(new Vector3(this._vertices[i], this._vertices[i + 1], this._vertices[i + 2]));
    }
    return path;
  }

  geometry(opts: { extrusionWidthOverride?: number; lineHeightOverride?: number } = {}): BufferGeometry {
    if (this._vertices.length < 3) {
      return new BufferGeometry();
    }

    return new ExtrusionGeometry(
      this.path(),
      opts.extrusionWidthOverride ?? this.extrusionWidth,
      opts.lineHeightOverride ?? this.lineHeight,
      4
    );
  }

  line(): LineSegmentsGeometry {
    const lineVertices = [];
    for (let i = 0; i < this._vertices.length - 3; i += 3) {
      lineVertices.push(this._vertices[i], this._vertices[i + 1], this._vertices[i + 2]);
      lineVertices.push(this._vertices[i + 3], this._vertices[i + 4], this._vertices[i + 5]);
    }

    return new LineSegmentsGeometry().setPositions(lineVertices);
  }

  hasVerticalMoves(): boolean {
    return this.vertices.some((_, i, arr) => i % 3 === 2 && arr[i] !== arr[2]);
  }
}
