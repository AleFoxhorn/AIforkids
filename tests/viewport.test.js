import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toWorld,toScreen,zoomAt,flightPose} from '../src/viewport.js';
import {changesBetween,applyChanges} from '../src/collage-history.js';
test('pointer anchored zoom preserves world point and inverse hit coordinates',()=>{
  let v={scale:1,x:0,y:0};const anchor={x:420,y:220},w=toWorld(anchor,v);
  for(const f of [1.2,1.8,.7,.3,10]){v=zoomAt(v,anchor,f);const p=toScreen(w,v);assert.ok(Math.hypot(p.x-anchor.x,p.y-anchor.y)<1e-8);assert.deepEqual(toWorld(p,v),w);}
  assert.ok(v.scale<=4&&v.scale>=.4);
});
test('drag out and back still records layer-only change; undo does not revert unrelated edits',()=>{
  const leaf={id:'leaf',x:.5,scale:1},button={id:'button',x:.5,scale:1};
  const before=[leaf,button],after=[button,leaf];const delta=changesBetween(before,after);
  assert.equal(delta.length,2);
  assert.deepEqual(applyChanges([{...button,scale:2},leaf],delta,true),[leaf,{...button,scale:2}]);
  assert.deepEqual(applyChanges(before,delta,false),after);
});
test('reorder plus movement undo and redo restore positions and stack',()=>{
  const a={id:'a',x:.1},b={id:'b',x:.2},c={id:'c',x:.3};const before=[a,b,c],after=[b,c,{...a,x:.8}];
  const delta=changesBetween(before,after);assert.deepEqual(applyChanges(after,delta,true),before);assert.deepEqual(applyChanges(before,delta,false),after);
});
test('flight begins at the source and lands exactly at its final pose',()=>{
  const a={x:.02,y:.4},b={x:.7,y:.5,rotation:.2};
  const start=flightPose(a,b,0),end=flightPose(a,b,1);
  assert.equal(start.x,a.x);assert.equal(start.y,a.y);assert.equal(end.x,b.x);assert.equal(end.y,b.y);assert.equal(end.rotation,b.rotation);assert.equal(end.scale,1);
  assert.ok(flightPose(a,b,.5).y<.5);
});
