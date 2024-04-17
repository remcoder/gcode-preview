/* eslint-disable @typescript-eslint/no-empty-function */

import { test, expect, vi, assert } from 'vitest';

import { WebGLPreview } from '../webgl-preview';
import { GCodeCommand } from '../gcode-parser';

test('in gcode x,y,z params should update the state', () => {
  const mock = createMockPreview();
  mock.layers[0].commands.push(new GCodeCommand('', 'g0', { x: 1, y: 1, z: 1, e: 1 }, undefined));
  const layerIndex = 0;
  WebGLPreview.prototype.renderLayer.call(mock, layerIndex);
  expect(mock.state.x).toBe(1);
  expect(mock.state.y).toBe(1);
  expect(mock.state.z).toBe(1);
});

test('x,y,z params can go to 0', () => {
  const mock = createMockPreview();
  mock.layers[0].commands.push(new GCodeCommand('', 'g0', { x: 0, y: 0, z: 0, e: 0 }, undefined));
  const layerIndex = 0;
  WebGLPreview.prototype.renderLayer.call(mock, layerIndex);
  expect(mock.state.x).toBe(0);
  expect(mock.state.y).toBe(0);
  expect(mock.state.z).toBe(0);
});

// add a test for destroying the preview which should cancel the render loop.
test('destroying the preview should dispose renderer and controls', async () => {
  const mock = createMockPreview();

  WebGLPreview.prototype.animate.call(mock);
  // wait 50ms
  await new Promise((resolve) => setTimeout(resolve, 50));

  // destroy the preview
  WebGLPreview.prototype.dispose.call(mock);

  expect(mock.renderer.dispose).toHaveBeenCalledTimes(1);
  expect(mock.controls.dispose).toHaveBeenCalledTimes(1);

  expect(mock.disposables.length).toBe(0);
  // all disposables should be disposed
  mock.disposables.forEach((d) => {
    expect(d.dispose).toHaveBeenCalledTimes(1);
  });
});

// add a test for destroying the preview which should cancel the render loop.
test('destroying the preview should call cancelAnimation', async () => {
  const mock = createMockPreview();

  WebGLPreview.prototype.animate.call(mock);

  // wait 50ms
  await new Promise((resolve) => setTimeout(resolve, 50));
  let callCount = mock.renderer.render.mock.calls.length;
  assert(callCount > 2, 'callCount > 2');
  callCount = mock.controls.update.mock.calls.length;
  assert(callCount > 2, 'callCount > 2');

  // destroy the preview
  WebGLPreview.prototype.dispose.call(mock);
  expect(mock.cancelAnimation).toHaveBeenCalledTimes(1);
});

test('cancelAnimation should cancel the render loop', async () => {
  const mock = createMockPreview();

  WebGLPreview.prototype.animate.call(mock);

  // wait 50ms
  await new Promise((resolve) => setTimeout(resolve, 50));

  mock.cancelAnimation();

  await new Promise((resolve) => setTimeout(resolve, 50));

  const callCountAfterDestroy = mock.renderer.render.mock.calls.length;
  await new Promise((resolve) => setTimeout(resolve, 50));
  const callCountAfterDestroy2 = mock.renderer.render.mock.calls.length;

  // expect no more calls to render
  expect(callCountAfterDestroy).toBe(callCountAfterDestroy2);
});

function createMockPreview() {
  return {
    state: { x: 0, y: 0, z: 0, r: 0, e: 0, i: 0, j: 0 },
    minLayerIndex: 0,
    maxLayerIndex: Infinity,
    disposables: [
      {
        dispose: vi.fn(() => {
          // console.log('dispose');
        })
      }
    ],
    layers: [
      {
        commands: [] as GCodeCommand[]
      }
    ],
    scene: {},
    camera: {},
    renderer: {
      render: vi.fn(() => {}),
      dispose: vi.fn(() => {})
    },
    controls: {
      update: vi.fn(() => {}),
      dispose: vi.fn(() => {})
    },
    setInches: () => {},
    nonTravelmoves: [],
    renderExtrusion: () => {},
    renderTravel: () => {},
    addArcSegment: () => {},
    addLineSegment: () => {},
    doRenderExtrusion: () => {},
    render: vi.fn(() => {}),
    animate: vi.fn(WebGLPreview.prototype.animate),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    cancelAnimation: vi.fn(WebGLPreview.prototype.cancelAnimation)
  };
}
