import { test, describe, expect, vi } from 'vitest';
import { BuildVolume } from '../build-volume';
import { AxesHelper } from 'three';
import { Grid } from '../helpers/grid';
import { LineBox } from '../helpers/line-box';

describe('BuildVolume', () => {
  test('it has a default color', () => {
    const buildVolume = new BuildVolume();

    expect(buildVolume.color).toEqual(0x888888);
  });

  test('it has size properties', () => {
    const buildVolume = new BuildVolume(10, 20, 30);

    expect(buildVolume.x).toEqual(10);
    expect(buildVolume.y).toEqual(20);
    expect(buildVolume.z).toEqual(30);
  });

  describe('.createAxes', () => {
    test('it creates an AxesHelper', () => {
      const buildVolume = new BuildVolume(10, 20, 30);

      const axes = buildVolume.createAxes();

      expect(axes).toBeDefined();
      expect(axes).toBeInstanceOf(AxesHelper);
    });

    test('it scales the axes', () => {
      const buildVolume = new BuildVolume(10, 20, 30);

      const axes = buildVolume.createAxes();

      expect(axes.scale).toEqual({ x: 1, y: 1, z: -1 });
    });

    test('it positions the axes', () => {
      const buildVolume = new BuildVolume(10, 20, 30);

      const axes = buildVolume.createAxes();

      expect(axes.position).toEqual({ x: -5, y: 0, z: 10 });
    });
  });

  describe('.createGrid', () => {
    test('it creates a Grid', () => {
      const buildVolume = new BuildVolume(10, 20, 30);

      const grid = buildVolume.createGrid();

      expect(grid).toBeDefined();
      expect(grid).toBeInstanceOf(Grid);
    });
  });

  describe('.createGroup', () => {
    test('it creates a group for all the objects', () => {
      const buildVolume = new BuildVolume(10, 20, 30);

      const group = buildVolume.createGroup();

      expect(group).toBeDefined();
      expect(group.children.length).toEqual(3);

      expect(group.children[0]).toBeInstanceOf(LineBox);
      expect(group.children[1]).toBeInstanceOf(Grid);
      expect(group.children[2]).toBeInstanceOf(AxesHelper);
    });
  });
});
