import { esc, text, token, wrapLabel, colors, clamp, fitLabel } from './primitives.js';
import { illustration } from './illustrations.js';

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
  if(panel.innerWork)return innerInstancesPanel(frame.innerWorkPanels.find(p=>p.id===panel.id),frame,reduced);
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

// Pipeline wewnętrzny (instances): w każdym rzędzie ID wykonania (#1), kulka wartości wejścia (A / A$), pełne kafelki
// etapów (HTTP GET, opcjonalnie catchError: nagłówek + execution lane) i pełny inner subscriber pod odbiorcą głównym —
// lane z ikoną, etykietą „inner #1”, ostatnią odebraną wartością i statusem zakończenia. Wspólne kolumny z panelu
// (createInstancePanel), więc #1, #2 i #3 mają identyczne x. Wartość bez utworzonego inner (kolejka, pytanie,
// pominięcie) ma ID, kulkę i neutralny placeholder o wysokości lane w miejscu przyszłej pracy — bez etapów i portów.
function innerInstancesPanel(panel,frame,reduced=false) {
  const {rowHeight,headerH,stageXs,stageWs,receiverX,receiverW,font,idX,ballX,stagesLeft}=panel;
  const k=frame.textScale||1,count=panel.columns.length,bar=6*k,h=rowHeight-1;
  const portR=panel.portRadius||8,wireW=panel.wire||4,stageX=i=>stageXs[i];
  const portX=i=>i<count-1?stageX(i+1):receiverX,placeholderX=stagesLeft,placeholderW=receiverX+receiverW-placeholderX;
  const ballSize=panel.ball?{...panel.ball,textFill:panel.ballText}:{r:Math.min(26,rowHeight*.4),font:font*.92,textFill:panel.ballText};
  const fills={completed:'#DDF1E1',cancelled:'#E7E8E8',errored:'#F7D9D9'},accent={completed:'#26804E',errored:'#C54848'};
  const status={completed:'complete',cancelled:'anulowane',errored:'error',subscribing:'subskrybuje',idle:'oczekuje'};
  // Status inner subscribera — ten sam język co odbiorcy na slajdach wprowadzenia (✓ complete, ! error, × odłączono).
  const receiverStatus={completed:['✓ complete','#087438'],errored:['! error','#9B1C28'],cancelled:['× odłączono','#5B6670']};
  const flash=(state,since,x,y,w)=>accent[state]&&!reduced&&since!==undefined&&frame.time-since<.6?
    `<rect data-row-flash="${state}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${accent[state]}" opacity="${(.28*(1-clamp((frame.time-since)/.6))).toFixed(3)}"/>`:'';
  // Neutralny placeholder przyszłej pracy: wysokość lane, od kolumny etapów do prawej krawędzi subscribera.
  const placeholder=(kind,lane,label,opacity=1,labelOpacity=1)=>`<g data-inner-placeholder="${kind}" opacity="${+opacity.toFixed(3)}">`+
    `<rect x="${placeholderX}" y="${lane}" width="${placeholderW}" height="${h}" fill="#EEEBE9"${kind==='queued'?' stroke="#BEB4BF" stroke-width="2" stroke-dasharray="8 6"':''}/>`+
    (label&&labelOpacity>0?text(placeholderX+placeholderW/2,lane+rowHeight/2,label,label==='?'?font*1.25:font,`style="fill:${kind==='ignored'?'#9A939C':'#746B76'};font-weight:${label==='?'?700:600};letter-spacing:.04em"${labelOpacity<1?` opacity="${+labelOpacity.toFixed(3)}"`:''}`):'')+'</g>';
  // ID wykonania i kulka wejścia: stałe przez cały cykl życia; anulowane szarzeje, pominięte jest przygaszone.
  const identity=(row,cy,{muted=false,dim=false}={})=>`<g data-inner-id="${esc(row.id)}"${dim?' opacity=".45"':''}>`+
    text(idX,cy,row.id,panel.idFit?Math.min(font,(panel.idW-8)/(row.id.length*.6)):font,`style="text-anchor:start;fill:${muted?'#808890':row.color};font-weight:700"`)+
    ball(ballX,cy,row.value,row.color,ballSize,1,`data-inner-ball="${esc(row.value)}"${muted?' opacity=".5"':''}`)+'</g>';
  let svg=`<g data-inner-work-panel="${esc(panel.id)}" data-inner-layout="instances">`;
  for(const row of panel.rows) {
    const rowY=reduced?(row.stillY??row.y):row.y,lane=rowY+headerH,cy=lane+rowHeight/2,muted=row.state==='cancelled';
    svg+=`<g data-inner-work="${esc(row.id)}" data-inner-state="${row.state}" data-row-slot="${row.slot}" opacity="${reduced?1:row.opacity}">`;
    svg+=`<title>${esc(row.id+' · '+row.value+' · '+row.state)}</title>`;
    const queuedLabel=row.queueLabel||'W KOLEJCE';
    if(row.state==='pending') {
      svg+=placeholder('pending',lane,'?',1,reduced?Math.round(row.question):row.question)+identity(row,cy)+'</g>';continue;
    }
    if(row.state==='queued'||row.state==='ignored') {
      const queued=row.state==='queued',reveal=reduced||row.reveal===undefined?1:row.reveal;
      // Po decyzji „?” ustępuje stanowi wejścia (kolejka albo pominięcie) w tym samym miejscu.
      if(reveal<1)svg+=placeholder('pending',lane,'?',1-reveal);
      svg+=placeholder(row.state,lane,queued?queuedLabel:'POMINIĘTE',reveal)+identity(row,cy,{dim:!queued})+'</g>';continue;
    }
    // Placeholder ustępuje płynnie pełnemu pipeline'owi w tym samym slocie; ID i kulka zostają na miejscu.
    if(row.reveal<1&&!reduced)svg+=row.from==='pending'?placeholder('pending',lane,'?',1-row.reveal,row.question||0):
      placeholder('queued',lane,queuedLabel,1-row.reveal);
    svg+=`<g opacity="${reduced?1:row.reveal}">`;
    row.stages.forEach((stage,i)=>{
      const column=panel.columns[i],sx=stageX(i),stageW=stageWs[i],fill=fills[stage.state]||column.runtime;
      const labelSize=clamp((stageW-24)/(Math.max(1,column.label.length)*.55),26*k,26*(frame.labelScale||k));
      svg+=`<g data-inner-stage="${esc(column.id)}" data-stage-state="${stage.state}">`;
      svg+=`<rect data-inner-header="${esc(column.id)}" x="${sx}" y="${rowY}" width="${stageW}" height="${headerH}" fill="${muted&&panel.maxVisibleRows?'#DDE1E2':column.fill}"/>`+
        text(sx+stageW/2,rowY+headerH/2,column.label,labelSize,'style="fill:#26323B"');
      svg+=`<rect data-inner-lane="${esc(column.id)}" x="${sx}" y="${lane}" width="${stageW}" height="${h}" fill="${fill}"/>`+flash(stage.state,stage.since,sx,lane,stageW);
      // Postęp jak w kafelku HTTP GET toru: tło całego lane (za paskiem koloru pracy) z czołem w kolorze pracy.
      if(stage.hasProgress&&['active','cancelled'].includes(stage.state)) {
        const px=sx+bar,pw=(sx+stageW-px)*stage.progress;
        svg+=`<rect data-inner-progress="${stage.progress}" x="${px}" y="${lane}" width="${pw}" height="${h}" fill="${muted?'#808890':row.color}" opacity="${muted?.18:.25}"/>`;
        if(stage.state==='active'&&stage.progress>0&&stage.progress<1)svg+=`<rect x="${px+pw-3*k}" y="${lane}" width="${3*k}" height="${h}" fill="${row.color}"/>`;
      }
      svg+=`<rect x="${sx}" y="${lane}" width="${bar}" height="${h}" fill="${muted?'#808890':row.color}"/>`;
      svg+=`<path d="M${sx} ${lane}H${sx+stageW}" stroke="#26343d" stroke-opacity=".3" stroke-width="1"/>`;
      const label=(stage.state==='errored'&&stage.errorLabel)||status[stage.state]||(stage.hasProgress?'w trakcie':'oczekuje');
      if(stage.fallback) {
        const fw=(String(stage.fallback.label).length*.6*font)+28,fx=sx+stageW-14-fw;
        svg+=`<g data-inner-fallback="${esc(stage.fallback.label)}" opacity="${reduced?1:+stage.fallback.opacity.toFixed(3)}"><rect x="${fx}" y="${cy-font*.75}" width="${fw}" height="${font*1.5}" rx="${font*.75}" fill="#F3E6F8" stroke="#B384C6" stroke-width="2"/>`+
          text(fx+fw/2,cy+1,stage.fallback.label,font,'style="font-family:Consolas,ui-monospace,monospace;font-weight:700;fill:#6B3D80"')+'</g>';
      }
      else svg+=text(sx+stageW-16,cy,label,font,`style="text-anchor:end;fill:${stage.state==='completed'?'#26804E':stage.state==='errored'?'#C54848':'#26323B'}"`);
      svg+='</g>';
    });
    // Inner subscriber: pełny lane jak odbiorca główny — pasek koloru pracy, ikona, „inner #n”, odebrana wartość, status.
    const receiver=row.receiver||{state:'active'},iconSize=panel.inboxSize||25,unsubscribed=receiver.state==='cancelled';
    const iconX=receiverX+bar+16,valueX=receiverX+(panel.receiverValueOffset??195),labelX=iconX+iconSize+8*k;
    const labelSize=panel.idFit?Math.min(font*.75,(valueX-ballWidth(row.receiver?.value??'',ballSize)/2-12-labelX)/(('inner '+row.id).length*.62)):font*.75;
    svg+=`<g data-inner-receiver="${esc(row.id)}" data-receiver-state="${receiver.state}"><title>${esc('inner '+row.id+' · '+row.value+' · '+receiver.state)}</title>`;
    svg+=`<rect x="${receiverX}" y="${lane}" width="${receiverW}" height="${h}" fill="${fills[receiver.state]||'#EDE6F8'}"/>`+flash(receiver.state,receiver.since,receiverX,lane,receiverW);
    svg+=`<rect x="${receiverX}" y="${lane}" width="${bar}" height="${h}" fill="${unsubscribed?'#808890':row.color}"${unsubscribed?' opacity=".45"':''}/>`;
    svg+=`<path d="M${receiverX} ${lane}H${receiverX+receiverW}" stroke="#26343d" stroke-opacity=".3" stroke-width="1"/>`;
    svg+=inboxIcon(iconX,cy,iconSize)+text(labelX,cy,'inner '+row.id,labelSize,'style="text-anchor:start;font-weight:700;fill:#43525b"');
    if(receiver.value!==undefined) {
      const shown=reduced?1:clamp((frame.time-receiver.valueAt)/.3);
      svg+=ball(valueX,cy,receiver.value,row.color,ballSize,1,`data-inner-received="${esc(receiver.value)}" opacity="${shown.toFixed(3)}"`);
    }
    const done=receiverStatus[receiver.state];
    if(done) {
      const shown=reduced||receiver.since===undefined?1:clamp((frame.time-receiver.since)/.3);
      svg+=text(receiverX+receiverW-14,cy,done[0],16*k,`data-lane-terminal="${receiver.state}" opacity="${shown.toFixed(3)}" style="font-weight:700;fill:${done[1]};text-anchor:end"`);
    }
    svg+='</g>';
    for(const wire of row.wires) {
      if(!wire.visible)continue;
      const sx=stageX(wire.index)+stageWs[wire.index],ex=portX(wire.index);
      svg+=`<path data-inner-wire="${esc(row.id)}-${wire.index}" d="M${sx} ${cy}H${ex}" fill="none" stroke="${wire.color}" stroke-width="${wireW}" opacity="${wire.opacity}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${reduced?0:-(1-wire.subscribe)}"/>`;
      // Teardown inner: szara przebyta część kabla od subscribera i pocisk „×” jadący w lewo do etapu.
      if(wire.cancel)svg+=`<path data-inner-cancel-trail="${esc(row.id)}-${wire.index}" d="M${ex} ${cy}H${ex-(ex-sx)*wire.cancel.at}" fill="none" stroke="#808890" stroke-width="${wireW}"/>`;
      if(wire.pulse&&!reduced)svg+=`<path data-inner-pulse="${esc(row.id)}-${wire.index}" d="M${sx} ${cy}H${ex}" fill="none" stroke="${wire.pulse.color}" stroke-width="${wireW*2}" stroke-linecap="round" pathLength="1" stroke-dasharray=".18 2" stroke-dashoffset="${(.18-wire.pulse.at*1.18).toFixed(4)}"/>`;
      for(const port of [sx,ex])svg+=`<circle data-inner-port="true" cx="${port}" cy="${cy}" r="${portR}" fill="${wire.cancel&&port===ex?'#808890':wire.color}" stroke="#fff" stroke-width="3" opacity="${wire.opacity*wire.subscribe}"/>`;
      if(wire.cancel&&!reduced) {
        const cx=ex-(ex-sx)*wire.cancel.at;
        svg+=`<g data-inner-cancel="${esc(row.id)}-${wire.index}"><circle cx="${cx}" cy="${cy}" r="${wireW*3.6}" fill="#808890" stroke="#fff" stroke-width="3"/>${text(cx,cy+1,'×',wireW*6,'style="fill:#fff;font-weight:700"')}</g>`;
      }
    }
    for(const t of row.tokens) {
      const sx=stageX(t.stage)+stageWs[t.stage],ex=portX(t.stage);
      svg+=ball(sx+(ex-sx)*t.progress,cy,t.value,t.color,ballSize,1,'data-inner-next="true"');
    }
    svg+='</g>'+identity(row,cy,{muted})+'</g>';
  }
  return svg+'</g>';
}
// Opt-in shape:'pill': stały font, szerokość dopasowana do całej wartości zamiast pomniejszania tekstu.
const ballWidth=(value,size)=>size.shape==='pill'?Math.max(size.r*2,Array.from(String(value)).length*size.font*.6+2*(size.padding??14)):size.r*2;
// Kulka lub kapsułka wartości; scale tylko dla krótkiego pulsu przekształcenia.
function ball(x,y,value,color,size,scale=1,attrs='') {
  const pill=size.shape==='pill',r=size.r*scale,font=pill?size.font:size.fitText?Math.min(size.font,(size.r*2-8)/(Math.max(1,String(value).length)*.6)):size.font;
  const label=pill||size.fitText?String(value):fitLabel(value,Math.max(1,Math.floor(r*2/(size.font*.58))));
  const title=label===String(value)?'':`<title>${esc(value)}</title>`;
  const width=ballWidth(value,size)*scale;
  const shape=pill?`<rect data-value-shape="pill" x="${x-width/2}" y="${y-r}" width="${width}" height="${r*2}" rx="${r}" fill="${colors[color]||color}" stroke="#fff" stroke-width="3"/>`:
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${colors[color]||color}" stroke="#fff" stroke-width="3"/>`;
  return `<g ${attrs}>${title}${shape}${text(x,y+1,label,font*scale,`style="font-weight:700${size.textFill?';fill:'+esc(size.textFill):''}"`)}</g>`;
}
// Jeden wynik złożony z kilku semantycznie kolorowanych części (np. para combineLatest).
// Konfiguracja jest opt-in na poziomie grafu; zwykłe wartości nadal korzystają z ball().
function valuePair(x,y,value,parts,size,scale=1,attrs='') {
  const partWidth=size.partWidth*scale,h=size.height*scale,w=partWidth*parts.length,r=h/2,left=x-w/2,top=y-h/2;
  let out=`<g ${attrs} data-result-pair="${esc(value)}"><title>${esc(value)}</title>`;
  out+=`<rect x="${left}" y="${top}" width="${w}" height="${h}" rx="${r}" fill="${colors[parts[0].color]||parts[0].color}"/>`;
  parts.slice(1).forEach((part,i)=>{
    const px=left+(i+1)*partWidth,last=i===parts.length-2;
    out+=last?`<path d="M${px} ${top}H${left+w-r}A${r} ${r} 0 0 1 ${left+w} ${y}A${r} ${r} 0 0 1 ${left+w-r} ${top+h}H${px}Z" fill="${colors[part.color]||part.color}"/>`:
      `<rect x="${px}" y="${top}" width="${partWidth}" height="${h}" fill="${colors[part.color]||part.color}"/>`;
  });
  parts.forEach((part,i)=>{
    if(i)out+=`<path d="M${left+i*partWidth} ${top+5*scale}V${top+h-5*scale}" stroke="#fff" stroke-width="2" opacity=".8"/>`;
    out+=text(left+(i+.5)*partWidth,y+1,part.value,size.font*scale,`style="font-weight:700;fill:${size.textFill||'#fff'}"`);
  });
  out+=`<rect x="${left}" y="${top}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="#fff" stroke-width="3"/>`;
  out+=text(left-13*scale,y+1,'[',size.font*1.05*scale,'style="font-weight:700;fill:#43525b"')+
    text(left+w+13*scale,y+1,']',size.font*1.05*scale,'style="font-weight:700;fill:#43525b"')+'</g>';
  return out;
}
// Ikona odbiorcy „inbox”: tacka z wcięciem, obrys w kolorze tekstu.
function inboxIcon(x,y,size) {
  const h=size*.78,top=y-h/2,bottom=y+h/2,mid=top+h*.5,right=x+size,line=`stroke="#26323B" stroke-width="${(size/10).toFixed(2)}" fill="none" stroke-linejoin="round" stroke-linecap="round"`;
  return `<g data-icon="inbox"><path d="M${x} ${mid}L${x+size*.2} ${top}H${right-size*.2}L${right} ${mid}V${bottom}H${x}Z" ${line}/>`+
    `<path d="M${x} ${mid}H${x+size*.3}l${size*.08} ${h*.22}H${right-size*.38}l${size*.08} ${-h*.22}H${right}" ${line}/></g>`;
}
// laneTerminalText (opt-in, wyłącznie odbiorca): status zakończenia subskrypcji przy prawej krawędzi wiersza odbiorcy —
// ✓ complete, ! error albo × odłączono (unsubscribe). Pojawia się (fade-in 0,3 s) dopiero po animacji terminalnej:
// complete/error po dotarciu impulsu, unsubscribe po dotarciu × do źródła (lane.statusAt). Tło wiersza niesie kolor stanu.
// Pole widoku (tray.field): stałe miejsce statusu w prawym górnym rogu, przy etykiecie.
// laneTerminalText może nadpisać teksty stanów i offsetY, gdy kompaktowy odbiorca zachowuje poprzedni wynik.
const laneTerminalStatus={completed:['✓ complete','#087438'],error:['! error','#9B1C28'],cancelled:['× odłączono','#5B6670']};
function laneTerminalLabel(n,lane,k,frame,reduced) {
  const base=n.laneTerminalText&&laneTerminalStatus[lane.state];
  if(!base)return '';
  const status=[n.laneTerminalText[lane.state]??base[0],base[1]];
  const at=lane.statusAt??lane.since,opacity=reduced?1:clamp((frame.time-at)/.3);
  if(opacity<=0)return '';
  const size=16*k,right=n.x+n.w/2-14*k;
  const field=frame.histories?.find(h=>h.anchor===n.id&&h.field);
  const y=field?field.y-16*k:lane.y;
  return text(right,y+(n.laneTerminalText.offsetY??0),status[0],size,
    `data-lane-terminal="${lane.state}" opacity="${opacity.toFixed(3)}" style="font-weight:700;fill:${status[1]};text-anchor:end"`);
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
// Ogólny panel wyników UI. Fraza i zakresy wyróżnień pochodzą ze snapshotu;
// renderer nie filtruje danych ani nie zna sekwencji konkretnego slajdu.
function searchPanel(panel,time,reduced) {
  const {x,y,w,h}=panel,inset=28,inputY=y+66,listY=y+166,rowH=62;
  let svg=`<g data-search-panel="${esc(panel.id)}" data-query="${esc(panel.query)}">`;
  svg+=`<rect x="${x+2}" y="${y+7}" width="${w-4}" height="${h}" rx="20" fill="#6c5a3910"/>`;
  svg+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="#FFFDFA" stroke="#D9CFBE" stroke-width="1.5"/>`;
  svg+=text(x+inset,y+35,panel.label,32,'style="text-anchor:start;fill:#655E53;font-weight:600"');
  svg+=`<rect x="${x+inset}" y="${inputY}" width="${w-inset*2}" height="82" rx="12" fill="#FAF6EE" stroke="#AB98BA" stroke-width="1.5"/>`;
  svg+=`<circle cx="${x+inset+34}" cy="${inputY+37}" r="12" fill="none" stroke="#786880" stroke-width="3"/><path d="M${x+inset+43} ${inputY+46}l11 11" stroke="#786880" stroke-width="3" stroke-linecap="round"/>`;
  const valueX=x+inset+76;
  svg+=text(valueX,inputY+43,panel.query||panel.placeholder,40,`data-search-input="true" style="text-anchor:start;font-family:Consolas,ui-monospace,monospace;fill:${panel.query?'#26323B':'#8A8379'}"`);
  if(reduced||Math.floor(time*2)%2===0) {
    const cursorX=valueX+panel.query.length*24+3;
    svg+=`<path data-search-cursor="true" d="M${cursorX} ${inputY+21}v42" stroke="#695078" stroke-width="2.5"/>`;
  }
  const opacity=reduced?(panel.query&&panel.dropdownOpacity>0?1:0):panel.dropdownOpacity;
  if(panel.results.length&&opacity>0) {
    svg+=`<g data-search-dropdown="true" opacity="${+opacity.toFixed(3)}">`;
    svg+=`<rect x="${x+inset}" y="${listY}" width="${w-inset*2}" height="${panel.results.length*rowH+16}" rx="12" fill="#FFFEFC" stroke="#E4DCCE"/>`;
    panel.results.forEach((result,index)=>{
      const rowY=listY+8+index*rowH;
      svg+=`<g data-search-result="${esc(result.label)}">`;
      if(index===0)svg+=`<rect x="${x+inset+8}" y="${rowY}" width="${w-inset*2-16}" height="${rowH}" rx="8" fill="#EEE7F2"/>`;
      else svg+=`<path d="M${x+inset+20} ${rowY}h${w-inset*2-40}" stroke="#EDE7DD"/>`;
      svg+=`<rect x="${x+inset+20}" y="${rowY+13}" width="36" height="36" rx="8" fill="${index===0?'#DCCDE6':'#F0EBE2'}"/>`;
      svg+=text(x+inset+38,rowY+32,result.label[0],22,'style="font-weight:700;fill:#675674"');
      let offset=0,label='';
      for(const match of result.matches) {
        label+=esc(result.label.slice(offset,match.start));
        label+=`<tspan data-search-match="true" style="font-weight:750;fill:#513568">${esc(result.label.slice(match.start,match.end))}</tspan>`;
        offset=match.end;
      }
      label+=esc(result.label.slice(offset));
      svg+=`<text x="${x+inset+80}" y="${rowY+32}" dominant-baseline="middle" style="text-anchor:start;font-size:36px;fill:#37414A">${label}</text></g>`;
    });
    svg+='</g>';
  }
  return svg+'</g>';
}

// Wykres poziomy (opt-in graph.barCharts): nazwa, pasek na wspólnej skali 100%, procent i liczba w stałych kolumnach.
// Płaski, bez osi i siatki; przy ograniczonym ruchu odsłonięcie jest natychmiastowe.
const serif="'Palatino Linotype','Book Antiqua',Palatino,Georgia,'Times New Roman','Liberation Serif',serif";
function barChart(chart,reduced) {
  const progress=reduced?(chart.progress>0?1:0):chart.progress,values=reduced?(chart.valuesOpacity>0?1:0):chart.valuesOpacity;
  let svg=`<g data-bar-chart="${esc(chart.id)}" data-progress="${+progress.toFixed(4)}">`;
  svg+=text(chart.labelX-222,chart.titleY,chart.title,40,`data-chart-title="true" style="text-anchor:start;font-family:${serif};font-weight:700;fill:#26323B"`);
  chart.rows.forEach((row,index)=>{
    const cy=chart.rowTop+index*chart.rowStep,width=chart.barW*row.share/100*progress;
    svg+=`<g data-bar="${esc(row.label)}" data-share="${row.share}" data-count="${row.count}">`;
    svg+=text(chart.labelX,cy+1,row.label,34,'style="text-anchor:end;font-family:Consolas,ui-monospace,monospace;font-weight:700;fill:#26323B"');
    svg+=`<rect data-bar-track="true" x="${chart.barX}" y="${cy-chart.barH/2}" width="${chart.barW}" height="${chart.barH}" fill="#ECE6DA" opacity=".55"/>`;
    if(width>0)svg+=`<rect data-bar-fill="true" x="${chart.barX}" y="${cy-chart.barH/2}" width="${+width.toFixed(3)}" height="${chart.barH}" fill="${row.fill}"/>`;
    if(values>0)svg+=`<g data-bar-values="true" opacity="${+values.toFixed(3)}">`+
      text(chart.percentX,cy+1,row.percent,38,`style="text-anchor:end;font-weight:700;fill:${row.ink}"`)+
      text(chart.countX,cy+2,row.calls,26,'style="text-anchor:end;fill:#43525B"')+'</g>';
    svg+='</g>';
  });
  return svg+'</g>';
}
// Duże liczby (opt-in graph.bigStats): liczba, nazwa operatora i krótki opis, bez kart i ramek.
function bigStat(stat,reduced) {
  const opacity=reduced?(stat.opacity>0?1:0):stat.opacity;
  if(opacity<=0)return '';
  return `<g data-big-stat="${esc(stat.id)}" opacity="${+opacity.toFixed(3)}">`+
    text(stat.x,stat.y,stat.value,stat.size,`style="font-family:${serif};font-weight:700;fill:${stat.ink}"`)+
    text(stat.x,stat.y+stat.size*.68,stat.label,30,'style="font-family:Consolas,ui-monospace,monospace;font-weight:700;fill:#26323B"')+
    text(stat.x,stat.y+stat.size*.68+44,stat.note,27,'style="font-style:italic;fill:#43525B"')+'</g>';
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
    // offsetY (opt-in node.enter): wjazd całego kafelka z wierszami i portami do jego miejsca.
    const enter=n.offsetY&&!reduced?` transform="translate(0 ${+n.offsetY.toFixed(2)})"`:'';
    svg+=`<g data-node="${esc(n.id)}" opacity="${opacity}" data-active="${n.active}" data-work-state="${n.workState}"${enter}><rect x="${n.x-n.w/2}" y="${n.y-n.h/2}" width="${n.w}" height="${n.h}" rx="${n.rx??5}" fill="${n.fill}" stroke="${failed?'#b51e2e':n.active?'#805095':'#26343d'}" stroke-width="${failed||n.active?4:1.5}"/>`;
    // statusInside trzyma stan w kafelku, gdy pod nim stoi panel (np. EMISJE pod odbiorcą).
    const inside=n.statusInside&&n.status,labelShift=inside?-12*k:0;
    // Etykieta kafelka rośnie do labelScale (4:3), o ile najdłuższa linia mieści się w szerokości; inaczej zostaje przy textScale.
    const longest=Math.max(1,...lines.map(line=>Array.from(line).length));
    const naturalLabelSize=clamp((n.w-24)/(longest*.55),26*k,26*(frame.labelScale||k));
    // subLabel (opt-in, np. konfiguracja operatora): mała pigułka pod nazwą w nagłówku; nazwa przesuwa się w górę
    // i zmniejsza do połowy wysokości nagłówka. subLabelSince podświetla ją przez 1,5 s (zmiana konfiguracji).
    const sub=n.subLabel&&n.defH?{size:Math.min(17*k,n.defH*.32),dy:n.defH*.25}:null;
    const labelSize=Math.min(n.labelSize??naturalLabelSize,sub?n.defH*.5:Infinity),lineStep=28*labelSize/26,labelX=n.labelX??n.x;
    const labelY=n.y+(n.labelOffset||0)+labelShift-(sub?n.defH*.17:0);
    lines.forEach((line,i)=>svg+=text(labelX,labelY+(i-(lines.length-1)/2)*lineStep,line,labelSize,n.notification&&!n.terminalBadge?'style="fill:#fff"':''));
    if(sub) {
      const y=labelY+n.defH*.17+sub.dy,w=String(n.subLabel).length*.52*sub.size+20*k,h=sub.size*1.45;
      const flash=n.subLabelSince===undefined||reduced?0:1-clamp((frame.time-n.subLabelSince)/1.5);
      svg+=`<g data-sub-label="${esc(n.subLabel)}"><rect x="${n.x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="${h/2}" fill="#F3E6F8" stroke="#8E5AA6" stroke-width="${(1.5+3*flash).toFixed(2)}"/>`+
        (flash>0?`<rect data-sub-label-flash="true" x="${n.x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="${h/2}" fill="#B384C6" opacity="${(.55*flash).toFixed(3)}"/>`:'')+
        text(n.x,y+1,n.subLabel,sub.size,'style="font-weight:700;fill:#5B2D70"')+'</g>';
    }
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
      svg+=`<path d="M${left} ${row.top}H${left+n.w}" stroke="#26343d" stroke-opacity=".3" stroke-width="1"/>`;
      // Wiersz subskrypcji wejścia huba (inputRow, np. #1 w shareReplay): sama etykieta, stan niesie upstream.
      if(row.label)svg+=text(left+22*k,row.top+h/2,row.label,24*k,'style="font-weight:700;fill:#43525b;text-anchor:start"');
      svg+='</g>';
    }
    // Stos kolejnych wykonań jednego cold źródła: najnowsze jest zawsze pierwszym wierszem pod nagłówkiem,
    // a zakończone próby pozostają poniżej jako historia. Pozycje i wzrost pochodzą z deterministycznego snapshotu.
    for(const row of n.executionRows||[]) {
      const left=n.x-n.w/2,h=Math.max(0,row.h-1),stateFill={completed:'#DDF1E1',error:'#F7D9D9',cancelled:'#E7E8E8'}[row.state]||n.runtimeFill||'#fff';
      const status=row.status??{subscribing:'subskrybuje',running:'w trakcie',completed:'✓ complete',error:'! error',cancelled:'× odłączono'}[row.state];
      const ink={completed:'#087438',error:'#9B1C28',cancelled:'#5B6670'}[row.state]||'#26323B';
      svg+=`<g data-execution-row="${esc(row.id)}" data-row-rank="${row.rank.toFixed(4)}" data-row-state="${row.state}" opacity="${row.growth.toFixed(3)}">`;
      svg+=`<rect x="${left+1}" y="${row.top}" width="${n.w-2}" height="${h}" fill="${stateFill}"/>`;
      svg+=`<rect x="${left+1}" y="${row.top}" width="${7*k}" height="${h}" fill="${row.state==='cancelled'?'#808890':row.color}"${row.state==='cancelled'?' opacity=".45"':''}/>`;
      if(row.state==='running'&&row.progress>0) {
        const x0=left+1+7*k,width=n.w-2-7*k,w=width*row.progress;
        svg+=`<rect data-work-fill="${row.progress}" x="${x0}" y="${row.top}" width="${w}" height="${h}" fill="${row.color}" fill-opacity=".24"/>`;
        if(row.progress<1)svg+=`<rect x="${x0+w-3*k}" y="${row.top}" width="${3*k}" height="${h}" fill="${row.color}"/>`;
      }
      svg+=`<path d="M${left} ${row.top}H${left+n.w}" stroke="#26343d" stroke-opacity=".3" stroke-width="1"/>`;
      if(h>20*k)svg+=text(left+24*k,row.top+h/2,row.id,23*k,'style="font-weight:700;fill:#43525b;text-anchor:start"')+
        text(left+n.w-16*k,row.top+h/2,status,19*k,`style="font-weight:700;fill:${ink};text-anchor:end"`);
      svg+='</g>';
    }
    // Tory subskrybentów: stan wykonania jako mały element w kafelku definicji, gniazda na krawędziach.
    // Hub (np. share): wspólne wejście bez własnego wiersza rozwidla się do wierszy wyjść, przesuniętych w prawo.
    const hubInputs=(n.socketDots||[]).filter(d=>d.side==='in'&&!(n.laneStates||[]).some(l=>l.subscriber===d.subscriber));
    // Przesunięcie robi miejsce na stałe rozwidlenie huba; bez niego (hubFan:false) litera stoi przy pasku toru.
    const chipLeft=n.x-n.w/2+(hubInputs.length&&n.hubFan!==false?50:22)*k,inRow=Boolean(rows.length);
    // Opcjonalny odbiorca definicji jest czytelny także przed pierwszą subskrypcją; zostaje pod wierszem odbiorcy,
    // dopóki ten nie skończy fade-in (bez mignięcia ikony i litery przy subscribe).
    if(n.inbox?.ready&&!(n.laneStates||[]).some(lane=>lane.role==='receiver'&&lane.opacity>=1)) {
      const x0=n.x-n.w/2+n.inbox.left,y=n.defH?n.top+n.defH+n.rowH/2:n.y;
      svg+=inboxIcon(x0,y,n.inbox.size)+text(x0+n.inbox.size+8*k,y,n.inbox.label??n.subscriber,n.inbox.font,
        'style="font-weight:700;fill:#43525b;text-anchor:start"');
    }
    for(const lane of n.laneStates||[]) {
      if(n.executionStack&&lane.role==='work')continue;
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
        // Timer operatora (laneTimer): postęp jako tło całej wysokości wiersza z czołem w kolorze toru i czytelny stan
        // (np. cisza: 2,4 s); reset wraca do początku, bo postęp liczy się od ostatniego startu.
        const timerRow=lane.timer&&rows.find(r=>r.subscriber===lane.subscriber);
        if(timerRow) {
          const h=Math.max(0,timerRow.h*timerRow.growth-1),left=n.x-n.w/2+1+7*k,width=n.w-2-7*k,w=width*lane.timer.progress;
          if(lane.timer.active) {
            svg+=`<rect data-lane-timer="${+lane.timer.progress.toFixed(4)}" x="${left}" y="${timerRow.top}" width="${w}" height="${h}" fill="${lane.progressFill||lane.fill||lane.color}"/>`;
            if(lane.timer.progress>0)svg+=`<rect x="${left+w-3*k}" y="${timerRow.top}" width="${3*k}" height="${h}" fill="${lane.color}"/>`;
          }
          svg+=text(n.x-n.w/2+(n.laneTimer.textInset??80)*k,lane.y,lane.timer.text,n.laneTimer.textSize??22*k,`data-lane-timer-text="true" style="text-anchor:start;font-weight:${lane.timer.active?700:500};fill:${lane.timer.active?'#26323B':'#7A858C'}"`);
        }
        // Wiersz operatora: sama litera toru; stan niesie tło wiersza.
        if(lane.label&&!rows.some(row=>row.subscriber===lane.subscriber&&row.label))svg+=text(chipLeft+(hubInputs.length&&n.hubFan!==false?18:6)*k,lane.y,lane.label,24*k,`style="font-weight:700;fill:${lane.labelColor||'#43525b'};text-anchor:start"`);
        // Chwilowy fallback (np. of([]) w catchError): pigułka przy prawej krawędzi wiersza, jak etap catchError w panelu prac.
        if(lane.fallback) {
          const font=20*k,fw=String(lane.fallback.label).length*.6*font+16*k,fx=n.x+n.w/2-12*k-fw;
          svg+=`<g data-lane-fallback="${esc(lane.fallback.label)}" opacity="${reduced?1:+lane.fallback.opacity.toFixed(3)}"><rect x="${fx}" y="${lane.y-font*.75}" width="${fw}" height="${font*1.5}" rx="${font*.75}" fill="#F3E6F8" stroke="#B384C6" stroke-width="2"/>`+
            text(fx+fw/2,lane.y+1,lane.fallback.label,font,'style="font-family:Consolas,ui-monospace,monospace;font-weight:700;fill:#6B3D80"')+'</g>';
        }
        // Pamięć operatora (np. prev: A) przy prawej krawędzi wiersza; zmiana wartości i porównanie krótko podświetlają slot.
        // Szerokość mieści najdłuższą wartość sceny (m.chars), więc slot nie zmienia rozmiaru przy przejściu — → 42.
        if(lane.memory?.ball) {
          // Pamięć jako kulka (memory.ball): zwykła kulka wartości przed portem wyjścia, bez ramki i etykiety; pusta pamięć
          // nic nie rysuje. Nowa wartość podmienia kulkę pod nadjeżdżającą kulką, porównanie daje krótki puls skali.
          const m=lane.memory,pulse=m.comparedAt===undefined||reduced?0:clamp(1-(frame.time-m.comparedAt)/.3);
          if(m.value!==undefined)svg+=ball(m.x,lane.y,m.value,m.color,frame.ball||{r:25,font:29,textFill:'#fff'},1+.15*pulse,
            `data-lane-memory="${esc(String(m.value))}" data-token="memory"`);
        } else if(lane.memory) {
          const m=lane.memory,font=20*k,h=font*1.6,w=(m.label.length+2+(m.chars||1))*.6*font+20*k,x0=n.x+n.w/2-12*k-w,since=t=>t!==undefined&&!reduced?clamp((frame.time-t)/.6):1;
          const changed=1-since(m.since),compared=1-since(m.comparedAt),value=m.value??m.empty;
          svg+=`<g data-lane-memory="${esc(String(m.value??''))}"><title>${esc(m.label+': '+value)}</title>`+
            `<rect x="${x0}" y="${lane.y-h/2}" width="${w}" height="${h}" rx="${6*k}" fill="#fff" stroke="${changed>0?m.color&&colors[m.color]||m.color||'#7457D9':compared>0?'#808890':'#B9AFC9'}" stroke-width="${2+3*Math.max(changed,compared)}"/>`+
            `<text x="${x0+10*k}" y="${lane.y}" font-size="${+font.toFixed(2)}" dominant-baseline="middle" style="font-family:Consolas,ui-monospace,monospace;fill:#55636c;text-anchor:start">${esc(m.label)}: <tspan style="font-weight:700;fill:${m.value===undefined?'#8b979e':m.color&&colors[m.color]||m.color||'#26323B'}">${esc(value)}</tspan></text></g>`;
        }
      } else if(lane.role==='operator') {
        const x0=chipLeft,x1=n.x+n.w/2-22*k,h=58*k;
        svg+=`<rect x="${x0}" y="${lane.y-h/2}" width="${x1-x0}" height="${h}" rx="${12*k}" fill="#fff" fill-opacity=".62"/>`;
        svg+=`<circle cx="${x0+20*k}" cy="${lane.y}" r="${7*k}" fill="${lane.color}"/><circle cx="${x1-20*k}" cy="${lane.y}" r="${7*k}" fill="${lane.color}"/>`;
        svg+=laneIcon((x0+x1)/2,lane.y,lane,k,frame.time);
      } else if(lane.role==='receiver'&&n.inbox) {
        // Kompaktowy odbiorca: ikona inbox i identyfikator toru; odebrane wartości rysuje historia (kulki).
        const size=n.inbox.size,x0=n.x-n.w/2+n.inbox.left;
        svg+=inboxIcon(x0,lane.y,size);
        const label=n.inbox.label??lane.label;
        if(label)svg+=text(x0+size+8*k,lane.y,label,n.inbox.font,`style="font-weight:700;fill:${lane.labelColor||'#43525b'};text-anchor:start"`);
        svg+=laneTerminalLabel(n,lane,k,frame,reduced);
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
      for(const v of b.values)svg+=ball(b.ball.x,b.ball.y,v.value,v.color,size,v.scale??1,
        'data-token="buffered"'+(v.opacity===undefined?'':` data-buffer-clear="true" opacity="${v.opacity.toFixed(3)}"`));
      svg+='</g>';
    }
    // Wspólna kulka pamięci huba (replayMemory, np. shareReplay(1)): wygląd jak pamięć distinctUntilChanged; pusta — nic,
    // przy zapisie nowej wartości krótki puls skali.
    if(n.memoryBall?.value!==undefined) {
      const m=n.memoryBall,pulse=reduced?0:clamp(1-(frame.time-m.since)/.3);
      svg+=ball(m.x,m.y,m.value,m.color,frame.ball||{r:25,font:29,textFill:'#fff'},1+.15*pulse,`data-lane-memory="${esc(String(m.value))}" data-token="memory"`);
    }
    for(const m of n.memoryBalls||[]) {
      const size=m.ball||frame.ball||{r:25,font:29,textFill:'#fff'},id=m.id||m.edge,label=m.label||id,empty=m.empty??'—';
      svg+=`<g data-memory-slot="${esc(id)}" data-memory-value="${esc(String(m.value??''))}">`+
        text(m.x-size.r-14*k,m.y,`${label}:`,20*k,'style="font-family:Consolas,ui-monospace,monospace;font-weight:700;fill:#65566C;text-anchor:end"')+
        `<circle cx="${m.x}" cy="${m.y}" r="${size.r}" fill="none" stroke="#B384C6" stroke-width="2" stroke-dasharray="6 5"/>`;
      if(m.value===undefined)svg+=text(m.x,m.y+1,empty,size.font*.8,'style="font-weight:700;fill:#8b7695"');
      else {
        const pulse=reduced?0:clamp(1-(frame.time-m.since)/.3);
        svg+=ball(m.x,m.y,m.value,m.color,size,1+.15*pulse,
          `data-lane-memory="${esc(String(m.value))}" data-token="memory"`);
      }
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
    if(frame.ball?.valueParts?.[t.value]){svg+=valuePair(point?.[0]??t.x,point?.[1]??t.y,t.value,frame.ball.valueParts[t.value],frame.ball.pair,reduced?1:t.scale||1,attrs);continue;}
    if(frame.ball){svg+=ball(point?.[0]??t.x,point?.[1]??t.y,t.value,t.color,frame.ball,reduced?1:t.scale||1,attrs);continue;}
    svg+=token(point?.[0]??t.x,point?.[1]??t.y,t.value,t.color,attrs,150*k,Boolean(panels.length),k);
  }
  for(const h of frame.histories) {
    if(h.field) {
      // Pole widoku (opt-in): etykieta właściwości i miejsce na wartość. Odebrana wartość to cały obiekt —
      // pole pokazuje tylko swoją właściwość (field.value), fade-in 0,3 s od dotarcia; wcześniej przerywany slot.
      const k=frame.textScale||1,latest=h.values.at(-1),valueY=h.y+14*k,slotH=22*k,owner=frame.nodes.find(n=>n.id===h.anchor);
      if(owner&&!owner.visible)continue;
      // Błąd (h.failed, opt-in field.error) zastępuje placeholder komunikatem w kolorze błędu, z tym samym fade-in.
      const failed=!latest&&h.failed,since=latest?latest.shownAt:failed?h.failed.shownAt:undefined;
      const shown=!latest&&!failed?0:reduced||since===undefined?1:clamp((frame.time-since)/.3);
      svg+=`<g data-field="${esc(h.anchor)}" data-field-state="${latest?'value':failed?'error':'empty'}" opacity="${owner?.opacity??1}"><title>${esc(h.field.label+' · '+(latest?h.field.value:failed?h.field.error:'brak wartości'))}</title>`;
      svg+=text(h.x,h.y-16*k,h.field.label,16*k,'style="text-anchor:start;font-family:Consolas,ui-monospace,monospace;fill:#55636c"');
      if(shown<1)svg+=`<rect data-field-slot="empty" x="${h.x}" y="${valueY-slotH/2}" width="${Math.min(h.w,150*k)}" height="${slotH}" rx="${5*k}" fill="none" stroke="#8b979e" stroke-width="2" stroke-dasharray="6 5" opacity="${(1-shown).toFixed(3)}"/>`;
      if(shown>0&&failed)svg+=text(h.x,valueY,h.field.error,22*k,`data-field-error="${esc(h.field.error)}" opacity="${shown.toFixed(3)}" style="text-anchor:start;font-weight:700;fill:#9B1C28"`);
      else if(shown>0)svg+=text(h.x,valueY,h.field.value,22*k,`data-field-value="${esc(h.field.value)}" opacity="${shown.toFixed(3)}" style="text-anchor:start;font-weight:700;fill:#26323B"`);
      svg+='</g>';
      continue;
    }
    if(frame.ball&&h.balls) {
      // Kulki odebranych wartości od lewej, stały rozmiar; najwyżej h.max ostatnich, fade-in 0,3 s. Gdy nowa kulka
      // wchodzi do pełnej historii, wszystkie przesuwają się płynnie o jedno miejsce w lewo, a najstarsza wygasa.
      const size=h.ball||frame.ball,max=h.max||3;
      // Jedna szeroka kapsułka zastępuje poprzednią w tym samym miejscu, bez wjazdu spoza kafelka.
      const shown=h.values.slice(-(size.shape==='pill'&&max===1?1:max+1));
      const step=Math.max(size.r*2,...shown.map(value=>ballWidth(value.value,size)))+(h.gap??8);
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
    if(h.pairs) {
      const shown=h.values.slice(-3);
      shown.forEach((v,i)=>{
        const opacity=reduced||v.shownAt===undefined?1:clamp((frame.time-v.shownAt)/.3);
        const columns=h.columns||1,x=h.x+(i%columns)*(h.columnStep||0),y=h.y+Math.floor(i/columns)*(h.lineStep||0);
        svg+=valuePair(x,y,v.value,frame.ball?.valueParts?.[v.value]||[],h.pair||frame.ball.pair,1,
          `data-token="received" opacity="${opacity}"`);
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
    // Pusty label (np. ręczne subject$.next(user) — to nie jest wykonanie toru) pomija badge.
    const size=c.size||45,charW=size*.6,textW=Array.from(c.text).length*charW,badge=c.label===''?0:size*1.15,gap=badge?size*.32:0,pad=size*.45;
    const w=pad+textW+gap+badge+pad,h=size*1.55,x0=c.x-w/2,opacity=reduced?1:c.opacity;
    svg+=`<g data-callout="${esc(c.text)}" data-callout-lane="${esc(c.label)}" opacity="${+opacity.toFixed(3)}" role="note">`;
    svg+=`<rect x="${x0}" y="${c.y-h/2}" width="${w}" height="${h}" rx="${h/2}" fill="${c.fill}" stroke="${c.color}" stroke-opacity=".55" stroke-width="2"/>`;
    svg+=text(x0+pad,c.y+1,c.text,size,`style="text-anchor:start;font-family:Consolas,ui-monospace,monospace;font-weight:700;fill:${c.ink}"`);
    if(badge)svg+=`<rect x="${x0+pad+textW+gap}" y="${c.y-badge/2}" width="${badge}" height="${badge}" rx="${badge*.22}" fill="${c.color}"/>`+
      text(x0+pad+textW+gap+badge/2,c.y+1,c.label,size*.82,'style="font-weight:700;fill:#fff"');
    svg+='</g>';
  }
  for(const panel of frame.searchPanels||[])svg+=searchPanel(panel,frame.time,reduced);
  for(const chart of frame.barCharts||[])svg+=barChart(chart,reduced);
  for(const stat of frame.bigStats||[])svg+=bigStat(stat,reduced);
  for(const item of (reduced&&frame.reducedIllustrations)||frame.illustrations||[])svg+=illustration(item);
  for(const readout of frame.readouts||[]) {
    const size=readout.font||26,value=String(readout.value);
    svg+=`<g data-readout="${esc(readout.id)}"><rect x="${readout.x-readout.w/2}" y="${readout.y-readout.h/2}" width="${readout.w}" height="${readout.h}" rx="6" fill="${readout.fill||'#fff'}" stroke="${readout.stroke||'#43525b'}" stroke-width="2"/>`;
    svg+=text(readout.x,readout.y+1,value,size,'style="font-family:Consolas,ui-monospace,monospace;fill:#26323B"');
    if(readout.cursor) {
      const x=readout.x+value.length*size*.3+5,opacity=reduced||Math.floor(frame.time*2)%2===0?1:0;
      svg+=`<path data-input-cursor="true" d="M${x} ${readout.y-size*.5}v${size}" stroke="#26323B" stroke-width="2" opacity="${opacity}"/>`;
    }
    svg+='</g>';
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
