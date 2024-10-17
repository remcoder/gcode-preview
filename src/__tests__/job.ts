import { test, expect, describe } from 'vitest';
import { Job, State, LayersIndexer } from '../job';
import { PathType, Path } from '../path';

test('it has an initial state', () => {
  const job = new Job();

  expect(job.state).toEqual(State.initial);
});

describe('.isPlanar', () => {
  test('returns true if all extrusions are on the same plane', () => {
    const job = new Job();

    append_path(job, PathType.Extrusion, [
      [0, 0, 0],
      [1, 2, 0]
    ]);
    append_path(job, PathType.Extrusion, [
      [1, 2, 0],
      [5, 6, 0]
    ]);

    expect(job.isPlanar()).toEqual(true);
  });

  test('returns false if any extrusions are on a different plane', () => {
    const job = new Job();

    append_path(job, PathType.Extrusion, [
      [0, 0, 0],
      [1, 2, 0]
    ]);
    append_path(job, PathType.Extrusion, [
      [1, 2, 0],
      [5, 6, 1]
    ]);

    expect(job.isPlanar()).toEqual(false);
  });

  test('ignores travel paths', () => {
    const job = new Job();

    append_path(job, PathType.Extrusion, [
      [0, 0, 0],
      [1, 2, 0]
    ]);
    append_path(job, PathType.Travel, [
      [5, 6, 0],
      [5, 6, 1],
      [1, 2, 0]
    ]);
    append_path(job, PathType.Extrusion, [
      [1, 2, 0],
      [5, 6, 0]
    ]);

    expect(job.isPlanar()).toEqual(true);
  });
});

describe('.layers', () => {
  test('returns null if the job is not planar', () => {
    const job = new Job();

    append_path(job, PathType.Extrusion, [
      [0, 0, 0],
      [1, 2, 0]
    ]);
    append_path(job, PathType.Extrusion, [
      [5, 6, 0],
      [5, 6, 1]
    ]);

    expect(job.layers).toEqual(null);
  });

  test('paths without z changes are on the same layer', () => {
    const job = new Job();

    append_path(job, PathType.Extrusion, [
      [0, 0, 0],
      [1, 2, 0]
    ]);
    append_path(job, PathType.Travel, [
      [5, 6, 0],
      [5, 6, 0]
    ]);

    const layers = job.layers;

    expect(layers).not.toBeNull();
    expect(layers).toBeInstanceOf(Array);
    expect(layers?.length).toEqual(1);
    expect(layers?.[0].length).toEqual(2);
  });

  test('travel paths moving z above the default tolerance create a new layer', () => {
    const job = new Job();

    append_path(job, PathType.Extrusion, [
      [0, 0, 0],
      [1, 2, 0]
    ]);
    append_path(job, PathType.Travel, [
      [5, 6, 0],
      [5, 6, LayersIndexer.DEFAULT_TOLERANCE + 0.01]
    ]);

    const layers = job.layers;

    expect(layers).not.toBeNull();
    expect(layers).toBeInstanceOf(Array);
    expect(layers?.length).toEqual(2);
    expect(layers?.[0].length).toEqual(1);
    expect(layers?.[1].length).toEqual(1);
  });

  test('travel paths moving z under the default tolerance are on the same layer', () => {
    const job = new Job();

    append_path(job, PathType.Extrusion, [
      [0, 0, 0],
      [1, 2, 0]
    ]);
    append_path(job, PathType.Travel, [
      [5, 6, 0],
      [5, 6, LayersIndexer.DEFAULT_TOLERANCE - 0.01]
    ]);

    const layers = job.layers;

    expect(layers).not.toBeNull();
    expect(layers).toBeInstanceOf(Array);
    expect(layers?.length).toEqual(1);
    expect(layers?.[0].length).toEqual(2);
  });

  test('Tolerance can be set', () => {
    const job = new Job({ minLayerThreshold: 0.1 });

    append_path(job, PathType.Extrusion, [
      [0, 0, 0],
      [1, 2, 0]
    ]);
    append_path(job, PathType.Travel, [
      [5, 6, 0],
      [5, 6, 0.09]
    ]);

    const layers = job.layers;

    expect(layers).not.toBeNull();
    expect(layers).toBeInstanceOf(Array);
    expect(layers?.length).toEqual(1);
    expect(layers?.[0].length).toEqual(2);
  });

  test('multiple travels in a row are on the same layer', () => {
    const job = new Job();

    append_path(job, PathType.Extrusion, [
      [0, 0, 0],
      [1, 2, 0]
    ]);
    append_path(job, PathType.Travel, [
      [5, 6, 0],
      [5, 6, 2]
    ]);
    append_path(job, PathType.Travel, [
      [5, 6, 2],
      [5, 6, 0]
    ]);
    append_path(job, PathType.Travel, [
      [5, 6, 0],
      [5, 6, 2]
    ]);

    const layers = job.layers;

    expect(layers).not.toBeNull();
    expect(layers).toBeInstanceOf(Array);
    expect(layers?.length).toEqual(2);
    expect(layers?.[0].length).toEqual(1);
    expect(layers?.[1].length).toEqual(3);
  });

  test('extrusions after travels are on the same layer', () => {
    const job = new Job();

    append_path(job, PathType.Extrusion, [
      [0, 0, 0],
      [1, 2, 0]
    ]);
    append_path(job, PathType.Travel, [
      [5, 6, 0],
      [5, 6, 2]
    ]);
    append_path(job, PathType.Travel, [
      [5, 6, 2],
      [5, 6, 0]
    ]);
    append_path(job, PathType.Travel, [
      [5, 6, 0],
      [5, 6, 2]
    ]);
    append_path(job, PathType.Extrusion, [
      [5, 6, 2],
      [5, 6, 2]
    ]);

    const layers = job.layers;

    expect(layers).not.toBeNull();
    expect(layers).toBeInstanceOf(Array);
    expect(layers?.length).toEqual(2);
    expect(layers?.[0].length).toEqual(1);
    expect(layers?.[1].length).toEqual(4);
  });
});

describe('.extrusions', () => {
  test('returns all extrusion paths', () => {
    const job = new Job();

    append_path(job, PathType.Extrusion, [
      [0, 0, 0],
      [1, 2, 0]
    ]);
    append_path(job, PathType.Travel, [
      [5, 6, 0],
      [5, 6, 0]
    ]);
    append_path(job, PathType.Extrusion, [
      [1, 2, 0],
      [5, 6, 0]
    ]);

    const extrusions = job.extrusions;

    expect(extrusions).not.toBeNull();
    expect(extrusions).toBeInstanceOf(Array);
    expect(extrusions.length).toEqual(2);
    extrusions.forEach((path) => {
      expect(path.travelType).toEqual(PathType.Extrusion);
    });
  });
});

describe('.travels', () => {
  test('returns all travel paths', () => {
    const job = new Job();

    append_path(job, PathType.Extrusion, [
      [0, 0, 0],
      [1, 2, 0]
    ]);
    append_path(job, PathType.Travel, [
      [5, 6, 0],
      [5, 6, 0]
    ]);
    append_path(job, PathType.Extrusion, [
      [1, 2, 0],
      [5, 6, 0]
    ]);
    append_path(job, PathType.Travel, [
      [5, 6, 0],
      [5, 6, 0]
    ]);

    const travels = job.travels;

    expect(travels).not.toBeNull();
    expect(travels).toBeInstanceOf(Array);
    expect(travels.length).toEqual(2);
    travels.forEach((path) => {
      expect(path.travelType).toEqual(PathType.Travel);
    });
  });
});

function append_path(job, travelType, points) {
  const path = new Path(travelType, 0.6, 0.2, job.state.tool);
  points.forEach((point: [number, number, number]) => path.addPoint(...point));
  job.addPath(path);
}
