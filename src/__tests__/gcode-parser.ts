import { Parser } from "../gcode-parser";

test('a single extrusion cmd should result in 1 layer with 1 command', () => {
  const parser = new Parser();
  const gcode =`G1 X0 Y0 Z1 E1`;
  const parsed = parser.parseGcode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(1)
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(1);
});

test('a gcode cmd w/o extrusion should not result in a layer', () => {
  const parser = new Parser();
  const gcode =`G1 X0 Y0 Z1`;
  const parsed = parser.parseGcode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(0)
});

test('a gcode cmd with 0 extrusion should not result in a layer', () => {
  const parser = new Parser();
  const gcode =`G1 X0 Y0 Z1 E0`;
  const parsed = parser.parseGcode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(0)
});

test('2 horizontal extrusion moves should result in 1 layer with 2 commands', () => {
  const parser = new Parser();
  const gcode =`G1 X0 Y0 Z1 E1
  G1 X10 Y10 Z1 E2`;
  const parsed = parser.parseGcode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(1)
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(2);
});

test('2 vertical extrusion moves should result in 2 layers with 1 command', () => {
  const parser = new Parser();
  const gcode =`G1 X0 Y0 Z1 E1
  G1 X0 Y0 Z2 E2`;
  const parsed = parser.parseGcode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(2)
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(1);
});

test('2 vertical extrusion moves in consecutive gcode chunks should result in 2 layers with 1 command', () => {
  const parser = new Parser();
  const gcode1 = 'G1 X0 Y0 Z1 E1';
  const gcode2 = 'G1 X0 Y0 Z2 E2';
  const parsed = parser.parseGcode(gcode1);
  parser.parseGcode(gcode2);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(2)
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(1);
});

test('2 vertical extrusion moves in consecutive gcode chunks as string arrays should result in 2 layers with 1 command', () => {
  const parser = new Parser();
  const gcode1 = ['G1 X0 Y0 Z1 E1'];
  const gcode2 = ['G1 X0 Y0 Z2 E2'];
  const parsed = parser.parseGcode(gcode1);
  parser.parseGcode(gcode2);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(2)
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(1);
});
