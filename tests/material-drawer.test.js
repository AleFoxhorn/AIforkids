import test from 'node:test';
import assert from 'node:assert/strict';
import {setupDrawer} from '../src/material-drawer.js';
test('expanded drawer uses contract icon and restores expand icon when reduced',()=>{
 const classes=new Set(),panel={classList:{remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)}};
 const expand={dataset:{},setAttribute(k,v){this[k]=v;}},tray=new EventTarget();
 const clean=setupDrawer({tray,panel,expand,onActivity(){}});
 expand.onclick();assert.equal(expand.dataset.icon,'contract');assert.equal(expand['aria-expanded'],'true');assert.equal(expand['aria-label'],'缩小素材库');
 expand.onclick();assert.equal(expand.dataset.icon,'expand');assert.equal(expand['aria-expanded'],'false');clean();
});
test('short press hints, moving scrolls, and held material drops at pointer',async t=>{
 const classes=new Set(),panel={classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)}};
 const tray=new EventTarget();Object.assign(tray,{scrollLeft:0,scrollTop:0,setPointerCapture(){},hasPointerCapture(){return true},releasePointerCapture(){}});
 const ghost={style:{},remove(){}},tile={dataset:{material:'leaf'},querySelector:()=>({cloneNode:()=>ghost})};
 const original=globalThis.document;globalThis.document={body:{append(){}}};t.after(()=>{globalThis.document=original;});
 let hints=0,added=0,drops=[],removed=[];const targetClasses=new Set();
 const removeTarget={getBoundingClientRect:()=>({left:200,right:244,top:40,bottom:84,width:44,height:44}),classList:{toggle:(x,on)=>on?targetClasses.add(x):targetClasses.delete(x),remove:x=>targetClasses.delete(x)}};
 const expand={dataset:{},setAttribute(k,v){this[k]=v;}};
 const cleanup=setupDrawer({tray,panel,expand,removeTarget,onRemove:id=>removed.push(id),onAdd:()=>added++,onHint:()=>hints++,onDrop:(id,e)=>drops.push([id,e.clientX,e.clientY]),onActivity(){}});t.after(cleanup);
 function fire(type,x,y){const e=new Event(type);Object.defineProperties(e,{button:{value:0},pointerId:{value:1},clientX:{value:x},clientY:{value:y},target:{value:{closest:()=>tile}}});tray.dispatchEvent(e);}
 fire('pointerdown',100,100);fire('pointerup',100,100);assert.equal(hints,1);assert.equal(added,0);assert.equal(drops.length,0);
 fire('pointerdown',100,100);fire('pointermove',70,100);fire('pointerup',70,100);assert.equal(tray.scrollLeft,30);assert.equal(drops.length,0);
 classes.add('expanded');fire('pointerdown',100,100);await new Promise(r=>setTimeout(r,450));assert.equal(classes.has('expanded'),false);assert.equal(expand.dataset.icon,'expand');fire('pointermove',350,220);fire('pointerup',350,220);
 assert.deepEqual(drops,[['leaf',350,220]]);assert.equal(classes.has('dragging-material'),false);
 // Crossing the bin without a hold is scrolling, never deletion.
 fire('pointerdown',100,100);fire('pointermove',220,60);fire('pointerup',220,60);assert.deepEqual(removed,[]);
 fire('pointerdown',100,100);await new Promise(r=>setTimeout(r,450));fire('pointermove',220,60);assert.equal(targetClasses.has('drop-ready'),true);fire('pointerup',220,60);
 assert.deepEqual(removed,['leaf']);assert.equal(drops.length,1);assert.equal(targetClasses.size,0);
 // Cancellation over the bin must preserve the material and clear feedback.
 fire('pointerdown',100,100);await new Promise(r=>setTimeout(r,450));fire('pointermove',220,60);fire('pointercancel',220,60);fire('pointerup',220,60);
 assert.deepEqual(removed,['leaf']);assert.equal(targetClasses.size,0);
});
