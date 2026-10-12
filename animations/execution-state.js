// Jawny opis inner nie zawiera wartości czekających ani pominiętych wejść.
export function prepareExecutions(definitions=[],edges=[]) {
  const seen=new Set();
  const executions=definitions.map(definition=>{
    if(!definition.id||seen.has(definition.id))throw new Error('Nieunikalne ID wykonania');
    seen.add(definition.id);
    const edge=edges.find(e=>e.id===definition.edge);
    if(!edge||edge.a.id!==definition.node)throw new Error(`Nieznana subskrypcja wykonania ${definition.id}`);
    if(!(definition.duration>0))throw new Error(`Brak czasu pracy wykonania ${definition.id}`);
    return {...definition,modelStart:edge.logicalStart,modelEnd:edge.logicalEnd};
  });
  const byId=new Map(executions.map(e=>[e.id,e])),owner=new Map();
  for(const execution of executions) {
    const edge=edges.find(e=>e.id===execution.edge);
    for(const event of edge.events) {
      event.execution??=execution.id;
      const key=JSON.stringify([event.at,event.value]),ids=owner.get(key)||new Set();
      ids.add(event.execution);owner.set(key,ids);
    }
  }
  const allowed=event=>{
    const execution=byId.get(event.execution);
    return !execution||execution.modelEnd?.kind!=='unsubscribe'||event.at<execution.modelEnd.at;
  };
  for(const edge of edges)edge.events=edge.events.map(event=>{
    const candidates=owner.get(JSON.stringify([event.at,event.value]));
    return event.execution||candidates?.size!==1?event:{...event,execution:[...candidates][0]};
  }).filter(allowed);
  return executions;
}
export function executionSnapshot(definitions,records,events,time,logicalTime,illustrated=false) {
  const executions=definitions.flatMap(definition=>{
    const record=records.find(r=>r.id===definition.edge),startedAt=record.start+record.connectDuration;
    if(time<startedAt)return [];
    const end=record.end,ended=Boolean(end&&time>=end.at);
    const state=!ended?'running':end.kind==='unsubscribe'?'cancelled':end.kind==='error'?'error':'completed';
    const observed=events.filter(e=>e.execution===definition.id&&e.at<=time);
    const httpError=observed.find(e=>e.type==='http-error'),handledError=observed.some(e=>e.type==='catch-handle');
    const httpState=httpError?'error':state==='cancelled'?'cancelled':state==='completed'?'success':state==='error'?'error':'running';
    const modelProgress=at=>Math.max(0,Math.min(1,(at-definition.modelStart)/definition.duration));
    let progress=modelProgress(httpError?.logicalAt??(ended?end.logicalAt:logicalTime));
    if(illustrated) {
      // Pasek rośnie w czasie ilustracji aż do błędu HTTP, anulowania albo complete, bez postojów na przelot wartości.
      const failure=events.find(e=>e.execution===definition.id&&e.type==='http-error'),target=failure||end;
      const share=target?modelProgress(target.logicalAt):1;
      progress=!target||target.at<=startedAt?share:Math.min(1,Math.max(0,(time-startedAt)/(target.at-startedAt)))*share;
    }
    const values=record.events.filter(e=>e.arrival<=time);
    return [{...definition,state,httpState,handledError,progress,startedAt,endedAt:ended?end.at:null,values,focused:false}];
  });
  let focusedExecutionId=null;
  for(const event of events)if(event.type==='execution-focus'&&event.at<=time)focusedExecutionId=event.execution??null;
  if(!executions.some(e=>e.id===focusedExecutionId))focusedExecutionId=null;
  executions.forEach(e=>{e.focused=e.id===focusedExecutionId;});
  const executionCounts={started:executions.length,active:0,completed:0,cancelled:0,error:0};
  for(const execution of executions)executionCounts[execution.state==='running'?'active':execution.state]++;
  return {executions,executionCounts,focusedExecutionId};
}
