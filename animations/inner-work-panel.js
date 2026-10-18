const clamp = value => Math.max(0,Math.min(1,value));

// Panel prac wewnętrznych: każde utworzone inner to osobny pipeline w swoim slocie (dawny wspólny kafelek z wierszami
// usunięto — żaden slajd go nie używał). Dół panelu stoi nad dolnym marginesem ramki; bez własnego napisu.
export function createInnerWorkPanel({works,columns,height,large=false,id='jobs',minRows=3}) {
  return createInstancePanel({works,columns,height,large,id,minRows,x:28,w:1184,bottom:height-(large?12:8)});
}

// Każde uruchomione inner to osobny, pełny pipeline w jednym rzędzie:
// ID wykonania (#1) → kulka wartości wejścia (A, A$) → HTTP GET → opcjonalne operatory (np. catchError) → inner subscriber.
// Kolumny są wspólne dla wszystkich slajdów i wykonań (te same x niezależnie od kafelków u góry): ID od x 50, kulka,
// kafelki etapów od x 180 (HTTP GET 300), kolejne etapy dzielą miejsce do subscribera, a subscriber stoi pod odbiorcą
// głównym (840–1210). Etap = nagłówek definicji + execution lane; subscriber — sam lane na wysokości lane etapów.
// Slot = nagłówek + lane + odstęp; trzy sloty mieszczą się nad dolnym marginesem.
export const instanceColumns={idX:50,idW:60,ballW:70,httpW:300,stageGap:60,receiverX:840,receiverW:370};
function createInstancePanel({works,columns,height,large,id,minRows,x,w,bottom}) {
  const headerH=large?56:44,rowH=large?64:50,gap=large?14:10,slots=Math.max(minRows,works.length);
  const rowsTop=bottom-slots*(headerH+rowH)-(slots-1)*gap,dividerY=Math.round((rowsTop+(large?172:130))/2);
  const {idX,idW,ballW,httpW,stageGap,receiverX,receiverW}=instanceColumns,stagesLeft=idX+idW+ballW,rest=columns.length-1;
  const opW=rest?(receiverX-stagesLeft-httpW-(rest+1)*stageGap)/rest:0;
  const stageWs=columns.map((_,i)=>i?opW:httpW);
  const stageXs=stageWs.map((_,i)=>stagesLeft+stageWs.slice(0,i).reduce((sum,width)=>sum+width+stageGap,0));
  return {id,innerWork:true,instances:true,frameless:true,x,y:dividerY,w,h:bottom-dividerY,
    dividerY,slots:works.length,rowsTop,rowStep:headerH+rowH+gap,rowHeight:rowH,headerH,tileLeft:idX,tileRight:receiverX+receiverW,
    idX,idW,ballX:idX+idW+ballW/2,stagesLeft,stageXs,stageWs,stageGap,receiverX,receiverW,font:large?30:25,columns,works};
}

// Widok lokalnego pipeline'u z istniejącego planu. Nie planuje subskrypcji ani nie prowadzi zegara.
// Każdy etap wiąże się z własną krawędzią; jego terminal nie kończy automatycznie całego inner.
export function innerWorkPanelSnapshot(panel, records, births, time, logicalTime = time) {
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
    // concatAll: Observable czeka w kolejce tylko, gdy realnie czeka na poprzednika; pierwszy (subskrybowany od razu,
    // po krótkim przekazaniu) od razu pokazuje pipeline, bez mignięcia „W KOLEJCE”.
    const waits=work.queueObservable&&output&&output.start-born>.5;
    const waitingAt=waits?born:queuedAt===undefined?undefined:settledAt(queuedAt);
    if (time < born || waits&&time<output.start) {
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
      // panel.modelProgress (opt-in): postęp w czasie modelu — stoi, gdy model stoi (przeloty, pytanie), kończy się
      // z odpowiedzią albo zostaje na ułamku modelu w chwili anulowania.
      if (panel.modelProgress && r && stage.progress && progress > 0) {
        const until = r.events[0]?.logicalAt ?? r.end?.logicalAt ?? Infinity;
        progress = clamp((Math.min(logicalTime, until) - r.logicalStart)/work.duration);
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
    const state=establishing?'subscribing':stateOf(output), reveal=clamp((time-(waits?output.start:born))/.3);
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
    // Inner subscriber na końcu ostatniego etapu. Unsubscribe zaczyna się w nim (od razu szary),
    // complete/error widać po dotarciu terminala — jak odbiorca toru u góry.
    const last = record(work.stages.at(-1).edge || work.edge), end = last?.end;
    // Ostatnia wartość, która dotarła do inner subscribera (kulka w jego lane, fade-in od dotarcia).
    const got = last?.events.filter(e => e.arrival <= time).at(-1);
    const receiver = {...(end?.kind === 'unsubscribe' && time >= end.at ? {state:'cancelled', since:end.at} :
      {state:stateOf(last, true), ...(end ? {since:end.at+end.duration} : {})}),
      ...(got ? {value:got.value, valueAt:got.arrival} : {})};
    return [{...base,state,queueLabel:work.queueLabel,opacity:shown?1:reveal,reveal:shown?reveal:1,
      ...(shown?{from:waitingAt!==undefined&&born>=waitingAt?'queued':'pending',question:pending?1-pending.decided:0}:{}),stages,wires,tokens,
      receiver}];
  });
  return {...panel, rows};
}
