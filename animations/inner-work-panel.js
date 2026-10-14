const clamp = value => Math.max(0,Math.min(1,value));

// Geometria jak w kafelkach głównego toru: nagłówek HTTP GET ma wysokość nagłówka definicji (headerH), wiersz — wysokość
// toru (rowH), o ile wszystkie sloty mieszczą się nad dolnym marginesem. Linia podziału stoi w połowie odstępu od kafelków,
// napis panelu — na wysokości nagłówka, przy prawej krawędzi, nad kablami wyników. Kafelek prac zajmuje zakres
// tileLeft–tileRight, a wynik biegnie od jego prawej krawędzi do granicy panelu.
export function createInnerWorkPanel({works,columns,height,large=false,id='jobs',minRows=4,headerH=large?70:56,rowH=large?74:64,
  dividerY=large?203:146,headerTop=large?234:162,tileLeft=44,tileRight=796}) {
  const x=28,w=1184,bottom=height-(large?12:8),rowsTop=headerTop+headerH;
  const slots=Math.max(minRows,works.length),rowHeight=Math.min(rowH,(bottom-rowsTop)/slots);
  return {id,innerWork:true,frameless:true,label:'PRACE WEWNĘTRZNE',labelY:headerTop+headerH/2,x,y:dividerY,w,h:bottom-dividerY,dividerY,
    slots:works.length,rowsTop,rowStep:rowHeight,rowHeight,headerH,tileLeft,tileRight,
    identifierW:large?184:172,stageGap:72,font:large?30:25,columns,works};
}

// Widok lokalnego pipeline'u z istniejącego planu. Nie planuje subskrypcji ani nie prowadzi zegara.
// Każdy etap wiąże się z własną krawędzią; jego terminal nie kończy automatycznie całego inner.
export function innerWorkPanelSnapshot(panel, records, births, time) {
  const record = id => records.find(r => r.id === id);
  const connected = r => r ? r.start + r.connectDuration : Infinity;
  const stateOf = (r, receiver = false) => {
    if (!r || time < r.start) return 'idle';
    if (time < connected(r)) return 'subscribing';
    if (!r.end || time < r.end.at + (receiver ? r.end.duration : 0)) return 'active';
    return r.end.kind === 'unsubscribe' ? 'cancelled' : r.end.kind === 'error' ? 'errored' : 'completed';
  };
  const rows = panel.works.flatMap(work => {
    const output = record(work.edge), born = births.get(work.node) ?? Infinity;
    const queuedAt = work.queuedNode ? births.get(work.queuedNode) : undefined;
    const ignoredAt=work.ignoredNode?births.get(work.ignoredNode):undefined;
    const y = panel.rowsTop + work.slot * panel.rowHeight;
    const color = work.color || '#7457D9';
    const base = {id:work.id, slot:work.slot, value:work.value, color, y, h:panel.rowHeight};
    if(ignoredAt!==undefined) {
      const opacity=clamp((time-ignoredAt)/.3);
      return time>=ignoredAt&&opacity>0?[{...base,state:'ignored',opacity}]:[];
    }
    const waitingAt=work.queueObservable?born:queuedAt;
    if (time < born || work.queueObservable&&time<output.start) {
      return waitingAt !== undefined && time >= waitingAt ? [{...base,state:'queued',queueLabel:work.queueLabel,
        existingObservable:Boolean(work.queueObservable),opacity:clamp((time-waitingAt)/.3)}] : [];
    }
    if (!output) return [];
    const stages = work.stages.map((stage, i) => {
      const r = record(stage.edge || work.edge), start = connected(r);
      const state = stateOf(r, stage.receiver);
      // Postęp kończy się z odpowiedzią (pierwszy next), jak w kafelku HTTP GET toru; complete przychodzi po niej.
      // Przy anulowaniu zachowujemy potencjalny czas pracy, więc pasek nigdy nie udaje complete.
      const stop = r?.events[0]?.at ?? r?.end?.at ?? start + work.duration;
      const fraction = r?.end?.kind === 'unsubscribe' ? clamp((r.end.logicalAt-r.logicalStart)/work.duration) : 1;
      const progress = state === 'subscribing' || state === 'idle' ? 0 : clamp((time-start)/Math.max(.001,stop-start))*fraction;
      const since = r?.end ? r.end.at + (stage.receiver ? r.end.duration : 0) : undefined;
      return {...stage,index:i,state,hasProgress:Boolean(stage.progress),progress,since};
    });
    const establishing=time<Math.max(connected(output),...work.stages.map(s=>connected(record(s.edge||work.edge))));
    const state=establishing?'subscribing':stateOf(output), reveal=clamp((time-(work.queueObservable?output.start:born))/.3);
    // Kable i wartości pozostają w poziomym wierszu, aż do prawej granicy panelu.
    const wires = work.stages.map((stage,i) => {
      const r = record(stage.edge || work.edge), terminal = r.end;
      const p = terminal ? clamp((time-terminal.at)/terminal.duration) : 0;
      const cancelled = terminal?.kind === 'unsubscribe' && time >= terminal.at;
      return {index:i, visible:time>=r.start, subscribe:clamp((time-r.start)/r.connectDuration),
        opacity:terminal && time>=terminal.at+terminal.duration ? .35 : 1,
        color:cancelled?'#808890':color,
        pulse:terminal&&!cancelled&&time>=terminal.at&&p<1?{at:p,color:terminal.kind==='error'?'#C54848':'#26804E'}:null};
    });
    const tokens = work.stages.flatMap((stage,i) => {
      const r = record(stage.edge || work.edge);
      return r.events.filter(e=>time>=e.at&&time<e.arrival).map(e=>({stage:i,value:e.value,color,
        progress:clamp((time-e.at)/(e.arrival-e.at))}));
    });
    return [{...base,state,queueLabel:work.queueLabel,opacity:waitingAt===undefined?reveal:1,reveal:waitingAt===undefined?1:reveal,stages,wires,tokens}];
  });
  return {...panel, rows};
}
