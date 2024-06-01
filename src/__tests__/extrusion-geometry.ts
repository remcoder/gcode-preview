import { test, expect } from 'vitest';
import { BufferGeometry, Vector3 } from 'three';
import { ExtrusionGeometry } from '../extrusion-geometry';

test('ExtrusionGeometry should be defined', () => {
  expect(ExtrusionGeometry).toBeDefined();
});

test('ExtrusionGeometry extends BufferGeometry', () => {
  const geometry = new ExtrusionGeometry();
  expect(geometry).toBeInstanceOf(ExtrusionGeometry);
  expect(geometry).toBeInstanceOf(BufferGeometry);
});

test('ExtrusionGeometry should be of type "ExtrusionGeometry"', () => {
  const geometry = new ExtrusionGeometry();
  expect(geometry.type).toBe('ExtrusionGeometry');
});

test('ExtrusionGeometry should have default values', () => {
  const geometry = new ExtrusionGeometry();
  expect(geometry.parameters.points).toEqual([new Vector3()]);
  expect(geometry.parameters.lineWidth).toBe(0.6);
  expect(geometry.parameters.lineHeight).toBe(0.2);
  expect(geometry.parameters.radialSegments).toBe(8);
});

test('ExtrusionGeometry constructor should set values', () => {
  const points = [new Vector3(), new Vector3()];
  const lineWidth = 0.5;
  const lineHeight = 0.3;
  const radialSegments = 10;
  const geometry = new ExtrusionGeometry(points, lineWidth, lineHeight, radialSegments);
  expect(geometry.parameters.points).toEqual(points);
  expect(geometry.parameters.lineWidth).toBe(lineWidth);
  expect(geometry.parameters.lineHeight).toBe(lineHeight);
  expect(geometry.parameters.radialSegments).toBe(radialSegments);
});

test('ExtrusionGeometry should set normals, uvs and indices', () => {
  const points = [new Vector3(0, 0, 0), new Vector3(1, 0, 0)];
  const geometry = new ExtrusionGeometry(points);
  expect(geometry.attributes.position).toBeDefined();
  expect(geometry.attributes.normal).toBeDefined();
  expect(geometry.attributes.uv).toBeDefined();
});

test('ExtrusionGeometry should generate buffer data', () => {
  const points = [new Vector3(0, 0, 0), new Vector3(1, 0, 0)];
  const geometry = new ExtrusionGeometry(points);
  expect(geometry.attributes.position.array.length).toBeGreaterThan(0);
  expect(geometry.attributes.normal.array.length).toBeGreaterThan(0);
  expect(geometry.attributes.uv.array.length).toBeGreaterThan(0);
});
