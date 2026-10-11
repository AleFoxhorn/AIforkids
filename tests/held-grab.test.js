import test from 'node:test';
import assert from 'node:assert/strict';
import { heldGrab, solveGrab } from '../src/grab.js';
test('holding a layer preserves pointer ownership and can continue dragging',()=>{
  const piece={x:.3,y:.4,rotation:0,sprite:{x:100,y:100}};
  const q={x:110,y:110};
  const held=heldGrab({pointerId:17},piece,q,2,{width:100,height:60});
  assert.equal(held.pointerId,17);assert.equal(held.piece,piece);assert.equal(held.originIndex,2);
  const moved=solveGrab({x:140,y:140},held.last,held.local,piece.rotation,held.inertia);
  assert.equal(moved.x,130);assert.equal(moved.y,130);
});
