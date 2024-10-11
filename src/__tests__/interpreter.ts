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

test('.G0 moves the state to the new position', () => {
  const command = new GCodeCommand('G0 X1 Y2 Z3', 'g0', { x: 1, y: 2, z: 3 });
  const interpreter = new Interpreter();

  const job = interpreter.execute([command]);

  expect(job.state.x).toEqual(1);
  expect(job.state.y).toEqual(2);
  expect(job.state.z).toEqual(3);
});

test('.G0 starts a path if the job has none', () => {
  const command = new GCodeCommand('G0 X1 Y2', 'g0', { x: 1, y: 2 });
  const interpreter = new Interpreter();

  const job = interpreter.execute([command]);

  expect(job.paths.length).toEqual(1);
  expect(job.paths[0].vertices.length).toEqual(6);
  expect(job.paths[0].vertices[0]).toEqual(0);
  expect(job.paths[0].vertices[1]).toEqual(0);
  expect(job.paths[0].vertices[2]).toEqual(0);
});

test('.G0 starts a path if the job has none, starting at the job current state', () => {
  const command = new GCodeCommand('G0 X1 Y2', 'g0', { x: 1, y: 2 });
  const interpreter = new Interpreter();
  const job = new Job();
  job.state.x = 3;
  job.state.y = 4;

  interpreter.execute([command], job);

  expect(job.paths.length).toEqual(1);
  expect(job.paths[0].vertices.length).toEqual(6);
  expect(job.paths[0].vertices[0]).toEqual(3);
  expect(job.paths[0].vertices[1]).toEqual(4);
  expect(job.paths[0].vertices[2]).toEqual(0);
});

test('.G0 continues the path if the job has one', () => {
  const command1 = new GCodeCommand('G0 X1 Y2', 'g0', { x: 1, y: 2 });
  const command2 = new GCodeCommand('G0 X3 Y4', 'g0', { x: 3, y: 4 });
  const interpreter = new Interpreter();

  const job = interpreter.execute([command1, command2]);

  expect(job.paths.length).toEqual(1);
  expect(job.paths[0].vertices.length).toEqual(9);
  expect(job.paths[0].vertices[6]).toEqual(3);
  expect(job.paths[0].vertices[7]).toEqual(4);
  expect(job.paths[0].vertices[8]).toEqual(0);
});

test(".G0 assigns the travel type if there's no extrusion", () => {
  const command = new GCodeCommand('G0 X1 Y2', 'g0', { x: 1, y: 2 });
  const interpreter = new Interpreter();

  const job = interpreter.execute([command]);

  expect(job.paths.length).toEqual(1);
  expect(job.paths[0].travelType).toEqual('Travel');
});

test(".G0 assigns the extrusion type if there's extrusion", () => {
  const command = new GCodeCommand('G1 X1 Y2 E3', 'g1', { x: 1, y: 2, e: 3 });
  const interpreter = new Interpreter();

  const job = interpreter.execute([command]);

  expect(job.paths.length).toEqual(1);
  expect(job.paths[0].travelType).toEqual('Extrusion');
});

test('.G0 starts a new path if the travel type changes from Travel to Extrusion', () => {
  const command1 = new GCodeCommand('G0 X1 Y2', 'g0', { x: 1, y: 2 });
  const command2 = new GCodeCommand('G1 X3 Y4 E5', 'g1', { x: 3, y: 4, e: 5 });
  const interpreter = new Interpreter();

  const job = interpreter.execute([command1, command2]);

  expect(job.paths.length).toEqual(2);
  expect(job.paths[0].travelType).toEqual('Travel');
  expect(job.paths[1].travelType).toEqual('Extrusion');
});

test('.G0 starts a new path if the travel type changes from Extrusion to Travel', () => {
  const command1 = new GCodeCommand('G1 X1 Y2 E3', 'g1', { x: 1, y: 2, e: 3 });
  const command2 = new GCodeCommand('G0 X3 Y4', 'g0', { x: 3, y: 4 });
  const interpreter = new Interpreter();

  const job = interpreter.execute([command1, command2]);

  expect(job.paths.length).toEqual(2);
  expect(job.paths[0].travelType).toEqual('Extrusion');
  expect(job.paths[1].travelType).toEqual('Travel');
});

test('.G1 is an alias to .G0', () => {
  const interpreter = new Interpreter();

  expect(interpreter.G1).toEqual(interpreter.G0);
});
