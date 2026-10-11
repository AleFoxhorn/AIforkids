export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export const toWorld = (p,v) => ({x:(p.x-v.x)/v.scale,y:(p.y-v.y)/v.scale});
export const toScreen = (p,v) => ({x:p.x*v.scale+v.x,y:p.y*v.scale+v.y});
export function zoomAt(view, anchor, factor) {
  const world=toWorld(anchor,view), scale=clamp(view.scale*factor,.4,4);
  return {scale,x:anchor.x-world.x*scale,y:anchor.y-world.y*scale};
}
export function flightPose(start,end,t,reduced=false) {
  const u=clamp(t,0,1), ease=1-(1-u)**3;
  return {x:start.x+(end.x-start.x)*ease,
    y:start.y+(end.y-start.y)*ease-(reduced?0:.13*Math.sin(Math.PI*u)),
    rotation:end.rotation+(reduced?0:(1-u)*.8),
    scale:reduced?1:.28+.72*ease+.06*Math.sin(Math.PI*u*3)*u};
}
