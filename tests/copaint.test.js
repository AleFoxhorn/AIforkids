import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changesBetween, applyChanges } from '../src/collage-history.js';
import { planCompanion, animateCompanion } from '../src/copaint.js';

const materials = [
  { id:'leaf-long', width:195, crop:{w:195,h:40} },
  { id:'leaf-round', width:140, crop:{w:140,h:150} },
  { id:'button', width:75, crop:{w:75,h:75} },
];
test('plan is three new leaf/leaf/button objects, with no mutation of child work', () => {
  const child = [{ id:'child',materialId:'leaf-round',x:.5,y:.5,rotation:0,scale:1 }];
  const before = structuredClone(child), plan = planCompanion(child, materials, 1.5);
  assert.deepEqual(child,before);
  assert.deepEqual(plan.map(p=>p.materialId),['leaf-long','leaf-round','button']);
  assert.equal(plan.length,3);
  assert.equal(planCompanion([{...child[0],scale:100}], materials,1.5),null);
});
test('undo/redo one AI batch preserves concurrent child movement and additions', () => {
  const initial = { id:'child',x:.1 }, moved = { ...initial,x:.8 };
  const ai = [{id:'ai1',x:.3},{id:'ai2',x:.4},{id:'ai3',x:.5}];
  const changes = changesBetween([initial],[initial,...ai]);
  const after = [moved,...ai,{id:'newChild',x:.9}];
  const undone = applyChanges(after,changes,true);
  assert.deepEqual(undone,[moved,{id:'newChild',x:.9}]);
  assert.deepEqual(applyChanges(undone,changes,false),after);
});
test('undo a child edit leaves AI additions untouched', () => {
  const a = {id:'child',x:.1}, b = {...a,x:.8}, ai={id:'ai',x:.3};
  const edit = changesBetween([a],[b]);
  assert.deepEqual(applyChanges([b,ai],edit,true),[a,ai]);
});
function harness() {
  const queue = new Map(); let id=0;
  const seen = { created:[],settled:[],done:[] };
  const options = {
    plan:[{x:1},{x:2},{x:3}], frame:fn=>{queue.set(++id,fn);return id;}, cancel:id=>queue.delete(id),
    canPlace:()=>true, create:p=>{seen.created.push(p);return p;},move:()=>{},
    settled:p=>seen.settled.push(p),done:reason=>seen.done.push(reason),
  };
  const step=now=>{const callbacks=[...queue.values()];queue.clear();callbacks.forEach(fn=>fn(now));};
  return {options,seen,step,queue};
}
test('animation sequentially places exactly three items and completes once', () => {
  const h=harness(); animateCompanion(h.options);
  [0,2100,2200,4300,4400,6500,9000].forEach(h.step);
  assert.equal(h.seen.created.length,3);assert.equal(h.seen.settled.length,3);
  assert.deepEqual(h.seen.done,['complete']);assert.equal(h.queue.size,0);
});
test('stop settles current item and never spawns later items', () => {
  const h=harness(),stop=animateCompanion(h.options);
  h.step(0);h.step(900);stop();stop();h.step(99999);
  assert.equal(h.seen.created.length,1);assert.equal(h.seen.settled.length,1);
  assert.deepEqual(h.seen.done,[]);assert.equal(h.queue.size,0);
});
test('newly occupied target stops safely and reduced motion retains sequential stages', () => {
  const h=harness(); let clear=true;
  animateCompanion({...h.options,reducedMotion:true,canPlace:()=>clear});
  h.step(0);h.step(650);assert.equal(h.seen.settled.length,1);
  clear=false;h.step(700);h.step(9999);
  assert.equal(h.seen.created.length,1);assert.deepEqual(h.seen.done,['occupied']);
});
