// A fixed local grab point coupled to angular inertia; no gravity or inter-object collision.
export function localGrab(pointer, center, angle) {
  const x = pointer.x - center.x, y = pointer.y - center.y;
  return { x: x * Math.cos(angle) + y * Math.sin(angle), y: -x * Math.sin(angle) + y * Math.cos(angle) };
}
export function solveGrab(pointer, previousPointer, local, angle, inertia) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const rx = local.x * cos - local.y * sin, ry = local.x * sin + local.y * cos;
  const dx = pointer.x - previousPointer.x, dy = pointer.y - previousPointer.y;
  const torque = (rx * dy - ry * dx) / (rx * rx + ry * ry + inertia);
  const next = angle + Math.max(-.16, Math.min(.16, torque * .8));
  return { angle: next, x: pointer.x - (local.x * Math.cos(next) - local.y * Math.sin(next)), y: pointer.y - (local.x * Math.sin(next) + local.y * Math.cos(next)) };
}
