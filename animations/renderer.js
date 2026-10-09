import { esc, text, token, wrapLabel, colors, clamp } from './primitives.js';

// Renderer zna tylko prymitywy klatki. Nie zna ID ani semantyki operatorów RxJS.
export function renderScene(frame) {
  let svg=`<svg viewBox="0 0 ${frame.width} ${frame.height}" role="img" aria-label="${esc(frame.title+': '+frame.caption)}">`;
  for(const p of frame.panels||[]) {
    svg+=`<path d="M${p.from.x} ${p.from.y} V${p.y}" stroke="#805095" stroke-width="3" stroke-dasharray="6 5"/><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="12" fill="#f1eee7" stroke="#958875" stroke-width="2"/>`;
    svg+=text(p.x+18,p.y+18,p.label,20,'style="text-anchor:start;fill:#43525b"');
  }
  for(const e of frame.edges) if(e.visible) {
    const d=e.points.map((p,i)=>(i?'L':'M')+p.join(' ')).join('');
    svg+=`<path data-connection="${esc(e.id)}" data-phase="${e.phase}" d="${d}" fill="none" stroke="${e.color}" stroke-width="6" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${e.offset}"/>`;
  }
  for(const n of frame.nodes) if(n.visible) {
    if(n.workRow) {
      const finished=n.workState==='completed',cancelled=n.workState==='canceled',queued=n.workState==='queued'||n.status==='w kolejce';
      const fill=finished?'#d5ebdc':cancelled?'#f0ddd6':queued||n.status==='pominięte'?colors.muted:n.fill;
      const stroke=finished?'#087438':cancelled?'#b51e2e':queued?'#61717a':'#9b6b0c';
      const status=finished?'✓ complete':cancelled?n.status:queued?'w kolejce':n.workState==='active'?'w trakcie':n.status||'gotowe';
      svg+=`<g data-node="${esc(n.id)}" data-work-state="${n.workState}" opacity="${n.opacity}"><rect x="${n.x-n.w/2}" y="${n.y-n.h/2}" width="${n.w}" height="${n.h}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="2" ${queued?'stroke-dasharray="6 4"':''}/>`;
      if(n.showProgress)svg+=`<rect data-work-progress="${n.progress}" x="${n.x-n.w/2}" y="${n.y+n.h/2-7}" width="${n.w*n.progress}" height="7" fill="${cancelled?'#b51e2e':'#765011'}"/>`;
      svg+=text(n.x-n.w/2+18,n.y,n.label,24,'style="text-anchor:start"')+text(n.x+n.w/2-18,n.y,status,22,`style="text-anchor:end;fill:${finished?'#087438':cancelled?'#9c1727':'#16232b'}"`);
      svg+='</g>';continue;
    }
    const lines=wrapLabel(n.label,Math.floor(n.w/14));
    svg+=`<g data-node="${esc(n.id)}" opacity="${n.opacity}" data-active="${n.active}" data-work-state="${n.workState}"><rect x="${n.x-n.w/2}" y="${n.y-n.h/2}" width="${n.w}" height="${n.h}" rx="5" fill="${n.fill}" stroke="${n.active?'#805095':'#26343d'}" stroke-width="${n.active?4:1.5}"/>`;
    lines.forEach((line,i)=>svg+=text(n.x,n.y+(n.labelOffset||0)+(i-(lines.length-1)/2)*28,line,26,n.notification?'style="fill:#fff"':''));
    if(n.status)svg+=text(n.x,n.y+n.h/2+21,n.status,20);
    if(n.showProgress)svg+=`<rect data-work-progress="${n.progress}" x="${n.x-n.w/2}" y="${n.y+n.h/2-9}" width="${n.w*n.progress}" height="9" fill="#132f42"/>`;
    if(n.transform)svg+=text(n.x,n.y+n.h/2+52,n.transform,28,'data-transformation="true"');
    svg+='</g>';
  }
  for(const t of frame.tokens)svg+=token(t.x,t.y,t.value,t.color,`data-value-on="${esc(t.edge||'source')}" data-token="${esc(t.phase)}"`);
  for(const h of frame.histories) {
    const slots=Math.max(1,Math.floor(h.w/74)),shown=h.values.slice(-slots),gap=Math.min(92,h.w/Math.max(1,slots));
    shown.forEach((v,i)=>svg+=token(h.x+(i-(shown.length-1)/2)*gap,h.y,v.value,v.color||'a','data-token="received"',gap-5));
    if(h.values.length>slots)svg+=text(h.x-h.w/2-8,h.y,'…',24);
  }
  if(frame.queue)svg+=text(frame.width/2,frame.height-20,frame.queue,22,'data-queue="true"');
  frame.cards.forEach((item,i)=>{
    const x=70+(i%2)*570,y=20+Math.floor(i/2)*155,p=clamp((frame.time-item.at)/.6);
    svg+=`<g opacity="${p}" transform="translate(${x},${y})"><rect width="530" height="130" rx="5" fill="${colors[item.color]}"/>`;
    wrapLabel(item.label,29).forEach((line,j,lines)=>svg+=text(265,65+(j-(lines.length-1)/2)*34,line,30));
    svg+='</g>';
  });
  return svg+'</svg>';
}
