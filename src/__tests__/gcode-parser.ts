import { Parser } from "../gcode-parser";

test('a single gcode cmd should result in 1 layer', () => {
  const parser = new Parser();
  const gcode =`G1 X0 Y0 Z1`;
  const parsed = parser.parseGcode(gcode);
  expect(parsed).not.toBeNull();
  expect(parsed.layers).not.toBeNull();
  expect(parsed.layers.length).toEqual(1)
  expect(parsed.layers[0].commands).not.toBeNull();
  expect(parsed.layers[0].commands.length).toEqual(1);
});
