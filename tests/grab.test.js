import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localGrab, solveGrab } from '../src/grab.js';

test('a grabbed leaf corner stays at the pointer during a curved drag', () => {
  let angle = .4, center = { x: 300, y: 200 }, previous = { x: 380, y: 230 };
  const local = localGrab(previous, center, angle);
  for (let i = 0; i < 200; i++) {
    const pointer = { x: 380 + i * .9, y: 230 + Math.sin(i / 25) * 70 };
    const result = solveGrab(pointer, previous, local, angle, 2500);
    const contact = { x: result.x + local.x * Math.cos(result.angle) - local.y * Math.sin(result.angle), y: result.y + local.x * Math.sin(result.angle) + local.y * Math.cos(result.angle) };
    assert.ok(Math.hypot(contact.x - pointer.x, contact.y - pointer.y) < 1e-9);
    angle = result.angle; center = result; previous = pointer;
  }
  assert.notEqual(angle, .4);
});
test('grabbing the center translates without arbitrary rotation', () => {
  const result = solveGrab({ x: 70, y: 90 }, { x: 0, y: 0 }, { x: 0, y: 0 }, .7, 2000);
  assert.deepEqual(result, { angle: .7, x: 70, y: 90 });
});
