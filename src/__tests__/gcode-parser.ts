import { test, expect } from 'vitest';
import { GCodeCommand, MoveCommand, Parser, SelectToolCommand } from '../gcode-parser';

test('a single extrusion cmd should result in 1 layer with 1 command', () => {
  const parser = new Parser(0);
  const gcode = `G1 X0 Y0 Z1 E1`;
  const parsed = parser.parseGCode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(1);
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(1);
});

test('a gcode cmd w/o extrusion should not result in a layer', () => {
  const parser = new Parser(0);
  const gcode = `G1 X0 Y0 Z1`;
  const parsed = parser.parseGCode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(0);
});

test('a gcode cmd with 0 extrusion should not result in a layer', () => {
  const parser = new Parser(0);
  const gcode = `G1 X0 Y0 Z1 E0`;
  const parsed = parser.parseGCode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(0);
});

test('2 horizontal extrusion moves should result in 1 layer with 2 commands', () => {
  const parser = new Parser(0);
  const gcode = `G1 X0 Y0 Z1 E1
  G1 X10 Y10 Z1 E2`;
  const parsed = parser.parseGCode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(1);
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(2);
});

test('2 vertical extrusion moves should result in 2 layers with 1 command', () => {
  const parser = new Parser(0);
  const gcode = `G1 X0 Y0 Z1 E1
  G1 X0 Y0 Z2 E2`;
  const parsed = parser.parseGCode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(2);
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(1);
});

test('2 vertical extrusion moves in consecutive gcode chunks should result in 2 layers with 1 command', () => {
  const parser = new Parser(0);
  const gcode1 = 'G1 X0 Y0 Z1 E1';
  const gcode2 = 'G1 X0 Y0 Z2 E2';
  const parsed = parser.parseGCode(gcode1);
  parser.parseGCode(gcode2);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(2);
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(1);
});

test('2 vertical extrusion moves in consecutive gcode chunks as string arrays should result in 2 layers with 1 command', () => {
  const parser = new Parser(0);
  const gcode1 = ['G1 X0 Y0 Z1 E1'];
  const gcode2 = ['G1 X0 Y0 Z2 E2'];
  const parsed = parser.parseGCode(gcode1);
  parser.parseGCode(gcode2);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(2);
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(1);
});

test('2 extrusion moves with a z difference below the threshold should result in only 1 layer', () => {
  const threshold = 1;
  const parser = new Parser(threshold);
  const gcode = `G1 X0 Y0 Z1 E1
  G1 X10 Y10 Z1.5 E2`;
  const parsed = parser.parseGCode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(1);
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(2);
});

test('2 extrusion moves with a z difference above the threshold should result in 2 layers', () => {
  const threshold = 1;
  const parser = new Parser(threshold);
  const gcode = `G1 X0 Y0 Z1 E1
  G1 X10 Y10 Z3 E2`;
  const parsed = parser.parseGCode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(2);
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(1);
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(1);
});

test('2 extrusion moves with a z diff exactly at the threshold should result in 1 layer', () => {
  const threshold = 1;
  const parser = new Parser(threshold);
  const gcode = `G1 X0 Y0 Z1 E1
  G1 X10 Y10 Z2 E2`;
  const parsed = parser.parseGCode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(1);
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(2);
});

test('Layers should have calculated heights', () => {
  const threshold = 0.05;
  const parser = new Parser(threshold);
  const gcode = `G0 X0 Y0 Z0.1 E1
  G1 X10 Y10 Z0.2 E2
  G1 X20 Y20 Z0.3 E3
  G1 X30 Y30 Z0.5 E4
  G1 X40 Y40 Z0.8 E5
  `;
  const parsed = parser.parseGCode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(5);
  expect(parsed.layers[0].height).toEqual(expect.closeTo(0.1, 3));
  expect(parsed.layers[1].height).toEqual(expect.closeTo(0.1, 3));
  expect(parsed.layers[2].height).toEqual(expect.closeTo(0.1, 3));
  expect(parsed.layers[3].height).toEqual(expect.closeTo(0.2, 3));
});

test('T0 command should result in a tool change to tool with index 0', () => {
  const parser = new Parser(0);
  const gcode = `G1 X0 Y0 Z1 E1
  T0`;
  const parsed = parser.parseGCode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(1);
  expect(parsed.layers[0].commands).not.toBeNull();

  const cmd = parsed.layers[0].commands[1] as SelectToolCommand;
  expect(cmd.gcode).toEqual('t0');
  expect(cmd.toolIndex).toEqual(0);
});

test('T1 command should result in a tool change to tool with index 0', () => {
  const parser = new Parser(0);
  const gcode = `G1 X0 Y0 Z1 E1
  T1`;
  const parsed = parser.parseGCode(gcode);
  const cmd = parsed.layers[0].commands[1] as SelectToolCommand;
  expect(cmd.gcode).toEqual('t1');
  expect(cmd.toolIndex).toEqual(1);
});

test('T2 command should result in a tool change to tool with index 0', () => {
  const parser = new Parser(0);
  const gcode = `G1 X0 Y0 Z1 E1
  T2`;
  const parsed = parser.parseGCode(gcode);
  const cmd = parsed.layers[0].commands[1] as SelectToolCommand;
  expect(cmd.gcode).toEqual('t2');
  expect(cmd.toolIndex).toEqual(2);
});

test('T3 command should result in a tool change to tool with index 0', () => {
  const parser = new Parser(0);
  const gcode = `G1 X0 Y0 Z1 E1
  T3`;
  const parsed = parser.parseGCode(gcode);
  const cmd = parsed.layers[0].commands[1] as SelectToolCommand;
  expect(cmd.gcode).toEqual('t3');
  expect(cmd.toolIndex).toEqual(3);
});

// repeat fot T4 .. T7
test('T4 command should result in a tool change to tool with index 0', () => {
  const parser = new Parser(0);
  const gcode = `G1 X0 Y0 Z1 E1
  T4`;
  const parsed = parser.parseGCode(gcode);
  const cmd = parsed.layers[0].commands[1] as SelectToolCommand;
  expect(cmd.gcode).toEqual('t4');
  expect(cmd.toolIndex).toEqual(4);
});

test('T5 command should result in a tool change to tool with index 0', () => {
  const parser = new Parser(0);
  const gcode = `G1 X0 Y0 Z1 E1
  T5`;
  const parsed = parser.parseGCode(gcode);
  const cmd = parsed.layers[0].commands[1] as SelectToolCommand;
  expect(cmd.gcode).toEqual('t5');
  expect(cmd.toolIndex).toEqual(5);
});

test('T6 command should result in a tool change to tool with index 0', () => {
  const parser = new Parser(0);
  const gcode = `G1 X0 Y0 Z1 E1
  T6`;
  const parsed = parser.parseGCode(gcode);
  const cmd = parsed.layers[0].commands[1] as SelectToolCommand;
  expect(cmd.gcode).toEqual('t6');
  expect(cmd.toolIndex).toEqual(6);
});

test('T7 command should result in a tool change to tool with index 0', () => {
  const parser = new Parser(0);
  const gcode = `G1 X0 Y0 Z1 E1
  T7`;
  const parsed = parser.parseGCode(gcode);
  const cmd = parsed.layers[0].commands[1] as SelectToolCommand;
  expect(cmd.gcode).toEqual('t7');
  expect(cmd.toolIndex).toEqual(7);
});

test('gcode commands with spaces between letters and numbers should be parsed correctly', () => {
  const parser = new Parser(0);
  const gcode = `G 1 E 42 X 42`;
  const parsed = parser.parseGCode(gcode);
  const cmd = parsed.layers[0].commands[0] as MoveCommand;
  expect(cmd.gcode).toEqual('g1');
  expect(cmd.params.x).toEqual(42);
});

// test that a line withouth a gcode command results in a command with empty string gcode
test('gcode commands without gcode should result in a command with empty string gcode', () => {
  const parser = new Parser(0);
  const gcode = ` ; comment`;
  const cmd = parser.parseCommand(gcode) as GCodeCommand;
  expect(cmd.gcode).toEqual('');
});
