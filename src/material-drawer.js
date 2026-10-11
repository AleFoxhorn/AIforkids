export function setupDrawer({tray,panel,expand,onAdd,onDrop,onActivity}) {
  let gesture, timer, ghost;
  function clean() {clearTimeout(timer);ghost?.remove();ghost=null;gesture=null;}
  expand.onclick=()=>{
    panel.classList.toggle('expanded');
    const open=panel.classList.contains('expanded');expand.setAttribute('aria-expanded',String(open));
    expand.setAttribute('aria-label',open?'收起素材库':'展开素材库');expand.title=open?'收起素材库':'展开素材库';
  };
  tray.addEventListener('click',e=>{e.preventDefault();if(e.detail===0){const tile=e.target.closest('[data-material]');if(tile)onAdd(tile.dataset.material);}});
  tray.addEventListener('pointerdown',e=>{
    if(e.button!==0||gesture)return;const tile=e.target.closest('[data-material]');if(!tile)return;
    e.preventDefault();onActivity();tray.setPointerCapture(e.pointerId);
    gesture={id:e.pointerId,tile,x:e.clientX,y:e.clientY,left:tray.scrollLeft,top:tray.scrollTop,moved:false,drag:false};
    timer=setTimeout(()=>{if(!gesture||gesture.moved)return;gesture.drag=true;
      ghost=tile.querySelector('img').cloneNode();ghost.className='material-drag-ghost';document.body.append(ghost);
      ghost.style.left=`${gesture.x}px`;ghost.style.top=`${gesture.y}px`;
    },420);
  });
  tray.addEventListener('pointermove',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
    if(Math.hypot(dx,dy)>5){gesture.moved=true;clearTimeout(timer);}
    if(gesture.drag){ghost.style.left=`${e.clientX}px`;ghost.style.top=`${e.clientY}px`;}
    else if(gesture.moved){if(panel.classList.contains('expanded'))tray.scrollTop=gesture.top-dy;else tray.scrollLeft=gesture.left-dx;}
  });
  tray.addEventListener('pointerup',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const g=gesture;clean();if(tray.hasPointerCapture(e.pointerId))tray.releasePointerCapture(e.pointerId);
    if(g.drag)onDrop(g.tile.dataset.material,e);else if(!g.moved)onAdd(g.tile.dataset.material);
  });
  tray.addEventListener('pointercancel',clean);tray.addEventListener('lostpointercapture',clean);
  return clean;
}
