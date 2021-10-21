/* eslint-env jest */

import { Parser } from "../gcode-parser";

test('all input should be preserved', () => {
  const parser = new Parser();
  const gcode =`G1 X0 Y0 Z1 E1`;
  const parsed = parser.parseGCode(gcode);
  expect(parsed).not.toBeNull();
  const unparsed = parser.lines.join('\n');
  expect(unparsed).toEqual(gcode);
});

test('multiple lines should be preserved', () => {
  const parser = new Parser();
  const gcode =`G1 X0 Y0 Z1 E1\nG1 X10 Y10 E10`;
  const parsed = parser.parseGCode(gcode);
  expect(parsed).not.toBeNull();
  const unparsed = parser.lines.join('\n');
  expect(unparsed).toEqual(gcode);
});

test('comments should be preserved', () => {
  const parser = new Parser();
  const gcode =`G1 X0 Y0 Z1 E1; this is a comment`;
  const parsed = parser.parseGCode(gcode);
  expect(parsed).not.toBeNull();
  const unparsed = parser.lines.join('\n');
  expect(unparsed).toEqual(gcode);
});