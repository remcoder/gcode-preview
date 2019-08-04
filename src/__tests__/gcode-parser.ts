import { Parser } from "../gcode-parser";

test('parse simple gcode', () => {
  const parser = new Parser();
  const gcode =`G0 X0 Y0`;
  const parsed = parser.parseGcode(gcode);
  expect(parsed).not.toBeNull();
});
