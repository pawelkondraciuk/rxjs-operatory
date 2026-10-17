const clamp = value => Math.max(0,Math.min(1,value));

// Geometria jak w kafelkach głównego toru: nagłówek HTTP GET ma wysokość nagłówka definicji (headerH), wiersz — wysokość
// toru (rowH), o ile wszystkie sloty mieszczą się nad dolnym marginesem. Linia podziału stoi w połowie odstępu od kafelków,
// napis panelu — na wysokości nagłówka, przy prawej krawędzi, nad kablami wyników. Kafelek prac zajmuje zakres
// tileLeft–tileRight, a wynik biegnie od jego prawej krawędzi do granicy panelu.
export function createInnerWorkPanel({works,columns,height,large=false,id='jobs',minRows=4,headerH=large?70:56,rowH=large?74:64,
  dividerY=large?203:146,headerTop=large?234:162,tileLeft=44,tileRight=796,instances=false}) {
  const x=28,w=1184,bottom=height-(large?12:8),rowsTop=headerTop+headerH;
  if(instances)return createInstancePanel({works,columns,height,large,id,minRows,tileLeft,x,w,bottom});
  const slots=Math.max(minRows,works.length),rowHeight=Math.min(rowH,(bottom-rowsTop)/slots);
  return {id,innerWork:true,frameless:true,label:'PRACE WEWNĘTRZNE',labelY:headerTop+headerH/2,x,y:dividerY,w,h:bottom-dividerY,dividerY,
    slots:works.length,rowsTop,rowStep:rowHeight,rowHeight,headerH,tileLeft,tileRight,
    identifierW:large?184:172,stageGap:72,font:large?30:25,columns,works};
}

// instances (opt-in): każde uruchomione inner to osobny pipeline z własnymi kafelkami etapów (nagłówek definicji
// i jeden execution lane pod nim) oraz kompaktowym odbiornikiem inbox na wysokości lane. Po lewej identyfikator
// wartości (#1 · A) na wysokości lane. Slot = nagłówek + lane + odstęp; kolejne etapy (np. catchError) stoją w tym
// samym rzędzie, oddzielone kablem tej samej długości co kabel do inboxa. Sloty mieszczą się nad dolnym marginesem.
function createInstancePanel({works,columns,height,large,id,minRows,tileLeft,x,w,bottom}) {
  const headerH=large?56:44,rowH=large?64:50,gap=large?14:10,slots=Math.max(minRows,works.length);
  const rowsTop=bottom-slots*(headerH+rowH)-(slots-1)*gap,dividerY=Math.round((rowsTop+(large?172:130))/2);
  const identifierW=large?140:120,identifierGap=large?16:14,stageW=310,stageGap=110,inboxW=large?64:56;
  const stagesLeft=tileLeft+identifierW+identifierGap,inboxX=stagesLeft+columns.length*(stageW+stageGap);
  return {id,innerWork:true,instances:true,frameless:true,label:'PRACE WEWNĘTRZNE',labelY:rowsTop+headerH/2,x,y:dividerY,w,h:bottom-dividerY,
    dividerY,slots:works.length,rowsTop,rowStep:headerH+rowH+gap,rowHeight:rowH,headerH,tileLeft,tileRight:inboxX+inboxW,
    identifierW,stagesLeft,stageW,stageGap,inboxX,inboxW,font:large?30:25,columns,works};
}

// Widok lokalnego pipeline'u z istniejącego planu. Nie planuje subskrypcji ani nie prowadzi zegara.
// Każdy etap wiąże się z własną krawędzią; jego terminal nie kończy automatycznie całego inner.
export function innerWorkPanelSnapshot(panel, records, births, time) {
  const record = id => records.find(r => r.id === id);
  const connected = r => r ? r.start + r.connectDuration : Infinity;
  // panel.cancelPulse (opt-in): unsubscribe biegnie szarym impulsem × od operatora do pracy; praca jest anulowana po jego dotarciu.
  const pulsed = r => panel.cancelPulse && r?.end?.kind === 'unsubscribe';
  const stateOf = (r, receiver = false) => {
    if (!r || time < r.start) return 'idle';
    if (time < connected(r)) return 'subscribing';
    if (!r.end || time < r.end.at + (receiver || pulsed(r) ? r.end.duration : 0)) return 'active';
    return r.end.kind === 'unsubscribe' ? 'cancelled' : r.end.kind === 'error' ? 'errored' : 'completed';
  };
  // Pierwsza decyzja operatora (work.input z decide) w trakcie pracy: chwila ilustracji i ułamek czasu modelu.
  const pivotOf = (r, work, start, stop) => panel.works.filter(w => w.input).map(w => {
    const e = record(w.input.edge)?.events.find(v => String(v.value) === String(w.input.value));
    return e && {at:e.arrival + (e.decide || 0), fraction:(e.logicalAt - r.logicalStart)/work.duration};
  }).filter(p => p && p.at > start && p.at < stop && p.fraction > 0 && p.fraction < 1).sort((a,b) => a.at-b.at)[0] || null;
  const rows = panel.works.flatMap(work => {
    const output = record(work.edge), born = births.get(work.node) ?? Infinity;
    const queuedAt = work.queuedNode ? births.get(work.queuedNode) : undefined;
    const ignoredAt=work.ignoredNode?births.get(work.ignoredNode):undefined;
    const y = panel.rowsTop + work.slot * (panel.rowStep ?? panel.rowHeight);
    const color = work.color || '#7457D9';
    const base = {id:work.id, slot:work.slot, value:work.value, color, y, h:panel.rowHeight};
    // work.input (opt-in): wejście dotarło do operatora, ale jego los nie jest jeszcze rozstrzygnięty (decide we flow).
    // Od dotarcia widać tylko identyfikator i „?”; kolejka, pominięcie albo nowy inner pojawiają się po decyzji.
    const arrived = work.input ? record(work.input.edge)?.events.find(e => String(e.value) === String(work.input.value)) : undefined;
    const pendingAt = arrived?.arrival, decidedAt = arrived ? arrived.arrival + (arrived.decide || 0) : undefined;
    const pending = pendingAt === undefined ? null : {opacity:clamp((time-pendingAt)/.3), decided:clamp((time-decidedAt)/.3)};
    const settledAt = at => decidedAt === undefined ? at : Math.max(at, decidedAt);
    if(ignoredAt!==undefined) {
      if (pending && time >= pendingAt && time < decidedAt) return [{...base,state:'pending',opacity:pending.opacity,question:1}];
      const shownAt=settledAt(ignoredAt),opacity=clamp((time-shownAt)/.3);
      if (pending && time >= pendingAt) return [{...base,state:'ignored',opacity:1,reveal:opacity,from:'pending'}];
      return time>=ignoredAt&&opacity>0?[{...base,state:'ignored',opacity}]:[];
    }
    const waitingAt=work.queueObservable?born:queuedAt===undefined?undefined:settledAt(queuedAt);
    if (time < born || work.queueObservable&&time<output.start) {
      if (waitingAt !== undefined && time >= waitingAt) {
        const fade=clamp((time-waitingAt)/.3);
        return [{...base,state:'queued',queueLabel:work.queueLabel,existingObservable:Boolean(work.queueObservable),
          ...(pending?{opacity:1,reveal:fade,from:'pending'}:{opacity:fade})}];
      }
      // Przed decyzją (i np. podczas anulowania poprzednika w switchMap) wiersz ma tylko identyfikator; „?” gaśnie po decyzji.
      return pending && time >= pendingAt ? [{...base,state:'pending',opacity:pending.opacity,question:1-pending.decided}] : [];
    }
    if (!output) return [];
    const stages = work.stages.map((stage, i) => {
      const r = record(stage.edge || work.edge), start = connected(r);
      const state = stateOf(r, stage.receiver);
      // Postęp kończy się z odpowiedzią (pierwszy next), jak w kafelku HTTP GET toru; complete przychodzi po niej.
      // Przy anulowaniu zachowujemy potencjalny czas pracy, więc pasek nigdy nie udaje complete.
      const stop = r?.events[0]?.at ?? (r?.end ? r.end.at + (pulsed(r) ? r.end.duration : 0) : start + work.duration);
      const fraction = r?.end?.kind === 'unsubscribe' ? clamp((r.end.logicalAt-r.logicalStart)/work.duration) : 1;
      let progress = state === 'subscribing' || state === 'idle' ? 0 : clamp((time-start)/Math.max(.001,stop-start))*fraction;
      // panel.pace (opt-in): do decyzji operatora o innym wejściu pasek rośnie stałym tempem i w chwili decyzji pokazuje
      // ułamek modelu (np. połowę), niezależnie od tego, co operator zrobi potem. Dalej dochodzi do odpowiedzi
      // albo — przy anulowaniu — rośnie tym samym tempem do dotarcia impulsu ×.
      const pivot = panel.pace && r && stage.progress ? pivotOf(r, work, start, stop) : null;
      if (pivot && progress > 0) {
        const rate = pivot.fraction/(pivot.at-start), t = Math.min(time, stop);
        progress = t < pivot.at ? (t-start)*rate : r.events.length ?
          pivot.fraction+(1-pivot.fraction)*clamp((t-pivot.at)/Math.max(.001,stop-pivot.at)) : Math.min(1, pivot.fraction+(t-pivot.at)*rate);
      }
      const since = r?.end ? r.end.at + (stage.receiver || pulsed(r) ? r.end.duration : 0) : undefined;
      // handles: etap obsługi błędu (np. catchError) pokazuje chwilowy fallback (label, np. of([])) od dotarcia błędu
      // wskazanej krawędzi do własnego zakończenia; potem zwykły stan (complete).
      const handled = stage.handles && record(stage.handles.edge)?.end;
      const caughtAt = handled?.kind === 'error' ? handled.at + handled.duration : undefined;
      const fallback = caughtAt !== undefined && time >= caughtAt && state === 'active' ?
        {label:stage.handles.label, opacity:clamp((time-caughtAt)/.3)} : undefined;
      return {...stage,index:i,state,hasProgress:Boolean(stage.progress),progress,since,...(fallback?{fallback}:{})};
    });
    const establishing=time<Math.max(connected(output),...work.stages.map(s=>connected(record(s.edge||work.edge))));
    const state=establishing?'subscribing':stateOf(output), reveal=clamp((time-(work.queueObservable?output.start:born))/.3);
    // Kable i wartości pozostają w poziomym wierszu, aż do prawej granicy panelu.
    const wires = work.stages.map((stage,i) => {
      const r = record(stage.edge || work.edge), terminal = r.end;
      const p = terminal ? clamp((time-terminal.at)/terminal.duration) : 0;
      const cancelled = terminal?.kind === 'unsubscribe' && time >= terminal.at;
      // Impuls × jedzie od prawej granicy (operator) do etapu; przebyta część kabla szarzeje za nim.
      const cancel = cancelled && pulsed(r) && p < 1 ? {at:p} : null;
      return {index:i, visible:time>=r.start, subscribe:clamp((time-r.start)/r.connectDuration),
        opacity:terminal && time>=terminal.at+terminal.duration ? .35 : 1,
        color:cancelled&&!cancel?'#808890':color,cancel,
        pulse:terminal&&!cancelled&&time>=terminal.at&&p<1?{at:p,color:terminal.kind==='error'?'#C54848':'#26804E'}:null};
    });
    const tokens = work.stages.flatMap((stage,i) => {
      const r = record(stage.edge || work.edge);
      return r.events.filter(e=>time>=e.at&&time<e.arrival).map(e=>({stage:i,value:e.value,color,
        progress:clamp((time-e.at)/(e.arrival-e.at))}));
    });
    // Wiersz widoczny wcześniej (kolejka albo nierozstrzygnięte wejście) płynnie odsłania wykonanie w tym samym slocie.
    const shown=waitingAt!==undefined||pending!==null;
    // instances: inbox inner subscriber na końcu ostatniego etapu. Unsubscribe zaczyna się w nim (od razu szary),
    // complete/error widać po dotarciu terminala — jak odbiorca toru u góry.
    const last = record(work.stages.at(-1).edge || work.edge), end = last?.end;
    const receiver = panel.instances ? (end?.kind === 'unsubscribe' && time >= end.at ? {state:'cancelled', since:end.at} :
      {state:stateOf(last, true), ...(end ? {since:end.at+end.duration} : {})}) : undefined;
    return [{...base,state,queueLabel:work.queueLabel,opacity:shown?1:reveal,reveal:shown?reveal:1,
      ...(shown?{from:waitingAt!==undefined&&born>=waitingAt?'queued':'pending',question:pending?1-pending.decided:0}:{}),stages,wires,tokens,
      ...(receiver?{receiver}:{})}];
  });
  return {...panel, rows};
}
