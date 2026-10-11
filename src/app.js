import { Application, Assets, Sprite, Texture, Rectangle, BlurFilter } from 'pixi.js';
import { icons } from './icons.js';
import { localGrab, solveGrab } from './grab.js';
import { createTwigCursor } from './twig-cursor.js';
import { frameReady, drawFrame, drawArtRecess } from './frame.js';
import { artworks } from './artwork-store.js';
import { changesBetween, applyChanges } from './collage-history.js';
import { CO_PAINT_PROMPT, planCompanion, bounds, animateCompanion } from './copaint.js';
import { toWorld, toScreen, zoomAt, flightPose } from './viewport.js';
import { setupDrawer } from './material-drawer.js';
import './copaint.css';
import './imports.css';
import './tablet.css';
import './twig-cursor.css';
import './interaction-v2.css';

const $ = id => document.getElementById(id);
const board = $('board');
const twigCursor = createTwigCursor(board);
const aiCursor = createTwigCursor(board, true);
const names = ['leaf-long', 'leaf-round', 'twig', 'button', 'stone', 'shell'];
const widths = [195, 140, 205, 75, 105, 105];
const materials = names.map((id, i) => ({ id, label: ['长叶片', '圆叶片', '树枝', '纽扣', '石头', '贝壳'][i], width: widths[i], src: new URL(`../assets/real/${id}.png`, import.meta.url).href }));
const KEY = 'wonderpatch-v1-library', IDLE = 6500, COOLDOWN = 60000;
let app, library, current, selected, drag, idleTimer, holdTimer, cycle, frameBlob;
let pieces = [], operations = 0, lastOperation = 0, frameType = 'oak', exportVersion = 0;
let importedArtwork = null;
let aiRun = null;
let view = {scale:1,x:0,y:0}, zoomSession=null, zoomTimer, flights=null, drawerCleanup;
const histories = new Map();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fresh = () => ({ id: crypto.randomUUID(), boardName: '我的新画板', pieces: [], memories: [], nextProposalAt: 0, proposalIndex: 0, frame: 'oak' });
const screenPoint = e => { const r = board.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const point = e => toWorld(screenPoint(e),view);
const material = p => materials.find(m => m.id === p.materialId);
const scaleOf = p => p.scale * material(p).width / material(p).texture.width * board.clientWidth / 900;
const snapshot = () => pieces.map(({ id, materialId, x, y, rotation, scale }) => ({ id, materialId, x, y, rotation, scale }));
const history = () => { if (!histories.has(current.id)) histories.set(current.id, { past: [], future: [] }); return histories.get(current.id); };

function flash(message) {
  $('boardStatus').textContent = message;
  clearTimeout(flash.timer); flash.timer = setTimeout(() => $('boardStatus').textContent = '', 3500);
}
function readLibrary() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved?.boards?.length) return saved;
    const b = fresh(), legacy = JSON.parse(localStorage.getItem('wonderpatch-v1-board') || 'null');
    if (legacy) { b.boardName = legacy.boardName || b.boardName; b.pieces = legacy.pieces || []; if (legacy.memory && !legacy.memory.startsWith('我还在')) b.memories.push(legacy.memory); }
    return { activeId: b.id, boards: [b] };
  } catch { flash('保存的数据无法读取'); return { boards: [fresh()] }; }
}
function persist() {
  current.pieces = snapshot(); library.activeId = current.id;
  try { localStorage.setItem(KEY, JSON.stringify(library)); $('saveState').textContent = '已自动保存'; $('saveIndicator').title = '已自动保存'; return true; }
  catch { $('saveState').textContent = '保存失败'; flash('浏览器存储已满，请下载作品'); return false; }
}
function updateHistoryButtons() { $('undoButton').disabled = !history().past.length; $('redoButton').disabled = !history().future.length; }
function checkpoint() {
  flushZoom(); settleFlights();
  const h = history(), excluded = new Set(aiRun?.ids || []);
  h.pending = { before: snapshot().filter(p => !excluded.has(p.id)), excluded };
}
function recordChanges(changes) {
  if (!changes.length) return;
  const h = history(); h.past.push(changes); if (h.past.length > 30) h.past.shift(); h.future = []; updateHistoryButtons();
}
function commitCheckpoint() {
  const h = history(); if (!h.pending) return;
  const { before, excluded } = h.pending; h.pending = null;
  // Include IDs added later by an in-flight AI batch in this exclusion as well.
  aiRun?.ids.forEach(id => excluded.add(id));
  recordChanges(changesBetween(before, snapshot().filter(p => !excluded.has(p.id))));
}
function travel(back) {
  flushZoom(); settleFlights(); finishDrag(false); stopAI();
  const h = history(), from = back ? h.past : h.future, to = back ? h.future : h.past;
  if (!from.length) return;
  const changes = from.pop(), target = applyChanges(snapshot(), changes, back); to.push(changes);
  destroyPieces(); target.forEach(p => render({ ...p })); resetProposal(); persist(); updateHistoryButtons();
}
function header() {
  $('boardName').textContent = current.boardName;
  $('boardPicker').replaceChildren(...library.boards.map(b => { const o = document.createElement('option'); o.value = b.id; o.textContent = b.boardName; return o; }));
  $('boardPicker').value = current.id; $('memoryText').textContent = current.memories.length ? current.memories.join('；') : '还没有设定'; updateHistoryButtons();
}
function resetProposal() { clearTimeout(idleTimer); operations = 0; $('proposalCard').classList.add('hidden'); $('feedbackDialog').close(); }
function destroyPieces() { flushZoom(); settleFlights(); finishDrag(true); stopAI(); pieces.forEach(p => { p.el.remove(); p.glow.destroy(); p.sprite.destroy(); p.shadow.destroy(); }); pieces = []; selected = null; cycle = null; $('deletePiece').disabled = true; $('boardEmpty').style.display = 'flex'; }
function openBoard(id) {
  destroyPieces(); resetProposal(); current = library.boards.find(b => b.id === id) || library.boards[0];
  view={scale:1,x:0,y:0}; applyView();
  current.memories ||= []; current.nextProposalAt ||= 0; current.proposalIndex ||= 0;
  current.pieces.filter(p => materials.some(m => m.id === p.materialId) && [p.x, p.y, p.rotation, p.scale].every(Number.isFinite)).forEach(p => render({ ...p })); header();
}
function sync(p) {
  const s = scaleOf(p), m = material(p);
  p.sprite.position.set(p.x * board.clientWidth, p.y * board.clientHeight); p.sprite.rotation = p.rotation; p.sprite.scale.set(s);
  const lift = (drag?.piece === p && drag.moved) || aiRun?.active === p ? 6 : 2;
  p.shadow.position.set(p.sprite.x + lift * .5, p.sprite.y + lift); p.shadow.rotation = p.rotation; p.shadow.scale.set(s); p.shadow.alpha = drag?.piece === p ? .13 : .07;
  p.glow.position.copyFrom(p.sprite.position); p.glow.rotation=p.rotation; p.glow.scale.set(s*1.075);
  p.glow.visible=selected===p && !(drag?.piece===p&&drag.moved);
  const screen=toScreen(p.sprite.position,view);
  p.el.style.width = `${m.texture.width * s * view.scale}px`; p.el.style.height = `${m.texture.height * s * view.scale}px`;
  p.el.style.left = `${screen.x}px`; p.el.style.top = `${screen.y}px`; p.el.style.transform = `translate(-50%,-50%) rotate(${p.rotation}rad)`;
  Object.assign(p.el.dataset,{selected:String(selected===p),material:p.materialId,scale:String(p.scale),x:String(p.x),y:String(p.y),layer:String(pieces.indexOf(p)),glow:String(p.glow.visible)});
}
function render(p) {
  const m = material(p); p.shadow = new Sprite(m.texture); p.shadow.anchor.set(.5); p.shadow.tint = 0x26301c;
  p.glow = new Sprite(m.haloTexture); p.glow.anchor.set(.5); p.glow.tint=0xdbeab3; p.glow.alpha=.9; p.glow.filters=[new BlurFilter({strength:1.5,quality:2})];
  p.sprite = new Sprite(m.texture); p.sprite.anchor.set(.5); app.stage.addChild(p.shadow, p.glow, p.sprite);
  p.el = document.createElement('div'); p.el.className = 'canvas-piece'; p.el.dataset.pieceId = p.id;
  board.append(p.el); pieces.push(p); sync(p); $('boardEmpty').style.display = 'none';
}
function add(materialId, x, y, record = true) {
  if (!materials.some(m => m.id === materialId)) return;
  if (record) checkpoint();
  render({ id: crypto.randomUUID(), materialId, x: clamp(x, .08, .92), y: clamp(y, .08, .92), rotation: (Math.random() - .5) * .4, scale: 1 });
  if (record) completed();
}
function select(p) { flushZoom(); const old=selected; selected = p; if(old)sync(old);if(p)sync(p); $('deletePiece').disabled = !p; }
function applyView() {
  if(!app)return;
  app.stage.scale.set(view.scale);app.stage.position.set(view.x,view.y);
  board.dataset.viewScale=String(view.scale);board.dataset.viewX=String(view.x);board.dataset.viewY=String(view.y);
  $('fitView').textContent=`${Math.round(view.scale*100)}%`;pieces.forEach(sync);
}
function flushZoom() {
  clearTimeout(zoomTimer);if(!zoomSession)return;
  const edited=zoomSession.edited;zoomSession=null;$('gestureStatus').classList.add('hidden');
  if(edited){select(null);completed();}
}
function resizeTarget(factor,anchor) {
  if(drag)return;
  clearTimeout(idleTimer);settleFlights();
  if(selected&&aiRun?.ids.has(selected.id))stopAI();
  if(!zoomSession){if(selected)checkpoint();zoomSession={edited:!!selected};}
  if(selected){selected.scale=clamp(selected.scale*factor,.2,3);sync(selected);}
  else {view=zoomAt(view,anchor,factor);applyView();}
  $('gestureStatus').textContent=`${selected?'素材':'画布'} ${Math.round((selected?selected.scale:view.scale)*100)}%`;
  $('gestureStatus').classList.remove('hidden');
  clearTimeout(zoomTimer);zoomTimer=setTimeout(flushZoom,220);
}
function setupViewport() {
  const device=document.querySelector('.device');
  device.addEventListener('wheel',e=>{
    if(e.target.closest('dialog'))return;
    e.preventDefault();clearTimeout(idleTimer);lastOperation=Date.now();
    const unit=e.deltaMode===1?16:e.deltaMode===2?board.clientHeight:1;
    if(e.ctrlKey||e.metaKey){resizeTarget(Math.exp(-clamp(e.deltaY*unit,-120,120)*.008),screenPoint(e));return;}
    const tray=e.target.closest('#materialTray');
    if(tray){if($('materialPanel').classList.contains('expanded'))tray.scrollTop+=e.deltaY*unit;else tray.scrollLeft+=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*unit;return;}
    if(e.target.closest('.popover'))return;
    if(drag)return;flushZoom();
    view.x=clamp(view.x-e.deltaX*unit,-board.clientWidth*view.scale,board.clientWidth);
    view.y=clamp(view.y-e.deltaY*unit,-board.clientHeight*view.scale,board.clientHeight);applyView();
  },{passive:false});
  let gestureScale=1;
  device.addEventListener('gesturestart',e=>{if(e.target.closest('dialog'))return;e.preventDefault();gestureScale=1;},{passive:false});
  device.addEventListener('gesturechange',e=>{if(e.target.closest('dialog'))return;e.preventDefault();resizeTarget(e.scale/gestureScale,screenPoint(e));gestureScale=e.scale;},{passive:false});
  device.addEventListener('gestureend',e=>{e.preventDefault();flushZoom();},{passive:false});
  $('fitView').onclick=()=>{flushZoom();view={scale:1,x:0,y:0};applyView();};
  $('zoomIn').onclick=()=>resizeTarget(1.2,{x:board.clientWidth/2,y:board.clientHeight/2});
  $('zoomOut').onclick=()=>resizeTarget(1/1.2,{x:board.clientWidth/2,y:board.clientHeight/2});
}
function settleFlights() {
  if(!flights)return;const run=flights;flights=null;cancelAnimationFrame(run.handle);
  $('scatterMaterials').disabled=false;
  const all=snapshot();recordChanges(changesBetween([],all.filter(p=>run.ids.has(p.id))).map(c=>({...c,afterIndex:all.findIndex(p=>p.id===c.after.id)})));
  operations++;lastOperation=Date.now();persist();schedule();
}
function scatter() {
  if(flights)return;flushZoom();finishDrag(false);stopAI();resetProposal();closePopovers();
  const r=$('scatterMaterials').getBoundingClientRect(),q=point({clientX:r.x+r.width/2,clientY:r.y+r.height/2});
  const center=toWorld({x:board.clientWidth/2,y:board.clientHeight/2},view);
  const pool=[...materials];for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  const run={ids:new Set(),items:[],handle:0,start:performance.now()};flights=run;$('scatterMaterials').disabled=true;
  pool.slice(0,3).forEach((m,i)=>{
    const end={x:clamp(center.x/board.clientWidth+(i-1)*.19/view.scale,.1,.9),y:clamp(center.y/board.clientHeight+(Math.random()-.5)*.22/view.scale,.12,.88),rotation:(Math.random()-.5)*.5};
    const start={x:q.x/board.clientWidth,y:q.y/board.clientHeight};
    const p={id:crypto.randomUUID(),materialId:m.id,...flightPose(start,end,0),scale:.28};run.ids.add(p.id);render(p);run.items.push({p,start,end});
  });
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tick(now){if(flights!==run)return;let done=true;
    run.items.forEach(({p,start,end},i)=>{const t=clamp((now-run.start-i*100)/(reduced?120:680),0,1);Object.assign(p,flightPose(start,end,t,reduced));sync(p);if(t<1)done=false;});
    if(done)settleFlights();else run.handle=requestAnimationFrame(tick);
  }
  run.handle=requestAnimationFrame(tick);
}
function reorder() {pieces.forEach(p=>{app.stage.addChild(p.shadow,p.glow,p.sprite);sync(p);});}
function bringToFront(p) {pieces=pieces.filter(item=>item!==p);pieces.push(p);reorder();}
function hitsAt(q) {
  return [...pieces].reverse().filter(p => {
    const m = material(p), s = scaleOf(p), local = localGrab(q, { x: p.sprite.x, y: p.sprite.y }, p.rotation);
    const x = Math.floor(local.x / s + m.crop.w / 2), y = Math.floor(local.y / s + m.crop.h / 2);
    return x >= 0 && y >= 0 && x < m.crop.w && y < m.crop.h && m.pixels[((y + m.crop.y) * m.image.width + x + m.crop.x) * 4 + 3] > 24;
  });
}
function cycleAt(q) {
  const hits = hitsAt(q); if (!hits.length) return;
  if (!cycle || Math.hypot(q.x - cycle.x, q.y - cycle.y) > 12) cycle = { ...q, ids: hits.map(p => p.id), index: 0 };
  cycle.index = (cycle.index + 1) % cycle.ids.length; select(pieces.find(p => p.id === cycle.ids[cycle.index]));
  flash(hits.length > 1 ? `第 ${cycle.index + 1} 层 · 拖动即可` : '只有一件素材');
}
function pointerDown(e) {
  if (e.button !== 0 || drag) return;
  flushZoom(); settleFlights();
  e.preventDefault(); board.focus({ preventScroll: true }); clearTimeout(idleTimer); closePopovers();
  const q = point(e), hits = hitsAt(q);
  if (e.altKey) { cycleAt(q); return; }
  if (!hits.length) { select(null); cycle = null; return; }
  const p = cycle && hits.includes(selected) ? selected : hits[0];
  if (aiRun?.ids.has(p.id)) { stopAI(); flash('你来拼'); }
  select(p);
  const m = material(p), s = scaleOf(p);
  drag = { piece: p, pointerId: e.pointerId, originIndex:pieces.indexOf(p), origin: { x: p.x, y: p.y, rotation: p.rotation }, start: q, last: q, moved: false, local: localGrab(q, { x: p.sprite.x, y: p.sprite.y }, p.rotation), inertia: ((m.crop.w * s) ** 2 + (m.crop.h * s) ** 2) / 12 };
  board.setPointerCapture(e.pointerId);
  holdTimer = setTimeout(() => { if (drag && !drag.moved) { cycleAt(q); drag = null; twigCursor.hide(); if (board.hasPointerCapture(e.pointerId)) board.releasePointerCapture(e.pointerId); } }, 550);
}
function pointerMove(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const q = point(e); if (!drag.moved && Math.hypot(q.x - drag.start.x, q.y - drag.start.y)*view.scale < 4) return;
  clearTimeout(holdTimer); if (!drag.moved) {checkpoint();bringToFront(drag.piece);} drag.moved = true; board.classList.add('is-dragging'); cycle = null;
  q.x = clamp(q.x, 2, board.clientWidth - 2); q.y = clamp(q.y, 2, board.clientHeight - 2);
  twigCursor.show(toScreen(q,view));
  const p = drag.piece, solution = solveGrab(q, drag.last, drag.local, p.rotation, drag.inertia);
  p.x = solution.x / board.clientWidth; p.y = solution.y / board.clientHeight; p.rotation = solution.angle;
  sync(p); drag.last = q;
}
function finishDrag(cancelled) {
  twigCursor.hide();
  clearTimeout(holdTimer); if (!drag) return;
  const active = drag; drag = null; board.classList.remove('is-dragging');
  if (cancelled) { Object.assign(active.piece, active.origin); if (active.moved) {history().pending = null;pieces=pieces.filter(p=>p!==active.piece);pieces.splice(active.originIndex,0,active.piece);reorder();} }
  if (active.moved) select(null);
  sync(active.piece); if (board.hasPointerCapture(active.pointerId)) board.releasePointerCapture(active.pointerId);
  if (active.moved && !cancelled) completed();
}
function completed() { commitCheckpoint(); operations++; lastOperation = Date.now(); persist(); updateHistoryButtons(); schedule(); }
function schedule() {
  clearTimeout(idleTimer);
  if (flights || zoomSession || aiRun || operations < 3 || !pieces.length || !$('proposalCard').classList.contains('hidden') || Date.now() < current.nextProposalAt) return;
  const id = current.id;
  idleTimer = setTimeout(() => {
    if (current.id !== id || drag || document.hidden || document.querySelector('dialog[open]') || !pieces.length || Date.now() - lastOperation < IDLE) return;
    if (aiRun || !planCompanion(pieces, materials, board.clientWidth / board.clientHeight)) return;
    $('proposalText').textContent = CO_PAINT_PROMPT; $('proposalCard').classList.remove('hidden'); operations = 0;
  }, IDLE + 30);
}
function dismiss(message) { current.nextProposalAt = Date.now() + COOLDOWN; current.proposalIndex++; resetProposal(); persist(); flash(message); }
function finishAI(reason = 'stopped') {
  const run = aiRun; if (!run) return;
  aiRun = null; aiCursor.hide(); $('copaintControls').classList.add('hidden');
  run.ids.forEach(id => history().pending?.excluded.add(id));
  const added = snapshot().filter(p => run.ids.has(p.id));
  recordChanges(changesBetween([], added).map(c => ({ ...c, afterIndex: pieces.findIndex(p => p.id === c.after.id) })));
  pieces.filter(p => run.ids.has(p.id)).forEach(sync);
  current.nextProposalAt = Date.now() + COOLDOWN; operations = 0; persist();
  if (reason === 'occupied') flash('这里留给你，我先停下');
  else if (reason === 'complete') flash('拼好了 · 可以继续改，也可以撤销');
}
function stopAI() { if (!aiRun) return; aiRun.cancel?.(); finishAI(); }
function startAI() {
  if (aiRun || $('proposalCard').classList.contains('hidden')) return;
  const aspect = board.clientWidth / board.clientHeight;
  const plan = planCompanion(pieces, materials, aspect);
  if (!plan) { dismiss('暂时没有空位，留给你继续拼'); return; }
  dismiss('你也可以继续拼 · 随时叫停'); closePopovers();
  const run = { ids: new Set(), active: null, cancel: null }; aiRun = run;
  $('copaintControls').classList.remove('hidden');
  run.cancel = animateCompanion({
    plan, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    canPlace(target) {
      const b = bounds(target, materials, aspect);
      return !pieces.filter(p => !run.ids.has(p.id)).some(p => {
        const a = bounds(p, materials, aspect);
        return Math.abs(a.x-b.x) < (a.w+b.w)/2+.01 && Math.abs(a.y-b.y) < (a.h+b.h)/2+.01;
      });
    },
    create(target, index) {
      const p = { ...target, id: crypto.randomUUID() }; run.ids.add(p.id);
      history().pending?.excluded.add(p.id);
      render(p); p.el.dataset.aiPiece = 'true'; run.active = p;
      $('copaintProgress').textContent = `${index + 1} / 3`;
      return p;
    },
    move(p, target, t, reduced) {
      p.x = target.x + (reduced ? 0 : .035*(1-t));
      p.y = target.y - (reduced ? 0 : .1*(1-t));
      p.rotation = target.rotation + (reduced ? 0 : .35*(1-t)); sync(p);
      const offset = material(p).width * p.scale / 900 * board.clientWidth * -.15;
      aiCursor.show(toScreen({ x:p.sprite.x+offset*Math.cos(p.rotation), y:p.sprite.y+offset*Math.sin(p.rotation) },view));
    },
    settled(p) { run.active = null; sync(p); persist(); },
    done: finishAI,
  });
}
function closePopovers() { drawerCleanup?.(); ['materialPanel', 'galleryPanel'].forEach(id => $(id).classList.add('hidden')); $('materialButton').setAttribute('aria-expanded', 'false'); }
function toggle(id) { const wasHidden = $(id).classList.contains('hidden'); closePopovers(); if (wasHidden) $(id).classList.remove('hidden'); $('materialButton').setAttribute('aria-expanded', String(!$('materialPanel').classList.contains('hidden'))); }

const frames = [{ id: 'oak', label: '原木', color: '#b49b78' }, { id: 'chalk', label: '白色', color: '#e5e1d8' }, { id: 'ink', label: '深色', color: '#3b3e38' }, { id: 'none', label: '无框', color: '#f6f5ee' }];
function renderFrame() {
  const canvas = $('framePreview'), border = frameType === 'none' ? 0 : 108;
  const ratio = importedArtwork ? importedArtwork.image.height / importedArtwork.image.width : board.clientHeight / board.clientWidth;
  const artW = Math.max(1, Math.round((1200 - border * 2) / Math.max(1, ratio))), artH = Math.max(1, Math.round(artW * ratio)), W = artW + border * 2;
  canvas.width = W; canvas.height = artH + border * 2;
  const ctx = canvas.getContext('2d');
  if (border) drawFrame(ctx, W, canvas.height, frameType, border);
  ctx.fillStyle = '#f5f4ef'; ctx.fillRect(border, border, artW, artH);
  ctx.save(); ctx.beginPath(); ctx.rect(border, border, artW, artH); ctx.clip();
  if (importedArtwork) ctx.drawImage(importedArtwork.image, border, border, artW, artH);
  else pieces.forEach(p => {
    const m = material(p), w = m.width * p.scale * artW / 900, h = w * m.crop.h / m.crop.w;
    ctx.save(); ctx.translate(border + p.x * artW, border + p.y * artH); ctx.rotate(p.rotation);
    ctx.shadowColor = '#28301e18'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
    ctx.drawImage(m.image, m.crop.x, m.crop.y, m.crop.w, m.crop.h, -w / 2, -h / 2, w, h); ctx.restore();
  }); ctx.restore();
  if (border) drawArtRecess(ctx, W, canvas.height, border);
  $('frameChoices').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.frame === frameType)));
  frameBlob = null; const version = ++exportVersion;
  $('confirmSave').disabled = true; $('shareArtwork').disabled = true;
  canvas.toBlob(blob => { if (version !== exportVersion) return; frameBlob = blob; $('confirmSave').disabled = !blob; $('shareArtwork').disabled = !blob; }, 'image/png');
}
function download() {
  if (!frameBlob) return;
  const a = document.createElement('a'), url = URL.createObjectURL(frameBlob);
  a.href = url; a.download = `${(importedArtwork?.name || current.boardName).replace(/[\\/:*?"<>|]/g, '-')}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
async function saveFramedSource() {
  if (!importedArtwork) { current.frame = frameType; return persist(); }
  try {
    const { image, ...record } = importedArtwork;
    await artworks('put', { ...record, frame: frameType });
    await refreshImportedArtworks(); return true;
  } catch { return false; }
}
async function openImportedArtwork(record) {
  const url = URL.createObjectURL(record.blob), image = new Image();
  try { image.src = url; await image.decode(); }
  finally { URL.revokeObjectURL(url); }
  if (image.width * image.height > 40000000) throw new Error('图片过大');
  flushZoom(); settleFlights(); finishDrag(false); stopAI(); resetProposal(); closePopovers();
  importedArtwork = { ...record, image }; frameType = record.frame || 'oak';
  $('exportStatus').textContent = '仅在本机处理 · 保存后加入作品集';
  renderFrame(); $('frameDialog').showModal();
}
async function refreshImportedArtworks() {
  const records = await artworks('list');
  const list = $('importedArtworks');
  list.querySelectorAll('img').forEach(img => URL.revokeObjectURL(img.src));
  list.replaceChildren(...records.map(record => {
    const b = document.createElement('button'), img = new Image();
    b.setAttribute('aria-label', `装裱作品：${record.name}`); b.title = record.name;
    img.src = URL.createObjectURL(record.blob); img.alt = ''; b.append(img);
    b.onclick = () => openImportedArtwork(record).catch(() => flash('作品无法读取，请重新导入'));
    return b;
  }));
}
function setupImports() {
  $('importArtwork').onclick = () => { clearTimeout(idleTimer); $('artworkFile').click(); };
  $('artworkFile').onchange = async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return flash('请选择 PNG、JPG 或 WebP 图片');
    if (file.size > 20 * 1024 * 1024) return flash('请选择 20 MB 以内的图片');
    $('importArtwork').disabled = true;
    try { await openImportedArtwork({ id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, ''), blob: file, frame: 'oak' }); }
    catch { flash('图片无法读取或过大，请换一张图片'); }
    finally { $('importArtwork').disabled = false; }
  };
  refreshImportedArtworks().catch(() => flash('本机收藏暂不可用，仍可导入并下载'));
}
function setupFrames() {
  frames.forEach(f => { const b = document.createElement('button'); b.className = 'frame-choice'; b.dataset.frame = f.id; b.style.setProperty('--frame', f.color); b.setAttribute('aria-label', `${f.label}画框`); b.title = f.label; b.onclick = () => { frameType = f.id; renderFrame(); }; $('frameChoices').append(b); });
  $('saveBoard').onclick = () => { importedArtwork = null; flushZoom(); settleFlights(); finishDrag(false); stopAI(); clearTimeout(idleTimer); closePopovers(); frameType = current.frame || 'oak'; $('exportStatus').textContent = '作品会保存在本机'; renderFrame(); $('frameDialog').showModal(); };
  $('closeFrame').onclick = () => $('frameDialog').close();
  $('confirmSave').onclick = async () => { $('confirmSave').disabled = true; const ok = await saveFramedSource(); download(); $('exportStatus').textContent = ok ? '已保存作品，画框图片已下载' : '图片已下载，本机收藏失败'; $('confirmSave').disabled = false; };
  $('shareArtwork').onclick = async () => {
    if (!frameBlob) return;
    await saveFramedSource(); const file = new File([frameBlob], 'WonderPatch.png', { type: 'image/png' });
    try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: current.boardName }); $('exportStatus').textContent = '分享完成'; } else { download(); $('exportStatus').textContent = '已下载图片，可自行分享'; } }
    catch (error) { $('exportStatus').textContent = error.name === 'AbortError' ? '已取消分享' : '无法打开分享，请点击保存下载图片'; }
  };
}

async function boot() {
  icons(); app = new Application();
  await app.init({ backgroundAlpha: 0, antialias: true, resizeTo: board, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
  app.canvas.className = 'pixi-layer'; board.append(app.canvas);
  await Promise.all(materials.map(async m => {
    const texture = await Assets.load(m.src), image = new Image(); image.src = m.src; await image.decode(); m.image = image;
    const c = document.createElement('canvas'); c.width = image.width; c.height = image.height;
    const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0); m.pixels = ctx.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (m.pixels[(y * c.width + x) * 4 + 3] > 20) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    m.crop = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    m.texture = new Texture({ source: texture.source, frame: new Rectangle(x0, y0, m.crop.w, m.crop.h) });
    const halo=document.createElement('canvas');halo.width=m.crop.w;halo.height=m.crop.h;
    const hc=halo.getContext('2d');hc.drawImage(image,x0,y0,m.crop.w,m.crop.h,0,0,m.crop.w,m.crop.h);hc.globalCompositeOperation='source-in';hc.fillStyle='white';hc.fillRect(0,0,halo.width,halo.height);m.haloTexture=Texture.from(halo);
  }));
  materials.forEach(m => {
    const tile = document.createElement('button'); tile.className = 'material-tile'; tile.draggable = false; tile.dataset.material = m.id; tile.setAttribute('aria-label', `加入${m.label}`); tile.innerHTML = `<img src="${m.src}" alt="" draggable="false">`;
    // Pointer taps, scrolling, and hold-to-drag are arbitrated by the drawer.
    $('materialTray').append(tile);
  });
  library = readLibrary(); openBoard(library.activeId || library.boards[0].id); select(null);
  new ResizeObserver(() => { flushZoom(); settleFlights(); finishDrag(true); stopAI(); applyView(); }).observe(board);
  board.addEventListener('pointerdown', pointerDown); board.addEventListener('pointermove', pointerMove);
  board.addEventListener('pointerup', e => { if (drag?.pointerId === e.pointerId) finishDrag(false); });
  board.addEventListener('pointercancel', () => finishDrag(true)); board.addEventListener('lostpointercapture', () => { if (drag) finishDrag(true); });
  board.addEventListener('dragover', e => e.preventDefault()); board.addEventListener('drop', e => { e.preventDefault(); const q = point(e); add(e.dataTransfer.getData('text/plain'), q.x / board.clientWidth, q.y / board.clientHeight); closePopovers(); });
  board.addEventListener('keydown', e => {
    if (e.key === 'Escape') { finishDrag(true); stopAI(); select(null); closePopovers(); return; }
    if (!selected) return;
    const step = e.shiftKey ? 15 : 3, moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) { e.preventDefault(); if (aiRun?.ids.has(selected.id)) stopAI(); checkpoint(); selected.x = clamp(selected.x + moves[e.key][0] / board.clientWidth, .06, .94); selected.y = clamp(selected.y + moves[e.key][1] / board.clientHeight, .08, .92); sync(selected); completed(); }
  });
  $('materialButton').onclick = () => toggle('materialPanel'); $('galleryButton').onclick = () => toggle('galleryPanel');
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = closePopovers);
  $('scatterMaterials').onclick = scatter;
  $('undoButton').onclick = () => travel(true); $('redoButton').onclick = () => travel(false);
  $('deletePiece').onclick = () => { if (!selected) return; if (aiRun?.ids.has(selected.id)) stopAI(); checkpoint(); const p = selected; select(null); p.el.remove(); p.glow.destroy(); p.sprite.destroy(); p.shadow.destroy(); pieces = pieces.filter(x => x !== p); if (!pieces.length) $('boardEmpty').style.display = 'flex'; completed(); };
  $('newBoard').onclick = () => { finishDrag(false); stopAI(); persist(); const b = fresh(); b.boardName = `我的画板 ${library.boards.length + 1}`; library.boards.push(b); openBoard(b.id); closePopovers(); persist(); };
  $('boardPicker').onchange = e => { finishDrag(false); stopAI(); persist(); openBoard(e.target.value); closePopovers(); persist(); };
  $('clearBoard').onclick = () => { if (pieces.length) { finishDrag(false); stopAI(); checkpoint(); destroyPieces(); resetProposal(); commitCheckpoint(); persist(); updateHistoryButtons(); flash('已清空 · 可撤销'); } };
  $('renameBoard').onclick = () => { const name = prompt('画板名称', current.boardName); if (name?.trim()) { current.boardName = name.trim().slice(0, 40); header(); persist(); } };
  $('acceptProposal').onclick = startAI; $('rejectProposal').onclick = () => dismiss('好的');
  $('stopCopaint').onclick = () => { stopAI(); flash('停下了 · 已放下的素材可以保留或撤销'); };
  $('correctProposal').onclick = () => { clearTimeout(idleTimer); $('feedbackInput').value = ''; $('feedbackDialog').showModal(); $('feedbackInput').focus(); };
  $('submitFeedback').onclick = e => { e.preventDefault(); const value = $('feedbackInput').value.trim(); if (!value) return $('feedbackInput').focus(); current.memories.push(value.slice(0, 500)); header(); $('feedbackDialog').close(); dismiss('记住了'); };
  $('helpButton').onclick = () => flash('点选后捏合调整素材 · 点空白后捏合缩放画布 · 拖动置顶 · 素材库可滑动');
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(idleTimer); flushZoom(); settleFlights(); finishDrag(true); stopAI(); } });
  await frameReady; setupViewport(); setupFrames(); setupImports(); persist();
  drawerCleanup=setupDrawer({tray:$('materialTray'),panel:$('materialPanel'),expand:$('expandMaterials'),
    onActivity:()=>{clearTimeout(idleTimer);},
    onAdd:id=>{const q=toWorld({x:board.clientWidth/2,y:board.clientHeight/2},view);add(id,q.x/board.clientWidth,q.y/board.clientHeight);},
    onDrop:(id,e)=>{const r=board.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;const q=point(e);add(id,q.x/board.clientWidth,q.y/board.clientHeight);closePopovers();}
  });
}
boot().catch(error => { console.error(error); flash('画板加载失败，请刷新重试'); });
