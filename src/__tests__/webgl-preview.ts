/* eslint-disable @typescript-eslint/no-empty-function */

import { test, expect } from 'vitest';

import { State, WebGLPreview } from '../webgl-preview';
import { GCodeCommand } from '../gcode-parser';

test('in gcode x,y,z params should update the state', () => {
  const mock = createMockPreview();
  mock.layers[0].commands.push(new GCodeCommand('', 'g0', { x: 1, y: 1, z: 1, e: 1 }));
  const layerIndex = 0;
  WebGLPreview.prototype.renderLayer.call(mock, layerIndex);
  expect(mock.state.x).toBe(1);
  expect(mock.state.y).toBe(1);
  expect(mock.state.z).toBe(1);
});

test('x,y,z params can go to 0', () => {
  const mock = createMockPreview();
  mock.layers[0].commands.push(new GCodeCommand('', 'g0', { x: 0, y: 0, z: 0, e: 0 }));
  const layerIndex = 0;
  WebGLPreview.prototype.renderLayer.call(mock, layerIndex);
  expect(mock.state.x).toBe(0);
  expect(mock.state.y).toBe(0);
  expect(mock.state.z).toBe(0);
});

function createMockPreview() {
  return {
    state: { x: 0, y: 0, z: 0, r: 0, e: 0, i: 0, j: 0 },

    minLayerIndex: 0,
    maxLayerIndex: Infinity,
    layers: [
      {
        commands: [] as GCodeCommand[]
      }
    ],
    setInches: () => {
      // console.log('setInches');
    },
    nonTravelmoves: [],
    renderExtrusion: () => {
      // console.log('renderExtrusion');
    },
    renderTravel: () => {},
    addArcSegment: () => {
      // console.log('addArcSegment');
    },
    addLineSegment: () => {
      // console.log('addLineSegment');
    },
    doRenderExtrusion: () => {
      // console.log('doRenderExtrusion');
    }
  };
}
