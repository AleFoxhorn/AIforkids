export const CO_PAINT_PROMPT = '我想用两片叶子和一颗纽扣拼一只小鸟，可以加入这里吗？';

export function bounds(p, materials, aspect) {
  const m = materials.find(m => m.id === p.materialId);
  const w = m.width * p.scale / 900, h = w * m.crop.h / m.crop.w;
  const c = Math.abs(Math.cos(p.rotation)), s = Math.abs(Math.sin(p.rotation));
  return { x: p.x, y: p.y, w: w*c+h*s, h: (w*s+h*c)*aspect };
}
const overlaps = (a,b) => Math.abs(a.x-b.x) < (a.w+b.w)/2+.025 && Math.abs(a.y-b.y) < (a.h+b.h)/2+.035;
export function planCompanion(pieces, materials, aspect,kind='bird') {
  const occupied = pieces.map(p => bounds(p, materials, aspect));
  for (const y of [.22,.38,.55,.74]) for (const x of [.75,.5,.29]) {
    const plan = [
      { materialId:'leaf-long', x:x-.065, y:y+.006*aspect, rotation:kind==='fish'?.45:-.8, scale:.48 },
      { materialId:'leaf-round', x:x+.025, y, rotation:-.7, scale:.68 },
      { materialId:'button', x:x+.055, y:y-.005*aspect, rotation:0, scale:.28 },
    ];
    if (plan.every(p => {
      const b = bounds(p, materials, aspect);
      return b.x-b.w/2>.13 && b.x+b.w/2<.94 && b.y-b.h/2>.09 && b.y+b.h/2<.89 && !occupied.some(o => overlaps(b,o));
    })) return plan;
  }
  return null;
}

// Small injectable animation runner: no background continuation after cancellation.
export function animateCompanion({ plan, create, move, settled, done, canPlace, frame = requestAnimationFrame, cancel = cancelAnimationFrame, reducedMotion = false }) {
  let handle, stopped = false, index = 0, piece = null, started = null;
  const duration = reducedMotion ? 650 : 2100;
  function tick(now) {
    if (stopped) return;
    const target = plan[index];
    if (!canPlace(target)) { stopped = true; if (piece) settled(piece); done('occupied'); return; }
    if (!piece) {
      piece = create(target, index); started = now;
    }
    const t = Math.min(1, (now-started)/duration), eased = t*t*(3-2*t);
    move(piece, target, eased, reducedMotion);
    if (t === 1) {
      settled(piece); piece = null; index++;
      if (index === plan.length) { stopped = true; done('complete'); return; }
    }
    handle = frame(tick);
  }
  handle = frame(tick);
  return () => { if (stopped) return; stopped = true; cancel(handle); if (piece) settled(piece); };
}
