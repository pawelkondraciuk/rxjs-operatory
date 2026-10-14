import { esc, text, token, wrapLabel, colors, clamp, fitLabel } from './primitives.js';

export function executionPanelRows(frame,panel) {
  const limit=clamp(Math.floor(panel.maxRows||3),3,5);
  const executions=(frame.executions||[]).filter(e=>e.panel===panel.id);
  const focus=frame.focusedExecutionId||(frame.executions||[]).find(e=>e.focused)?.id;
  const entries=executions.map(e=>({...e,focused:e.id===focus,type:'execution'}));
  // Wiersz oczekującej wartości z polem execution ustępuje miejsca swojemu wykonaniu, więc pozycja jest jedna.
  const claimed=new Set(executions.map(e=>e.id));
  const unclaimed=n=>{if(!n.execution)return true;if(claimed.has(n.execution))return false;claimed.add(n.execution);return true;};
  const queued=(frame.nodes||[]).filter(n=>n.visible&&n.workRow&&n.panel===panel.id&&!executions.some(e=>e.node===n.id)&&
    (n.workState==='queued'||n.status==='w kolejce'||n.dropped)&&unclaimed(n))
    .map(n=>n.dropped&&n.status!=='w kolejce'?{...n,type:'dropped',state:'dropped'}:{...n,type:'queued',state:'queued'});
  const important=entries.filter(e=>e.state==='running'||e.focused);
  let waiting=queued;
  if(important.length+waiting.length>limit&&waiting.length>1)
    waiting=[{id:'queue-group',type:'queued',state:'queued',label:waiting.map(e=>e.createdBy?.value||e.value||e.label).join(', ')+' (wartości)',members:waiting}];
  let active=important;
  const room=limit-waiting.length;
  if(active.length>room) {
    const focused=active.filter(e=>e.focused),others=active.filter(e=>!e.focused);
    const separate=Math.max(0,room-focused.length-1),grouped=others.slice(0,others.length-separate);
    active=[...focused,...(grouped.length?[{id:'active-group',type:'execution',state:'running',
      label:grouped.map(e=>e.label).join(', '),members:grouped}]:[]),...others.slice(others.length-separate)];
  }
  const history=entries.filter(e=>e.state!=='running'&&!e.focused);
  const remaining=Math.max(0,limit-active.length-waiting.length),shownHistory=remaining?history.slice(-remaining):[];
  const hidden=history.slice(0,history.length-shownHistory.length),order=new Map(entries.map((e,i)=>[e.id,i]));
  const rows=[...shownHistory,...active].sort((a,b)=>(order.get(a.id)??Infinity)-(order.get(b.id)??Infinity));
  return {rows:[...rows,...waiting],hidden,focused:entries.find(e=>e.focused),executions};
}
function executionStatus(row) {
  if(row.type==='queued')return '◷ w kolejce';
  if(row.type==='dropped')return '× '+(row.status||'porzucona');
  if(row.state==='cancelled')return '× anulowana · ABORT (klient)';
  if(row.state==='error')return '× error inner (nieobsłużony)';
  if(row.state==='completed') {
    if(row.httpState==='error')return row.values?.length?'⚠ HTTP error → fallback → ✓ complete':'⚠ HTTP error → ✓ complete';
    return '✓ complete';
  }
  if(row.httpState==='error')return row.handledError?'⚠ HTTP error · przechwycony':'⚠ HTTP error · inner trwa';
  return '▶ w trakcie';
}
// Tryb slotów: każda wartość ma stałe miejsce (slot) na pełnej wysokości panelu, wiersze wchodzą fade-in.
function slotStatus(row) {
  if(row.type==='queued')return '◷ w kolejce';
  if(row.type==='ignored')return 'pominięte';
  if(row.type==='dropped')return '× porzucona';
  if(row.type==='subscribing')return 'subskrybuje';
  if(row.state==='cancelled')return 'ABORT (klient)';
  if(row.state==='error')return '× error (nieobsłużony)';
  if(row.state==='completed') {
    if(row.httpState==='error')return row.values?.length?'HTTP ⚠ → fallback → ✓':'HTTP ⚠ → ✓ complete';
    return '✓ complete';
  }
  if(row.httpState==='error')return row.handledError?'HTTP ⚠ → catchError':'HTTP ⚠ error';
  return 'w trakcie';
}
function slotPanel(frame,panel) {
  const executions=(frame.executions||[]).filter(e=>e.panel===panel.id);
  const nodes=frame.nodes||[],slotOf=id=>nodes.find(n=>n.id===id)?.slot;
  const started=new Set(executions.map(e=>e.id)),busy=new Set(executions.map(e=>e.node));
  const waiting=nodes.filter(n=>n.visible&&n.workRow&&n.panel===panel.id&&!busy.has(n.id)&&!(n.execution&&started.has(n.execution))).map(n=>({
    ...n,type:n.inner&&n.workState!=='queued'?'subscribing':n.dropped&&n.status!=='w kolejce'?'dropped':n.status==='pominięte'?'ignored':'queued'}));
  // Wiersz kolejki znika, gdy subskrybowany B$ w tym samym slocie skończy fade-in.
  const covered=new Set(waiting.filter(r=>r.inner&&(r.opacity??1)>=1).map(r=>r.execution));
  const rows=[...waiting.filter(r=>r.inner||!covered.has(r.execution)),...executions.map(e=>({...e,type:'execution',slot:slotOf(e.node),opacity:1,focused:e.id===frame.focusedExecutionId}))];
  const rowWidth=panel.w-32,x=panel.x+16,h=panel.rowHeight,k=frame.textScale||1;
  let svg='';
  if(panel.recipe&&executions.length)
    svg+=text(panel.x+18,panel.y+46,fitLabel(panel.recipe,Math.floor((panel.w-36)/(12*k))),24*k,'class="rx-inner-recipe" data-inner-recipe="true" style="text-anchor:start;fill:#483566"');
  for(const row of rows) {
    if(row.slot===undefined)continue;
    const y=panel.rowsTop+row.slot*panel.rowStep,execution=row.type==='execution';
    const finished=row.state==='completed',cancelled=row.state==='cancelled',failed=row.state==='error'||row.type==='dropped';
    const waitingRow=!execution,dashed=row.type==='queued'||row.type==='dropped';
    const fill=waitingRow?colors.muted:finished?'#d5ebdc':cancelled?'#f0ddd6':failed?'#f5d6d9':colors.a;
    const stroke=row.focused?'#805095':finished?'#087438':cancelled||failed?'#b51e2e':row.type==='subscribing'?'#9b6b0c':waitingRow?'#61717a':'#9b6b0c';
    const status=slotStatus(row),label=row.label||row.value||row.id;
    svg+=`<g class="rx-execution-row" data-execution="${esc(row.execution||row.id)}" data-row-type="${row.type}" data-inner-state="${execution?row.state:row.type}" data-http-state="${row.httpState||'idle'}" data-focused="${Boolean(row.focused)}" opacity="${row.opacity??1}">`;
    svg+=`<rect x="${x}" y="${y}" width="${rowWidth}" height="${h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${row.focused?4:2}" ${dashed?'stroke-dasharray="6 4"':''}/>`;
    svg+=`<title>${esc(label+' · '+status)}</title>`;
    svg+=text(x+18,y+h/2,fitLabel(label,Math.floor(14/k)),28*k,'style="text-anchor:start"');
    svg+=text(x+rowWidth-18,y+h/2,fitLabel(status,Math.floor((rowWidth-190*k)/(13*k))),24*k,`style="text-anchor:end;fill:${finished?'#087438':failed||cancelled?'#9c1727':'#16232b'}"`);
    if(execution&&(row.state==='running'||cancelled||row.state==='error'||row.httpState==='error'&&!finished)) {
      const progress=clamp(row.progress||0);
      svg+=`<rect data-execution-progress="${progress}" x="${x}" y="${y+h-7}" width="${rowWidth*progress}" height="7" fill="${cancelled||row.state==='error'?'#b51e2e':'#765011'}"/>`;
    }
    svg+='</g>';
  }
  return svg;
}
function executionPanel(frame,panel) {
  if(panel.slots)return slotPanel(frame,panel);
  const {rows,hidden,focused,executions}=executionPanelRows(frame,panel);
  const header=panel.recipe?66:38,rowHeight=panel.rowHeight||42,gap=4,detailsHeight=panel.detailsHeight||0;
  const rowWidth=panel.w-32,x=panel.x+16,k=frame.textScale||1;
  let svg='';
  if(panel.recipe&&executions.length)
    svg+=text(panel.x+18,panel.y+46,fitLabel(panel.recipe,Math.floor((panel.w-36)/(12*k))),24*k,
      'class="rx-inner-recipe" data-inner-recipe="true" style="text-anchor:start;fill:#483566"');
  rows.forEach((row,i)=>{
    const y=panel.y+header+i*(rowHeight+gap),finished=row.state==='completed',cancelled=row.state==='cancelled';
    const dropped=row.type==='dropped',queued=row.type==='queued'||dropped,failed=row.state==='error'||dropped;
    const fill=queued?colors.muted:finished?'#d5ebdc':cancelled?'#f0ddd6':failed?'#f5d6d9':colors.a;
    const stroke=row.focused?'#805095':finished?'#087438':cancelled||failed?'#b51e2e':queued?'#61717a':'#9b6b0c';
    const labelWidth=Math.min(220,rowWidth*.3),statusWidth=rowWidth-labelWidth-32;
    const label=fitLabel(row.label||row.value||row.id,Math.floor(labelWidth/(13*k)));
    const status=fitLabel(executionStatus(row),Math.floor(statusWidth/(11*k)));
    svg+=`<g class="rx-execution-row" data-execution="${esc(row.id)}" data-inner-state="${row.state}" data-http-state="${row.httpState||'idle'}" data-focused="${Boolean(row.focused)}"><rect x="${x}" y="${y}" width="${rowWidth}" height="${rowHeight}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="${row.focused?4:2}" ${queued?'stroke-dasharray="6 4"':''}/>`;
    svg+=`<title>${esc((row.label||row.value||row.id)+' · '+executionStatus(row))}</title>`;
    svg+=text(x+18,y+rowHeight/2,label,24*k,'style="text-anchor:start"');
    svg+=text(x+rowWidth-18,y+rowHeight/2,status,22*k,`style="text-anchor:end;fill:${finished?'#087438':failed||cancelled?'#9c1727':'#16232b'}"`);
    if(!queued&&!row.members&&(row.state==='running'||cancelled||failed)) {
      const progress=clamp(row.progress||0);
      svg+=`<rect data-execution-progress="${progress}" x="${x}" y="${y+rowHeight-6}" width="${rowWidth*progress}" height="6" fill="${cancelled||failed?'#b51e2e':'#765011'}"/>`;
    }
    svg+='</g>';
  });
  const historyY=panel.y+panel.h-detailsHeight-16;
  if(hidden.length) {
    const completed=hidden.filter(e=>e.state==='completed').length,cancelled=hidden.filter(e=>e.state==='cancelled').length;
    const failed=hidden.filter(e=>e.state==='error').length;
    const summary=[completed&&`${completed} ✓ complete`,cancelled&&`${cancelled} × ABORT`,failed&&`${failed} × error`].filter(Boolean).join(' · ');
    svg+=text(panel.x+18,historyY,'Starsze: '+summary,22*k,'data-execution-summary="true" style="text-anchor:start;fill:#43525b"');
  }
  if(focused&&detailsHeight) {
    const detailY=panel.y+panel.h-detailsHeight;
    svg+=`<g class="rx-execution-details" data-execution-details="${esc(focused.id)}"><rect x="${x}" y="${detailY}" width="${rowWidth}" height="${detailsHeight-8}" rx="5" fill="#eee3f2" stroke="#805095" stroke-width="2"/>`;
    const http=focused.httpState==='error'?'⚠ HTTP error':focused.httpState==='cancelled'?'× HTTP anulowane':focused.httpState==='success'?'✓ HTTP success':'▶ HTTP w trakcie';
    const first=`${focused.label||focused.id} · ${http}${focused.handledError?' → '+(focused.handlerLabel||'obsługa błędu')+' · przechwycony':''}`;
    const values=(focused.values||[]).map(v=>v.value??v).join(', ');
    const second=focused.handledError?(values?'fallback: '+values:focused.state==='completed'?'bez wartości':'oczekuje na wynik zastępczy')+
      (focused.state==='completed'?' → ✓ complete inner':focused.state==='cancelled'?' · × ABORT':' · inner trwa'):
      focused.state==='error'?'× error kończy inner':focused.state==='completed'?'✓ complete inner':focused.state==='cancelled'?'× odsubskrybowano inner':'▶ subskrypcja inner trwa';
    const chars=Math.floor((rowWidth-36)/(12*k));
    svg+=text(x+18,detailY+16,fitLabel(first,chars),24*k,'style="text-anchor:start"');
    svg+=text(x+18,detailY+43,fitLabel(second,chars),24*k,'style="text-anchor:start"');
    svg+='</g>';
  }
  return svg;
}
// Ikona stanu toru: ✓ complete, × error, przekreślony okrąg = odsubskrybowano. Trwający tor: producent (work, np. HTTP)
// ma obracający się przerywany okrąg (zegar sceny); operator i odbiorca nieruchomy pierścień — podłączony, czeka na next.
function laneIcon(x,y,lane,k,time=0) {
  const r=15*k,mark=color=>`stroke="${color}" stroke-width="${3.5*k}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  if(lane.state==='completed')return `<g data-lane-icon="completed"><circle cx="${x}" cy="${y}" r="${r}" fill="#087438"/><path d="M${x-7*k} ${y}l${5*k} ${5*k} ${9*k} ${-10*k}" ${mark('#fff')}/></g>`;
  if(lane.state==='error')return `<g data-lane-icon="error"><circle cx="${x}" cy="${y}" r="${r}" fill="#b51e2e"/><path d="M${x-6*k} ${y-6*k}l${12*k} ${12*k}M${x+6*k} ${y-6*k}l${-12*k} ${12*k}" ${mark('#fff')}/></g>`;
  if(lane.state==='cancelled')return `<g data-lane-icon="cancelled"><circle cx="${x}" cy="${y}" r="${r-1.5*k}" fill="#fff" ${mark('#61717a').replace('fill="none"','')}/><path d="M${x-9*k} ${y+9*k}L${x+9*k} ${y-9*k}" ${mark('#61717a')}/></g>`;
  if(lane.role==='work')return `<circle data-lane-icon="running" cx="${x}" cy="${y}" r="${r-1.5*k}" fill="none" stroke="${lane.color}" stroke-width="${3*k}" stroke-dasharray="${5*k} ${4*k}" stroke-dashoffset="${(-time*14*k).toFixed(2)}"/>`;
  return `<circle data-lane-icon="waiting" cx="${x}" cy="${y}" r="${r-1.5*k}" fill="#fff" stroke="${lane.color}" stroke-width="${3.5*k}"/>`;
}
export function renderScene(frame,options={}) {
  const reduced=Boolean(options.reducedMotion||frame.reducedMotion);
  // Skala tekstu i kapsułek (4:3 > 1); geometria węzłów i paneli pochodzi z grafu.
  const k=frame.textScale||1;
  const visiblePanels=(frame.panels||[]).filter(p=>p.visible!==false);
  const panels=visiblePanels.filter(p=>p.id&&Array.isArray(frame.executions));
  const executionNodes=new Set((frame.executions||[]).filter(e=>panels.some(p=>p.id===e.panel)).map(e=>e.node));
  const inExecutionPanel=n=>executionNodes.has(n.id)||panels.some(p=>n.workRow&&(n.panel===p.id||
    !n.panel&&n.x>=p.x&&n.x<=p.x+p.w&&n.y>=p.y&&n.y<=p.y+p.h));
  let svg=`<svg viewBox="0 0 ${frame.width} ${frame.height}" role="img" aria-label="${esc(frame.title+': '+frame.caption)}"${reduced?' data-reduced-motion="true"':''}>`;
  for(const p of visiblePanels) {
    // Łącznik pionowy do górnej krawędzi panelu albo poziomy, gdy panel stoi obok kafelka.
    const beside=p.from&&p.from.y>=p.y&&p.from.y<=p.y+p.h;
    if(p.from)svg+=`<path d="M${p.from.x} ${p.from.y} ${beside?'H'+p.x:'V'+p.y}" stroke="#805095" stroke-width="3" stroke-dasharray="6 5"/>`;
    svg+=`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="12" fill="#f1eee7" stroke="#958875" stroke-width="2"/>`;
    if(p.label)svg+=text(p.x+18,p.y+18,p.label,20*k,'style="text-anchor:start;fill:#43525b"');
  }
  for(const t of frame.laneTrails||[])
    svg+=`<path data-lane-trail="${esc(t.id)}" data-trail-kind="${t.kind}" d="${t.points.map((p,i)=>(i?'L':'M')+p.join(' ')).join('')}" fill="none" stroke="${t.color}" stroke-width="${3*k}" opacity="${t.opacity}"${t.kind==='unsubscribe'?` stroke-dasharray="${8*k} ${6*k}"`:''}/>`;
  for(const e of frame.edges) if(e.visible&&!(reduced&&e.phase==='unsubscribe')) {
    const d=e.points.map((p,i)=>(i?'L':'M')+p.join(' ')).join('');
    const offset=reduced?(e.phase==='subscribed'?0:-1):e.offset;
    svg+=`<path data-connection="${esc(e.id)}" data-phase="${e.phase}" d="${d}" fill="none" stroke="${e.color}" stroke-width="6" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${offset}"/>`;
  }
  for(const n of frame.nodes) if(n.visible&&!inExecutionPanel(n)) {
    const opacity=reduced?1:n.opacity;
    if(n.workRow) {
      const finished=n.workState==='completed',cancelled=n.workState==='canceled',queued=n.workState==='queued'||n.status==='w kolejce';
      const fill=finished?'#d5ebdc':cancelled?'#f0ddd6':queued||n.status==='pominięte'?colors.muted:n.fill;
      const stroke=finished?'#087438':cancelled?'#b51e2e':queued?'#61717a':'#9b6b0c';
      const status=finished?'✓ complete':cancelled?n.status:queued?'w kolejce':n.workState==='active'?'w trakcie':n.status||'gotowe';
      svg+=`<g data-node="${esc(n.id)}" data-work-state="${n.workState}" opacity="${opacity}"><rect x="${n.x-n.w/2}" y="${n.y-n.h/2}" width="${n.w}" height="${n.h}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="2" ${queued?'stroke-dasharray="6 4"':''}/>`;
      if(n.showProgress)svg+=`<rect data-work-progress="${n.progress}" x="${n.x-n.w/2}" y="${n.y+n.h/2-7}" width="${n.w*n.progress}" height="7" fill="${cancelled?'#b51e2e':'#765011'}"/>`;
      svg+=text(n.x-n.w/2+18,n.y,n.label,24*k,'style="text-anchor:start"')+text(n.x+n.w/2-18,n.y,status,22*k,`style="text-anchor:end;fill:${finished?'#087438':cancelled?'#9c1727':'#16232b'}"`);
      svg+='</g>';continue;
    }
    const lines=wrapLabel(n.label,Math.floor(n.w/(14*k))),failed=n.workState==='errored';
    svg+=`<g data-node="${esc(n.id)}" opacity="${opacity}" data-active="${n.active}" data-work-state="${n.workState}"><rect x="${n.x-n.w/2}" y="${n.y-n.h/2}" width="${n.w}" height="${n.h}" rx="5" fill="${n.fill}" stroke="${failed?'#b51e2e':n.active?'#805095':'#26343d'}" stroke-width="${failed||n.active?4:1.5}"/>`;
    // statusInside trzyma stan w kafelku, gdy pod nim stoi panel (np. EMISJE pod odbiorcą).
    const inside=n.statusInside&&n.status,labelShift=inside?-12*k:0;
    // Etykieta kafelka rośnie do labelScale (4:3), o ile najdłuższa linia mieści się w szerokości; inaczej zostaje przy textScale.
    const longest=Math.max(1,...lines.map(line=>Array.from(line).length));
    const labelSize=clamp((n.w-24)/(longest*.55),26*k,26*(frame.labelScale||k)),lineStep=28*labelSize/26;
    lines.forEach((line,i)=>svg+=text(n.x,n.y+(n.labelOffset||0)+labelShift+(i-(lines.length-1)/2)*lineStep,line,labelSize,n.notification&&!n.terminalBadge?'style="fill:#fff"':''));
    if(inside)svg+=text(n.x,n.y+16*k,n.status,20*k,n.notification?'style="fill:#fff"':failed?'style="fill:#b51e2e"':'');
    else if(n.status)svg+=text(n.x,n.y+n.h/2+21*k,n.status,20*k,failed?'style="fill:#b51e2e"':'');
    if(n.showProgress)svg+=`<rect data-work-progress="${n.progress}" x="${n.x-n.w/2}" y="${n.y+n.h/2-9}" width="${n.w*n.progress}" height="9" fill="#132f42"/>`;
    if(n.transform)svg+=text(n.x,n.y+(n.transformOffset??n.h/2+52*k),n.transform,28*k,'data-transformation="true"');
    // Tory subskrybentów: stan wykonania jako mały element w kafelku definicji (pasek, chip, znaczek), gniazda na krawędziach.
    for(const lane of n.laneStates||[]) {
      svg+=`<g data-lane="${esc(lane.subscriber)}" data-lane-role="${lane.role}" data-lane-state="${lane.state}"${lane.progress===undefined?'':` data-work-progress="${lane.progress}"`} opacity="${lane.opacity}"><title>${esc(lane.subscriber+' · '+lane.status)}</title>`;
      if(lane.role==='work') {
        const x0=n.x-n.w/2+48*k,x1=n.x+n.w/2-62*k,h=14*k,stopped=lane.state==='error'||lane.state==='cancelled';
        svg+=text(n.x-n.w/2+24*k,lane.y,lane.subscriber,24*k,'style="font-weight:700;fill:#43525b"');
        svg+=`<rect x="${x0}" y="${lane.y-h/2}" width="${x1-x0}" height="${h}" rx="${h/2}" fill="#26343d" fill-opacity=".18"/>`;
        svg+=`<rect x="${x0}" y="${lane.y-h/2}" width="${(x1-x0)*lane.progress}" height="${h}" rx="${h/2}" fill="${stopped?'#b51e2e':lane.color}"/>`;
        svg+=laneIcon(n.x+n.w/2-34*k,lane.y,lane,k,frame.time);
      } else if(lane.role==='operator') {
        const x0=n.x-n.w/2+22*k,x1=n.x+n.w/2-22*k,h=58*k;
        svg+=`<rect x="${x0}" y="${lane.y-h/2}" width="${x1-x0}" height="${h}" rx="${12*k}" fill="#fff" fill-opacity=".62"/>`;
        svg+=`<circle cx="${x0+20*k}" cy="${lane.y}" r="${7*k}" fill="${lane.color}"/><circle cx="${x1-20*k}" cy="${lane.y}" r="${7*k}" fill="${lane.color}"/>`;
        svg+=laneIcon(n.x,lane.y,lane,k,frame.time);
      } else svg+=laneIcon(n.x+n.w/2-30*k,n.y+n.h/2-30*k,lane,k,frame.time);
      svg+='</g>';
    }
    for(const dot of n.socketDots||[])
      svg+=`<circle data-socket="${dot.side}" data-subscriber="${esc(dot.subscriber)}" cx="${dot.side==='out'?n.x+n.w/2:n.x-n.w/2}" cy="${dot.y}" r="${13*k}" fill="${dot.color}" stroke="#fff" stroke-width="3" opacity="${dot.opacity}"/>`;
    svg+='</g>';
  }
  for(const panel of panels)svg+=executionPanel(frame,panel);
  for(const t of frame.tokens) {
    const edge=reduced&&frame.edges.find(e=>e.id===t.edge),point=edge?.points?.at(-1);
    svg+=token(point?.[0]??t.x,point?.[1]??t.y,t.value,t.color,`data-value-on="${esc(t.edge||'source')}" data-token="${esc(t.phase)}"`,150*k,Boolean(panels.length),k);
  }
  for(const h of frame.histories) {
    if(h.lines>=1) {
      // Historia w zadanej liczbie linii, również jednej, po kolei w kolejności dotarcia. columns dzieli linię na kolumny;
      // kapsułka szersza niż kolumna zajmuje całą linię. Bez columns kapsułki płyną od lewej. Nadmiar pomija najstarsze linie.
      const gap=10,widthOf=v=>Math.min(h.w,Math.max(54*k,(String(v.value).length*14+24)*k)),lines=[],columns=h.columns||0,cell=columns?h.w/columns:h.w;
      for(const value of h.values) {
        const width=widthOf(value),line=lines.at(-1);
        if(columns) {
          const full=width>cell-gap||columns===1;
          if(line&&!line.full&&!full&&line.items.length<columns)line.items.push({value,width});
          else lines.push({items:[{value,width}],full});
        } else if(line&&line.used+gap+width<=h.w){line.items.push({value,width});line.used+=gap+width;}
        else lines.push({items:[{value,width}],used:width});
      }
      lines.slice(-h.lines).forEach((line,i)=>{
        const y=h.y+i*(h.lineStep||0);
        line.items.forEach((item,j)=>{
          const x=columns?(line.full?h.x:h.x+(j-(columns-1)/2)*cell):h.x-line.used/2+line.items.slice(0,j).reduce((sum,other)=>sum+other.width+gap,0)+item.width/2;
          // Nowa kapsułka wchodzi fade-in (0,3 s) od chwili pojawienia się w historii.
          const opacity=reduced||item.value.shownAt===undefined?1:clamp((frame.time-item.value.shownAt)/.3);
          svg+=token(x,y,item.value.value,item.value.color||'a',`data-token="received" opacity="${opacity}"`,item.width,true,k);
        });
      });
    } else if(panels.length) {
      const shown=[],gap=8,ellipsisWidth=28*k;
      let used=0;
      for(let i=h.values.length-1;i>=0;i--) {
        const value=h.values[i],width=Math.min(150*k,h.w-(i?ellipsisWidth:0),Math.max(46*k,(String(value.value).length*13+20)*k));
        const next=used+width+(shown.length?gap:0)+(i?ellipsisWidth:0);
        if(next>h.w&&shown.length)break;
        shown.unshift({value,width});used+=width+(shown.length>1?gap:0);
      }
      const hidden=shown.length<h.values.length,fullWidth=used+(hidden?ellipsisWidth:0);
      let x=h.x-fullWidth/2;
      if(hidden){svg+=text(x+10*k,h.y,'…',24*k);x+=ellipsisWidth;}
      for(const item of shown) {
        svg+=token(x+item.width/2,h.y,item.value.value,item.value.color||'a','data-token="received"',item.width,true,k);
        x+=item.width+gap;
      }
    } else {
      const slots=Math.max(1,Math.floor(h.w/(74*k))),shown=h.values.slice(-slots),gap=Math.min(92*k,h.w/Math.max(1,slots));
      shown.forEach((v,i)=>svg+=token(h.x+(i-(shown.length-1)/2)*gap,h.y,v.value,v.color||'a','data-token="received"',gap-5,false,k));
      if(h.values.length>slots)svg+=text(h.x-h.w/2-8,h.y,'…',24*k);
    }
  }
  if(frame.queue&&!panels.length)svg+=text(frame.width/2,frame.height-20,frame.queue,22*k,'data-queue="true"');
  // Dwa rzędy kart dzielą wysokość diagramu; przy 340 daje to dotychczasowy krok 155 i karty 130.
  const cardStep=(frame.height-30)/2,cardH=Math.min(cardStep-25,190);
  frame.cards.forEach((item,i)=>{
    const x=70+(i%2)*570,y=20+Math.floor(i/2)*cardStep+(cardStep-25-cardH)/2,p=reduced?1:clamp((frame.time-item.at)/.6);
    svg+=`<g opacity="${p}" transform="translate(${x},${y})"><rect width="530" height="${cardH}" rx="5" fill="${colors[item.color]}"/>`;
    wrapLabel(item.label,Math.floor(29/k)).forEach((line,j,lines)=>svg+=text(265,cardH/2+(j-(lines.length-1)/2)*34*k,line,30*k));
    svg+='</g>';
  });
  return svg+'</svg>';
}
