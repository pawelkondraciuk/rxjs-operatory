import { palette } from './lifecycle.js';

export const colors = { a:'#ffc15c', b:'#72d8a2', c:'#83cafa', source:palette.source,
  op:'#e7b5f1', http:palette.observer, muted:'#e7ecef', error:'#f3a3a3' };
export const clamp = (n, min=0, max=1) => Math.max(min, Math.min(max, n));
export const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const text = (x,y,value,size=24,attrs='') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="middle" ${attrs}>${esc(value)}</text>`;
export function wrapLabel(value, max=19) {
  const lines=[]; let current='';
  String(value).split(' ').forEach(word => {
    if ((current+' '+word).trim().length>max && current) { lines.push(current); current=word; }
    else current=(current+' '+word).trim();
  });
  if(current) lines.push(current);
  return lines;
}
export function geometry(a,b) {
  const sx=a.x+a.w/2, ex=b.x-b.w/2, mid=(sx+ex)/2;
  return [[sx,a.y],[mid,a.y],[mid,b.y],[ex,b.y]];
}
export function pointAt(points, progress) {
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
  let distance=lengths.reduce((a,b)=>a+b,0)*clamp(progress);
  for(let i=0;i<lengths.length;i++) {
    if(distance<=lengths[i] || i===lengths.length-1) {
      const u=lengths[i]?distance/lengths[i]:0;
      return points[i].map((v,axis)=>v+(points[i+1][axis]-v)*u);
    }
    distance-=lengths[i];
  }
  return points.at(-1);
}
export function token(x,y,value,color='a',attrs='',maxWidth=150) {
  const width=Math.min(maxWidth,Math.max(46,String(value).length*13+20));
  return `<g ${attrs}><rect x="${x-width/2}" y="${y-23}" width="${width}" height="46" rx="23" fill="${colors[color]||color}" stroke="#fff" stroke-width="3"/>${text(x,y+1,value,23)}</g>`;
}
