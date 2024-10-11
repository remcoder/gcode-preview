import { test, expect } from 'vitest';
import { GCodeCommand } from '../gcode-parser';
import { Interpreter } from '../interpreter';
import { Job } from '../job';

test('.execute returns a stateful job', () => {
  const command = new GCodeCommand('G0 X1 Y2 Z3', 'g0', { x: 1, y: 2, z: 3 });
  const interpreter = new Interpreter();

  const result = interpreter.execute([command]);

  expect(result).not.toBeNull();
  expect(result).toBeInstanceOf(Job);
  expect(result.state.x).toEqual(1);
  expect(result.state.y).toEqual(2);
  expect(result.state.z).toEqual(3);
});

test('.execute ignores unknown commands', () => {
  const command = new GCodeCommand('G42', 'g42', {});
  const interpreter = new Interpreter();

  const result = interpreter.execute([command]);

  expect(result).not.toBeNull();
  expect(result).toBeInstanceOf(Job);
  expect(result.state.x).toEqual(0);
  expect(result.state.y).toEqual(0);
  expect(result.state.z).toEqual(0);
});

test('.execute runs multiple commands', () => {
  const command1 = new GCodeCommand('G0 X1 Y2 Z3', 'g0', { x: 1, y: 2, z: 3 });
  const command2 = new GCodeCommand('G0 X4 Y5 Z6', 'g0', { x: 4, y: 5, z: 6 });
  const interpreter = new Interpreter();

  const result = interpreter.execute([command1, command2, command1, command2]);

  expect(result).not.toBeNull();
  expect(result).toBeInstanceOf(Job);
  expect(result.state.x).toEqual(4);
  expect(result.state.y).toEqual(5);
  expect(result.state.z).toEqual(6);
});

test('.execute runs on an existing job', () => {
  const job = new Job();
  const command = new GCodeCommand('G0 X1 Y2 Z3', 'g0', { x: 1, y: 2, z: 3 });
  const interpreter = new Interpreter();

  const result = interpreter.execute([command], job);

  expect(result).toEqual(job);
  expect(result.state.x).toEqual(1);
  expect(result.state.y).toEqual(2);
  expect(result.state.z).toEqual(3);
});
