import { Parser } from "../gcode-parser";

test('a single gcode cmd should result in 1 layer with 1 command', () => {
  const parser = new Parser();
  const gcode =`G1 X0 Y0 Z1`;
  const parsed = parser.parseGcode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(1)
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(1);
});

test('2 horizontal moves should result in 1 layer with 2 commands', () => {
  const parser = new Parser();
  const gcode =`G1 X0 Y0 Z1
  G1 X10 Y10 Z1`;
  const parsed = parser.parseGcode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(1)
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(2);
});

test('2 vertical moves should result in 2 layers with 1 command', () => {
  const parser = new Parser();
  const gcode =`G1 X0 Y0 Z1
  G1 X0 Y0 Z2`;
  const parsed = parser.parseGcode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(2)
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(1);
});
