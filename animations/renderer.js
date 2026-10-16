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
function executionPanel(frame,panel,reduced=false) {
  if(panel.innerWork)return innerWorkPanel(frame.innerWorkPanels.find(p=>p.id===panel.id),frame,reduced);
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

// Kafelek prac wygląda jak kafelki głównego toru: płaski nagłówek definicji (HTTP GET) o wysokości nagłówka u góry
// i wiersze wykonań z paskiem koloru pracy, etykietą, postępem w tle i stanem tekstem. Stany i czasy są już w snapshocie.
function innerWorkPanel(panel,frame,reduced=false) {
  const {x,w,rowsTop,rowHeight,headerH,identifierW,stageGap,font,tileLeft,tileRight}=panel;
  const k=frame.textScale||1,right=x+w-18,count=panel.columns.length,bar=6*k,titleY=rowsTop-headerH;
  const portR=panel.portRadius||8,wireW=panel.wire||4;
  // Jedna kolumna zajmuje cały wiersz (postęp za etykietą, jak w HTTP GET toru); kilka dzieli miejsce za identyfikatorem.
  const stageW=count===1?tileRight-tileLeft:(tileRight-tileLeft-identifierW-stageGap*(count-1))/count;
  const stageX=i=>count===1?tileLeft:tileLeft+identifierW+i*(stageW+stageGap);
  const fills={completed:'#DDF1E1',cancelled:'#E7E8E8',errored:'#F7D9D9'},accent={completed:'#26804E',errored:'#C54848'};
  const status={completed:'complete',cancelled:'anulowane',errored:'error',subscribing:'subskrybuje',idle:'oczekuje'};
  const waiting=(row,label,dashed)=>{
    const px=tileLeft+identifierW,pw=tileRight-px-10;
    return `<rect data-inner-placeholder="${row.state}" x="${px}" y="${row.y+6}" width="${pw}" height="${rowHeight-13}" fill="#EEEBE9"${dashed?' stroke="#BEB4BF" stroke-width="2" stroke-dasharray="8 6"':''}/>`+
      text(px+pw/2,row.y+rowHeight/2,label,font,'style="fill:#746B76;font-weight:600"');
  };
  let svg=`<g data-inner-work-panel="${esc(panel.id)}">`;
  panel.columns.forEach((column,i)=>{
    const labelSize=clamp((stageW-24)/(Math.max(1,column.label.length)*.55),26*k,26*(frame.labelScale||k));
    svg+=`<rect x="${stageX(i)}" y="${titleY}" width="${stageW}" height="${headerH}" fill="${column.fill}"/>`;
    svg+=text(stageX(i)+stageW/2,titleY+headerH/2,column.label,labelSize,'style="fill:#26323B"');
  });
  for(const row of panel.rows) {
    const cy=row.y+rowHeight/2,h=rowHeight-1,muted=row.state==='cancelled',identity=muted?'#808890':row.color;
    const idLabel=text(tileLeft+bar+14,cy,row.id+' · '+row.value,font,`style="text-anchor:start;fill:${identity};font-weight:700"`);
    svg+=`<g data-inner-work="${esc(row.id)}" data-inner-state="${row.state}" data-row-slot="${row.slot}" opacity="${reduced?1:row.opacity}">`;
    svg+=`<title>${esc(row.id+' · '+row.value+' · '+row.state)}</title>`;
    svg+=`<rect x="${tileLeft}" y="${row.y}" width="${tileRight-tileLeft}" height="${h}" fill="#F4F1EE"/>`;
    if(row.state==='queued'||row.state==='ignored') {
      const queued=row.state==='queued';
      svg+=`<rect x="${tileLeft}" y="${row.y}" width="${bar}" height="${h}" fill="${identity}"${queued?'':' opacity=".45"'}/>`+idLabel;
      svg+=waiting(row,queued?row.queueLabel||'W KOLEJCE':'pominięte',queued);
      svg+=`<path d="M${tileLeft} ${row.y}H${tileRight}" stroke="#26343d" stroke-opacity=".3" stroke-width="1"/></g>`;continue;
    }
    // Wpis kolejki ustępuje płynnie miejscu wykonania w tym samym slocie.
    if(row.reveal<1&&!reduced)svg+=`<g opacity="${1-row.reveal}">${waiting({...row,state:'queued'},row.queueLabel||'W KOLEJCE',true)}</g>`;
    svg+=`<g opacity="${reduced?1:row.reveal}">`;
    row.stages.forEach((stage,i)=>{
      const column=panel.columns[i],sx=stageX(i),fill=fills[stage.state]||column.runtime;
      const glow=accent[stage.state]&&!reduced&&stage.since!==undefined?.28*(1-clamp((frame.time-stage.since)/.6)):0;
      svg+=`<g data-inner-stage="${esc(column.id)}" data-stage-state="${stage.state}"><rect x="${sx}" y="${row.y}" width="${stageW}" height="${h}" fill="${fill}"/>`;
      if(glow>0)svg+=`<rect data-row-flash="${stage.state}" x="${sx}" y="${row.y}" width="${stageW}" height="${h}" fill="${accent[stage.state]}" opacity="${glow.toFixed(3)}"/>`;
      if(stage.hasProgress&&['active','cancelled'].includes(stage.state)) {
        const pw=(stageW-bar)*stage.progress;
        svg+=`<rect data-inner-progress="${stage.progress}" x="${sx+bar}" y="${row.y}" width="${pw}" height="${h}" fill="${muted?'#808890':row.color}" opacity="${muted?.18:.25}"/>`;
        if(stage.state==='active'&&stage.progress>0&&stage.progress<1)svg+=`<rect x="${sx+bar+pw-3*k}" y="${row.y}" width="${3*k}" height="${h}" fill="${row.color}"/>`;
      }
      svg+=`<rect x="${sx}" y="${row.y}" width="${bar}" height="${h}" fill="${identity}"/>`;
      const label=status[stage.state]||(stage.hasProgress?'w trakcie':'oczekuje');
      // Chwilowy fallback etapu obsługi błędu (np. of([]) w catchError): pigułka zamiast stanu, bez nowej kolumny.
      if(stage.fallback) {
        const fw=(String(stage.fallback.label).length*.6*font)+28,fx=sx+stageW-14-fw;
        svg+=`<g data-inner-fallback="${esc(stage.fallback.label)}" opacity="${reduced?1:+stage.fallback.opacity.toFixed(3)}"><rect x="${fx}" y="${cy-font*.75}" width="${fw}" height="${font*1.5}" rx="${font*.75}" fill="#F3E6F8" stroke="#B384C6" stroke-width="2"/>`+
          text(fx+fw/2,cy+1,stage.fallback.label,font,'style="font-family:Consolas,ui-monospace,monospace;font-weight:700;fill:#6B3D80"')+'</g>';
      }
      else svg+=text(sx+stageW-18,cy,label,font,`style="text-anchor:end;fill:${stage.state==='completed'?'#26804E':stage.state==='errored'?'#C54848':'#26323B'}"`);
      svg+='</g>';
    });
    svg+=idLabel+`<path d="M${tileLeft} ${row.y}H${tileRight}" stroke="#26343d" stroke-opacity=".3" stroke-width="1"/>`;
    for(const wire of row.wires) {
      if(!wire.visible)continue;
      const sx=stageX(wire.index)+stageW,ex=wire.index<count-1?stageX(wire.index+1):right;
      svg+=`<path data-inner-wire="${esc(row.id)}-${wire.index}" d="M${sx} ${cy}H${ex}" fill="none" stroke="${wire.color}" stroke-width="${wireW}" opacity="${wire.opacity}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${reduced?0:-(1-wire.subscribe)}"/>`;
      if(wire.pulse&&!reduced)svg+=`<path data-inner-pulse="${esc(row.id)}-${wire.index}" d="M${sx} ${cy}H${ex}" fill="none" stroke="${wire.pulse.color}" stroke-width="${wireW*2}" stroke-linecap="round" pathLength="1" stroke-dasharray=".18 2" stroke-dashoffset="${(.18-wire.pulse.at*1.18).toFixed(4)}"/>`;
      for(const port of [sx,ex])svg+=`<circle data-inner-port="true" cx="${port}" cy="${cy}" r="${portR}" fill="${wire.color}" stroke="#fff" stroke-width="3" opacity="${wire.opacity*wire.subscribe}"/>`;
    }
    for(const t of row.tokens) {
      const sx=stageX(t.stage)+stageW,ex=t.stage<count-1?stageX(t.stage+1):right;
      const tx=sx+(ex-sx)*t.progress;
      if(String(t.value).length>3) {
        const scale=font/25,bubbleW=Math.min(stageW-24,(String(t.value).length*13+20)*scale);
        svg+=token(Math.min(tx,right-bubbleW/2),cy,t.value,t.color,'data-inner-next="true"',stageW-24,true,scale);
      }
      else svg+=ball(tx,cy,t.value,t.color,panel.ball?{...panel.ball,textFill:panel.ballText}:{r:Math.min(26,rowHeight*.4),font:font*.92,textFill:panel.ballText},1,'data-inner-next="true"');
    }
    svg+='</g></g>';
  }
  return svg+'</g>';
}
// Kulka wartości o stałym rozmiarze (graph.ball: r, font); scale tylko dla krótkiego pulsu przekształcenia.
function ball(x,y,value,color,size,scale=1,attrs='') {
  const r=size.r*scale,label=fitLabel(value,Math.max(1,Math.floor(r*2/(size.font*.58))));
  const title=label===String(value)?'':`<title>${esc(value)}</title>`;
  return `<g ${attrs}>${title}<circle cx="${x}" cy="${y}" r="${r}" fill="${colors[color]||color}" stroke="#fff" stroke-width="3"/>${text(x,y+1,label,size.font*scale,`style="font-weight:700${size.textFill?';fill:'+esc(size.textFill):''}"`)}</g>`;
}
// Ikona odbiorcy „inbox”: tacka z wcięciem, obrys w kolorze tekstu.
function inboxIcon(x,y,size) {
  const h=size*.78,top=y-h/2,bottom=y+h/2,mid=top+h*.5,right=x+size,line=`stroke="#26323B" stroke-width="${(size/10).toFixed(2)}" fill="none" stroke-linejoin="round" stroke-linecap="round"`;
  return `<g data-icon="inbox"><path d="M${x} ${mid}L${x+size*.2} ${top}H${right-size*.2}L${right} ${mid}V${bottom}H${x}Z" ${line}/>`+
    `<path d="M${x} ${mid}H${x+size*.3}l${size*.08} ${h*.22}H${right-size*.38}l${size*.08} ${-h*.22}H${right}" ${line}/></g>`;
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
    if(p.frameless) {
      svg+=`<path data-panel-divider="true" d="M${p.x} ${p.dividerY}H${p.x+p.w}" stroke="#C7BDCD" stroke-width="2"/>`;
      // labelY: napis przy prawej krawędzi na zadanej wysokości (np. obok nagłówka kafelka prac).
      if(p.label)svg+=p.labelY===undefined?text(p.x+16,p.y+18,p.label,24*k,'style="text-anchor:start;fill:#65566C"'):
        text(p.x+p.w-16,p.labelY,p.label,24*k,'style="text-anchor:end;fill:#65566C"');
      continue;
    }
    // Łącznik pionowy do górnej krawędzi panelu albo poziomy, gdy panel stoi obok kafelka.
    const beside=p.from&&p.from.y>=p.y&&p.from.y<=p.y+p.h;
    if(p.from&&!p.innerWork)svg+=`<path d="M${p.from.x} ${p.from.y} ${beside?'H'+p.x:'V'+p.y}" stroke="#805095" stroke-width="3" stroke-dasharray="6 5"/>`;
    svg+=`<rect data-panel-box="true" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="12" fill="#f1eee7" stroke="#958875" stroke-width="2"/>`;
    if(p.label)svg+=text(p.x+18,p.y+18,p.label,20*k,'style="text-anchor:start;fill:#43525b"');
  }
  for(const e of frame.edges) if(e.visible&&(e.subscriber||!(reduced&&e.phase==='unsubscribe'))) {
    const d=e.points.map((p,i)=>(i?'L':'M')+p.join(' ')).join('');
    // Kabel toru (subscriber) zostaje po zakończeniu jako historia; ruch ograniczony pokazuje go od razu w pełni.
    const offset=e.subscriber?(reduced?0:e.offset):reduced?(e.phase==='subscribed'?0:-1):e.offset,width=e.width||6;
    svg+=`<path data-connection="${esc(e.id)}" data-phase="${e.phase}" d="${d}" fill="none" stroke="${e.color}" stroke-width="${width}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${offset}"${e.opacity!==undefined&&e.opacity<1?` opacity="${+e.opacity.toFixed(3)}"`:''}/>`;
    // Unsubscribe z cancelPulse: przebyta (prawa) część kabla szarzeje, szary pocisk „×” jedzie w lewo do nadawcy.
    if(e.grey>0)svg+=`<path data-cancel-trail="${esc(e.id)}" d="${d}" fill="none" stroke="#808890" stroke-width="${width}" pathLength="1" stroke-dasharray="${e.grey.toFixed(4)} 2" stroke-dashoffset="${(-(1-e.grey)).toFixed(4)}"/>`;
    if(e.cancel&&!reduced)svg+=`<g data-cancel="${esc(e.id)}"><circle cx="${e.cancel.x}" cy="${e.cancel.y}" r="${width*3.6}" fill="#808890" stroke="#fff" stroke-width="3"/>${text(e.cancel.x,e.cancel.y+1,'×',width*6,'style="fill:#fff;font-weight:700"')}</g>`;
    // Impuls complete/error: krótki odcinek w kolorze stanu biegnie od nadawcy do odbiorcy.
    if(e.pulse&&!reduced) {
      const len=.18,at=e.pulse.at*(1+len)-len;
      svg+=`<path data-pulse="${esc(e.id)}" d="${d}" fill="none" stroke="${e.pulse.color}" stroke-width="${width*2}" stroke-linecap="round" pathLength="1" stroke-dasharray="${len} 2" stroke-dashoffset="${(-at).toFixed(4)}"/>`;
    }
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
    svg+=`<g data-node="${esc(n.id)}" opacity="${opacity}" data-active="${n.active}" data-work-state="${n.workState}"><rect x="${n.x-n.w/2}" y="${n.y-n.h/2}" width="${n.w}" height="${n.h}" rx="${n.rx??5}" fill="${n.fill}" stroke="${failed?'#b51e2e':n.active?'#805095':'#26343d'}" stroke-width="${failed||n.active?4:1.5}"/>`;
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
    // Wiersze wykonań pod nagłówkiem definicji (rosnący kafelek albo odbiorca z defH): bazowe tło runtime (jaśniejszy
    // odcień kafelka), separator 1 px i pasek koloru toru — tożsamość subskrypcji zostaje w każdym stanie.
    // Stan to tło wiersza, bez ikon: trwa — tło bazowe, complete/error — delikatna zieleń/czerwień z krótkim
    // rozbłyskiem akcentu, unsubscribe — szary, przygaszony wiersz. Nagłówek definicji się nie zmienia.
    const rows=n.laneRows||(n.subscriber&&n.defH!==undefined?[{subscriber:n.subscriber,color:n.laneColor,tint:n.laneTint,
      top:n.y-n.h/2+n.defH,h:n.h-n.defH,growth:1}]:[]);
    const stateOf=id=>(n.laneStates||[]).find(l=>l.subscriber===id);
    const rowTint={completed:'#DDF1E1',error:'#F7D9D9',cancelled:'#E7E8E8'},rowAccent={completed:'#26804E',error:'#C54848'};
    for(const row of rows) {
      const left=n.x-n.w/2,h=Math.max(0,row.h*row.growth-1),lane=stateOf(row.subscriber),state=lane?.state||'running';
      const glow=rowAccent[state]&&!reduced?.28*(1-clamp((frame.time-lane.since)/.6)):0;
      svg+=`<g data-lane-row="${esc(row.subscriber)}" data-row-state="${state}" opacity="${row.growth}">`;
      const base=rowTint[state]||row.tint||n.runtimeFill;
      svg+=`<rect x="${left+1}" y="${row.top}" width="${n.w-2}" height="${h}" fill="${base||'#fff'}"${base?'':' fill-opacity=".35"'}/>`;
      if(glow>0)svg+=`<rect data-row-flash="${state}" x="${left+1}" y="${row.top}" width="${n.w-2}" height="${h}" fill="${rowAccent[state]}" opacity="${glow.toFixed(3)}"/>`;
      // Pasek po lewej: kolor toru, a w hubie kolor wspólnego upstreamu (row.stripe); anulowany wiersz w hubie szarzeje.
      const stripe=row.stripe&&state==='cancelled'?'#808890':row.stripe||row.color;
      svg+=`<rect x="${left+1}" y="${row.top}" width="${6*k}" height="${h}" fill="${stripe}"${state==='cancelled'&&!row.stripe?' opacity=".45"':''}/>`;
      svg+=`<path d="M${left} ${row.top}H${left+n.w}" stroke="#26343d" stroke-opacity=".3" stroke-width="1"/></g>`;
    }
    // Tory subskrybentów: stan wykonania jako mały element w kafelku definicji, gniazda na krawędziach.
    // Hub (np. share): wspólne wejście bez własnego wiersza rozwidla się do wierszy wyjść, przesuniętych w prawo.
    const hubInputs=(n.socketDots||[]).filter(d=>d.side==='in'&&!(n.laneStates||[]).some(l=>l.subscriber===d.subscriber));
    // Przesunięcie robi miejsce na stałe rozwidlenie huba; bez niego (hubFan:false) litera stoi przy pasku toru.
    const chipLeft=n.x-n.w/2+(hubInputs.length&&n.hubFan!==false?50:22)*k,inRow=Boolean(rows.length);
    for(const lane of n.laneStates||[]) {
      const dim=lane.state==='cancelled'?.55:1;
      svg+=`<g data-lane="${esc(lane.subscriber)}" data-lane-role="${lane.role}" data-lane-state="${lane.state}"${lane.progress===undefined?'':` data-work-progress="${lane.progress}"`} opacity="${lane.opacity*dim}"><title>${esc((lane.label||lane.subscriber)+' · '+lane.status)}</title>`;
      if(lane.role==='work'&&inRow) {
        // Postęp producenta to tło wiersza w kolorze toru, przesuwające się do przodu z wyraźnym czołem;
        // po complete wiersz przejmuje zieleń (tło wiersza), po error czerwień, po unsubscribe zostaje szary ślad.
        const row=rows.find(r=>r.subscriber===lane.subscriber),left=n.x-n.w/2+1+7*k,width=n.w-2-7*k;
        if(row&&lane.state!=='completed'&&lane.state!=='error') {
          const h=Math.max(0,row.h*row.growth-1),w=width*lane.progress,fill=lane.state==='cancelled'?'#c3cacf':lane.progressFill||lane.fill||lane.color;
          svg+=`<rect data-work-fill="${lane.progress}" x="${left}" y="${row.top}" width="${w}" height="${h}" fill="${fill}"/>`;
          if(lane.state==='running'&&lane.progress>0&&lane.progress<1)svg+=`<rect x="${left+w-3*k}" y="${row.top}" width="${3*k}" height="${h}" fill="${lane.color}"/>`;
        }
        if(lane.label)svg+=text(n.x-n.w/2+26*k,lane.y,lane.label,24*k,'style="font-weight:700;fill:#43525b"');
      } else if(lane.role==='work') {
        const x0=n.x-n.w/2+(lane.label?48:26)*k,x1=n.x+n.w/2-(inRow?30:62)*k,h=14*k,stopped=lane.state==='error'||lane.state==='cancelled';
        if(lane.label)svg+=text(n.x-n.w/2+26*k,lane.y,lane.label,24*k,'style="font-weight:700;fill:#43525b"');
        svg+=`<rect x="${x0}" y="${lane.y-h/2}" width="${x1-x0}" height="${h}" rx="${h/2}" fill="#26343d" fill-opacity=".18"/>`;
        svg+=`<rect x="${x0}" y="${lane.y-h/2}" width="${(x1-x0)*lane.progress}" height="${h}" rx="${h/2}" fill="${stopped?'#b51e2e':lane.color}"/>`;
        if(!inRow)svg+=laneIcon(n.x+n.w/2-34*k,lane.y,lane,k,frame.time);
      } else if(lane.role==='operator'&&inRow) {
        // Wiersz operatora: sama litera toru; stan niesie tło wiersza.
        if(lane.label)svg+=text(chipLeft+(hubInputs.length&&n.hubFan!==false?18:6)*k,lane.y,lane.label,24*k,`style="font-weight:700;fill:${lane.labelColor||'#43525b'};text-anchor:start"`);
      } else if(lane.role==='operator') {
        const x0=chipLeft,x1=n.x+n.w/2-22*k,h=58*k;
        svg+=`<rect x="${x0}" y="${lane.y-h/2}" width="${x1-x0}" height="${h}" rx="${12*k}" fill="#fff" fill-opacity=".62"/>`;
        svg+=`<circle cx="${x0+20*k}" cy="${lane.y}" r="${7*k}" fill="${lane.color}"/><circle cx="${x1-20*k}" cy="${lane.y}" r="${7*k}" fill="${lane.color}"/>`;
        svg+=laneIcon((x0+x1)/2,lane.y,lane,k,frame.time);
      } else if(lane.role==='receiver'&&n.inbox) {
        // Kompaktowy odbiorca: ikona inbox i identyfikator toru; odebrane wartości rysuje historia (kulki).
        const size=n.inbox.size,x0=n.x-n.w/2+n.inbox.left;
        svg+=inboxIcon(x0,lane.y,size);
        if(lane.label)svg+=text(x0+size+8*k,lane.y,lane.label,n.inbox.font,`style="font-weight:700;fill:${lane.labelColor||'#43525b'};text-anchor:start"`);
      } else if(!inRow)svg+=laneIcon(n.x+n.w/2-30*k,n.y+n.h/2-30*k,lane,k,frame.time);
      svg+='</g>';
    }
    // Rozwidlenie huba: wspólne wejście → chip każdej subskrypcji wyjścia.
    for(const guide of n.splitGuides||[])
      svg+=`<path data-split-guide="true" d="M${guide.x1} ${guide.y1}L${guide.x2} ${guide.y2}" stroke="${guide.color}" stroke-width="${2.5*k}" stroke-dasharray="${6*k} ${6*k}" opacity="${(guide.opacity*.7).toFixed(3)}"/>`;
    if(n.hubFan!==false)for(const input of hubInputs) for(const lane of (n.laneStates||[]).filter(l=>l.role==='operator')) {
      const left=n.x-n.w/2,bend=(chipLeft-left)/2;
      svg+=`<path data-hub-link="${esc(input.subscriber)}-${esc(lane.subscriber)}" d="M${left} ${input.y}C${left+bend} ${input.y} ${chipLeft-bend} ${lane.y} ${chipLeft} ${lane.y}" fill="none" stroke="${input.color}" stroke-width="${3*k}" opacity="${Math.min(input.opacity,lane.opacity)}"/>`;
    }
    // Kieszeń bufora (np. shareReplay): mały pod-kafelek z etykietą i slotem; pusty slot ma przerywany obrys.
    if(n.bufferPocket) {
      const b=n.bufferPocket,size=frame.ball||{r:29,font:35.5},x0=b.x-b.w/2;
      svg+=`<g data-buffer="${esc(n.id)}" data-buffer-size="${b.values.length}"><rect x="${x0+1}" y="${b.y-b.h/2}" width="${b.w-2}" height="${b.h}" rx="${6*k}" fill="#F6F0F8" stroke="#B384C6" stroke-width="2"/>`;
      svg+=text(x0+16*k,b.y,b.label,20*k,'style="text-anchor:start;fill:#65566C;font-weight:700"');
      svg+=`<circle cx="${b.ball.x}" cy="${b.ball.y}" r="${size.r}" fill="none" stroke="#B384C6" stroke-width="2" stroke-dasharray="6 5"/>`;
      // Zapisana kulka pojawia się dokładnie tam, gdzie dojechał token zapisu, więc bez fade-in.
      for(const v of b.values)svg+=ball(b.ball.x,b.ball.y,v.value,v.color,size,1,'data-token="buffered"');
      svg+='</g>';
    }
    for(const dot of n.socketDots||[])
      svg+=`<circle data-socket="${dot.side}" data-subscriber="${esc(dot.subscriber)}" cx="${dot.side==='out'?n.x+n.w/2:n.x-n.w/2}" cy="${dot.y}" r="${dot.r??13*k}" fill="${dot.color}" stroke="#fff" stroke-width="3" opacity="${dot.opacity}"/>`;
    svg+='</g>';
  }
  for(const panel of panels)svg+=executionPanel(frame,panel,reduced);
  for(const t of frame.tokens) {
    const edge=reduced&&frame.edges.find(e=>e.id===t.edge),point=edge?.points?.at(-1);
    // Opcjonalne krycie tokenu (np. wartość gasnąca w Subject bez odbiorców).
    const attrs=`data-value-on="${esc(t.edge||'source')}" data-token="${esc(t.phase)}"${t.opacity===undefined?'':` opacity="${+t.opacity.toFixed(3)}"`}`;
    if(frame.ball){svg+=ball(point?.[0]??t.x,point?.[1]??t.y,t.value,t.color,frame.ball,reduced?1:t.scale||1,attrs);continue;}
    svg+=token(point?.[0]??t.x,point?.[1]??t.y,t.value,t.color,attrs,150*k,Boolean(panels.length),k);
  }
  for(const h of frame.histories) {
    if(h.field) {
      // Pole widoku (opt-in): etykieta właściwości i miejsce na wartość. Odebrana wartość to cały obiekt —
      // pole pokazuje tylko swoją właściwość (field.value), fade-in 0,3 s od dotarcia; wcześniej przerywany slot.
      const k=frame.textScale||1,latest=h.values.at(-1),valueY=h.y+14*k,slotH=22*k,owner=frame.nodes.find(n=>n.id===h.anchor);
      if(owner&&!owner.visible)continue;
      const shown=!latest?0:reduced||latest.shownAt===undefined?1:clamp((frame.time-latest.shownAt)/.3);
      svg+=`<g data-field="${esc(h.anchor)}" data-field-state="${latest?'value':'empty'}" opacity="${owner?.opacity??1}"><title>${esc(h.field.label+' · '+(latest?h.field.value:'brak wartości'))}</title>`;
      svg+=text(h.x,h.y-16*k,h.field.label,16*k,'style="text-anchor:start;font-family:Consolas,ui-monospace,monospace;fill:#55636c"');
      if(shown<1)svg+=`<rect data-field-slot="empty" x="${h.x}" y="${valueY-slotH/2}" width="${Math.min(h.w,150*k)}" height="${slotH}" rx="${5*k}" fill="none" stroke="#8b979e" stroke-width="2" stroke-dasharray="6 5" opacity="${(1-shown).toFixed(3)}"/>`;
      if(shown>0)svg+=text(h.x,valueY,h.field.value,22*k,`data-field-value="${esc(h.field.value)}" opacity="${shown.toFixed(3)}" style="text-anchor:start;font-weight:700;fill:#26323B"`);
      svg+='</g>';
      continue;
    }
    if(frame.ball&&h.balls) {
      // Kulki odebranych wartości od lewej, stały rozmiar; najwyżej h.max ostatnich, fade-in 0,3 s. Gdy nowa kulka
      // wchodzi do pełnej historii, wszystkie przesuwają się płynnie o jedno miejsce w lewo, a najstarsza wygasa.
      const size=h.ball||frame.ball,step=size.r*2+(h.gap??8),max=h.max||3,shown=h.values.slice(-(max+1));
      const overflow=shown.length>max,newest=shown.at(-1);
      const shift=overflow&&!reduced&&newest.shownAt!==undefined?1-clamp((frame.time-newest.shownAt)/.3):0;
      shown.forEach((value,i)=>{
        const fade=reduced||value.shownAt===undefined?1:clamp((frame.time-value.shownAt)/.3);
        if(overflow&&i===0&&shift<=0)return;
        const opacity=overflow&&i===0?+shift.toFixed(3):fade;
        svg+=ball(h.x+(i-(overflow?1:0)+shift)*step,h.y,value.value,value.color||'a',size,1,`data-token="received" opacity="${opacity}"`);
      });
      continue;
    }
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
  // Chwilowy napis zdarzenia nad diagramem (warstwa na wierzchu, niczego nie przesuwa): monospace w kolorze toru,
  // delikatne tło i badge z identyfikatorem toru. Przy ograniczonym ruchu bez przejść.
  for(const c of frame.callouts||[]) {
    const size=c.size||45,charW=size*.6,textW=Array.from(c.text).length*charW,badge=size*1.15,gap=size*.32,pad=size*.45;
    const w=pad+textW+gap+badge+pad,h=size*1.55,x0=c.x-w/2,opacity=reduced?1:c.opacity;
    svg+=`<g data-callout="${esc(c.text)}" data-callout-lane="${esc(c.label)}" opacity="${+opacity.toFixed(3)}" role="note">`;
    svg+=`<rect x="${x0}" y="${c.y-h/2}" width="${w}" height="${h}" rx="${h/2}" fill="${c.fill}" stroke="${c.color}" stroke-opacity=".55" stroke-width="2"/>`;
    svg+=text(x0+pad,c.y+1,c.text,size,`style="text-anchor:start;font-family:Consolas,ui-monospace,monospace;font-weight:700;fill:${c.ink}"`);
    svg+=`<rect x="${x0+pad+textW+gap}" y="${c.y-badge/2}" width="${badge}" height="${badge}" rx="${badge*.22}" fill="${c.color}"/>`;
    svg+=text(x0+pad+textW+gap+badge/2,c.y+1,c.label,size*.82,'style="font-weight:700;fill:#fff"')+'</g>';
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
