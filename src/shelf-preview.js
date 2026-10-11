import {drawFrame,drawArtRecess} from './frame.js';

// Render from saved object data, never by switching the active editing board.
export function paintShelfPreview(canvas,{pieces=[],frame='oak',artAspect=.68},materials,image=null){
 const inset=frame==='none'?0:108,artW=850;
 const ratio=image?image.height/image.width:artAspect;
 const artH=Math.round(artW*(Number.isFinite(ratio)&&ratio>0?ratio:.68));
 canvas.width=artW+inset*2;canvas.height=artH+inset*2;
 const ctx=canvas.getContext('2d');if(inset)drawFrame(ctx,canvas.width,canvas.height,frame,inset);
 ctx.fillStyle='#f5f4ef';ctx.fillRect(inset,inset,artW,artH);
 ctx.save();ctx.beginPath();ctx.rect(inset,inset,artW,artH);ctx.clip();
 if(image)ctx.drawImage(image,inset,inset,artW,artH);
 else for(const p of pieces){const m=materials.find(m=>m.id===p.materialId);if(!m)continue;
 const w=m.width*p.scale*artW/900,h=w*m.crop.h/m.crop.w;
 ctx.save();ctx.translate(inset+p.x*artW,inset+p.y*artH);ctx.rotate(p.rotation);ctx.shadowColor='#28301e18';ctx.shadowBlur=4;ctx.shadowOffsetY=2;
 ctx.drawImage(m.image,m.crop.x,m.crop.y,m.crop.w,m.crop.h,-w/2,-h/2,w,h);ctx.restore();}
 ctx.restore();if(inset)drawArtRecess(ctx,canvas.width,canvas.height,inset);
}
