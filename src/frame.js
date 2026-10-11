const grain = new Image();
grain.src = new URL('../assets/real/frame-oak-grain.png', import.meta.url).href;
export const frameReady = grain.decode();

// Four separately clipped rails preserve grain direction and real miter joints.
export function drawFrame(ctx, W, H, type, inset) {
  const edge = 14, rail = 40, inner = edge + rail;
  ctx.save();
  ctx.shadowColor = '#25190f44'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
  ctx.fillStyle = '#eeeae0'; ctx.fillRect(edge, edge, W - edge * 2, H - edge * 2);
  ctx.restore();
  const corners = [[edge, edge], [W-edge, edge], [W-edge, H-edge], [edge, H-edge]];
  const inside = [[inner, inner], [W-inner, inner], [W-inner, H-inner], [inner, H-inner]];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    ctx.save(); ctx.beginPath();
    [corners[i], corners[j], inside[j], inside[i]].forEach(([x,y], k) => k ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    ctx.closePath(); ctx.clip();
    ctx.fillStyle = type === 'ink' ? '#353631' : type === 'chalk' ? '#efeee8' : '#c5a375';
    ctx.fillRect(0,0,W,H);
    ctx.save();
    if (i % 2) { ctx.translate(W,0); ctx.rotate(Math.PI/2); }
    ctx.globalAlpha = type === 'oak' ? 1 : type === 'chalk' ? .1 : .18;
    ctx.drawImage(grain,0,0,Math.max(W,H),Math.max(W,H)); ctx.restore();
    const light = ctx.createLinearGradient(0,0,0,H);
    light.addColorStop(0,'#ffffff30'); light.addColorStop(.45,'#ffffff00'); light.addColorStop(1,'#00000025');
    ctx.fillStyle = light; ctx.fillRect(0,0,W,H);
    ctx.restore();
    ctx.strokeStyle = '#3d2a191f'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(...corners[i]); ctx.lineTo(...inside[i]); ctx.stroke();
  }
  // Raised outer edge and recessed inner lip.
  ctx.strokeStyle = '#ffffff60'; ctx.lineWidth = 2; ctx.strokeRect(edge+2,edge+2,W-edge*2-4,H-edge*2-4);
  ctx.strokeStyle = '#251b1250'; ctx.lineWidth = 3; ctx.strokeRect(inner-2,inner-2,W-inner*2+4,H-inner*2+4);
  ctx.fillStyle = '#f8f6ee'; ctx.fillRect(inner,inner,W-inner*2,H-inner*2);
  for(let n=0;n<12;n++) {
    ctx.strokeStyle = `rgba(51,37,20,${.1*(1-n/12)})`; ctx.lineWidth = 1;
    ctx.strokeRect(inner+n+.5,inner+n+.5,W-2*(inner+n)-1,H-2*(inner+n)-1);
  }
  // Bevel cut through the warm-white mount board.
  ctx.fillStyle = '#d5d0c2'; ctx.fillRect(inset-3,inset-3,W-inset*2+6,H-inset*2+6);
  ctx.strokeStyle = '#fffef9'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(inset-2,H-inset+2); ctx.lineTo(W-inset+2,H-inset+2); ctx.lineTo(W-inset+2,inset-2); ctx.stroke();
}

export function drawArtRecess(ctx, W, H, inset) {
  ctx.save(); ctx.beginPath(); ctx.rect(inset,inset,W-inset*2,H-inset*2); ctx.clip();
  for(let n=0;n<7;n++) {
    ctx.strokeStyle = `rgba(45,36,22,${.065*(1-n/7)})`; ctx.lineWidth = 1;
    ctx.strokeRect(inset+n+.5,inset+n+.5,W-2*(inset+n)-1,H-2*(inset+n)-1);
  }
  ctx.restore();
}
