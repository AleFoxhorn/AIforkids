import {setIcon} from './icons.js';
export function setupDrawer({tray,panel,expand,onAdd,onDrop,onActivity,onHint,onRelease,onRemove,removeTarget}) {
  let gesture, timer, ghost;
  function setExpanded(open){panel.classList.toggle('expanded',open);expand.setAttribute('aria-expanded',String(open));setIcon(expand,open?'contract':'expand');expand.setAttribute('aria-label',open?'缩小素材库':'展开素材库');expand.title=open?'缩小素材库':'展开素材库';}
  function overRemove(e){if(!removeTarget)return false;const r=removeTarget.getBoundingClientRect();return r.width>0&&r.height>0&&e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;}
  function clean() {clearTimeout(timer);ghost?.remove();ghost=null;gesture=null;panel.classList.remove('dragging-material');removeTarget?.classList.remove('drop-ready');}
  expand.onclick=()=>{
    clean();onActivity();
    setExpanded(!panel.classList.contains('expanded'));
    tray.scrollLeft=0;tray.scrollTop=0;
  };
  tray.addEventListener('click',e=>{e.preventDefault();const tile=e.target.closest('[data-material]');if(!tile)return;if(e.detail===0)onAdd(tile.dataset.material);});
  tray.addEventListener('pointerdown',e=>{
    if(e.button!==0||gesture)return;const tile=e.target.closest('[data-material]');if(!tile)return;
    e.preventDefault();onActivity();tray.setPointerCapture(e.pointerId);
    gesture={id:e.pointerId,tile,x:e.clientX,y:e.clientY,left:tray.scrollLeft,top:tray.scrollTop,moved:false,drag:false};
    timer=setTimeout(()=>{if(!gesture||gesture.moved)return;gesture.drag=true;
      panel.classList.add('dragging-material');
      ghost=tile.querySelector('img').cloneNode();ghost.className='material-drag-ghost';document.body.append(ghost);
      ghost.style.left=`${gesture.x}px`;ghost.style.top=`${gesture.y}px`;
      if(panel.classList.contains('expanded')){setExpanded(false);tray.scrollTop=0;}
    },420);
  });
  tray.addEventListener('pointermove',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
    if(Math.hypot(dx,dy)>5){gesture.moved=true;clearTimeout(timer);}
    if(gesture.drag){ghost.style.left=`${e.clientX}px`;ghost.style.top=`${e.clientY}px`;removeTarget?.classList.toggle('drop-ready',overRemove(e));}
    else if(gesture.moved){if(panel.classList.contains('expanded'))tray.scrollTop=gesture.top-dy;else tray.scrollLeft=gesture.left-dx;}
  });
  tray.addEventListener('pointerup',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const g=gesture;clean();if(tray.hasPointerCapture(e.pointerId))tray.releasePointerCapture(e.pointerId);
    if(g.drag){if(overRemove(e))onRemove?.(g.tile.dataset.material);else onDrop(g.tile.dataset.material,e);}else if(!g.moved)onHint?.();
    onRelease?.();
  });
  tray.addEventListener('pointercancel',clean);tray.addEventListener('lostpointercapture',clean);
  return clean;
}
