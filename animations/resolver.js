// Deterministyczny model dydaktyczny resolvera, bez HTTP/RxJS w runtime.
// Czas w sekundach. bufferTime(250, null, maxBatchSize) ma własny zegar.
export function planResolver({calls=[{at:.05,ids:['A','B','C']},{at:.09,ids:['C','D','E']}],
  cacheIds=[],window=.25,maxBatchSize=10,latency=.4,destroyAt=1.1,errorIds=[]}={}) {
  if(window<=0||maxBatchSize<1||latency<=0)throw new Error('Niepoprawne parametry resolvera');
  const cache=new Set(cacheIds),inFlight=new Map(),events=[],batches=[],results=[],queue=[];
  let order=0,buffer=[],generation=0;
  const record=(type,at,extra={})=>events.push({id:`resolver-${events.length}`,type,at,...extra});
  const schedule=(type,at,data={})=>queue.push({type,at,order:order++,...data});
  function open(at) {generation++;record('buffer-open',at,{node:'buffer'});schedule('window',at+window,{generation});}
  function flush(at,reason) {
    record('buffer-close',at,{node:'buffer',reason});
    if(buffer.length) {
      const ids=[...new Set(buffer)],batch={at,end:at+latency,ids,reason,index:batches.length};
      batches.push(batch);record('flush',at,{node:'buffer',ids,reason});record('work-start',at,{node:'http',ids});
      schedule('response',batch.end,{batch});buffer=[];
    }
    open(at);
  }
  const waiting=calls.map((call,index)=>({index,ids:[...new Set(call.ids)],values:new Set(),at:call.at,finished:false}));
  waiting.forEach(call=>schedule('call',call.at,{call}));
  open(0);
  function finishCall(call,at) {
    if(!call.finished&&call.values.size===call.ids.length) {
      call.finished=true;const result={index:call.index,at,ids:[...call.ids]};results.push(result);
      record('store-update',at,{node:'store',...result});
    }
  }
  while(queue.length) {
    queue.sort((a,b)=>a.at-b.at||a.order-b.order);
    const event=queue.shift(),{at}=event;
    if(at>=destroyAt)break;
    if(event.type==='window') {if(event.generation===generation)flush(at,'time');continue;}
    if(event.type==='call') {
      const {call}=event;
      record('resolve-many',at,{node:'resolve',index:call.index,ids:call.ids});
      for(const id of call.ids) {
        if(cache.has(id)){call.values.add(id);record('cache-hit',at,{node:'resolve',value:id});}
        else if(inFlight.has(id)) {inFlight.get(id).add(call);record('in-flight-hit',at,{node:'resolve',value:id});}
        else {
          inFlight.set(id,new Set([call]));record('cache-miss',at,{node:'resolve',value:id});
          buffer.push(id);record('queue-add',at,{node:'buffer',value:id});
          if(buffer.length>=maxBatchSize)flush(at,'size');
        }
      }
      // Kontrakt aplikacji: resolveMany([]) zwraca of(new Map()), nie forkJoin([]).
      finishCall(call,at);
    } else if(event.type==='response') {
      const failed=event.batch.ids.some(id=>errorIds.includes(id));
      record(failed?'stream-error':'work-stop',at,{node:'http',ids:event.batch.ids});
      for(const id of event.batch.ids) {
        const subscribers=inFlight.get(id)||[];
        if(!failed)cache.add(id);
        for(const call of subscribers) {
          if(failed&&!call.finished){call.finished=true;record('resolve-error',at,{node:'resolve',index:call.index,value:id});}
          else if(!call.finished){call.values.add(id);finishCall(call,at);}
        }
        inFlight.delete(id);
      }
    }
  }
  record('inner-unsubscribe',destroyAt,{node:'buffer'});
  return {events,batches,results,calls:waiting,window,maxBatchSize,destroyAt};
}

export function planEnrichment(ids=['A','B','A','C','X'],cacheIds=['X']) {
  const pending=new Set(),cache=new Set(cacheIds),events=[];
  let scheduled=false;
  ids.forEach((id,index)=>{
    events.push({type:cache.has(id)?'cache-hit':'cache-miss',at:1,node:'cache',value:id,index});
    if(cache.has(id))return;
    pending.add(id);events.push({type:'queue-add',at:1,node:'pending',value:id,index});
    if(!scheduled){scheduled=true;events.push({type:'microtask-schedule',at:1,node:'microtask'});}
  });
  events.push({type:'sync-end',at:1,node:'items'});
  // Ten sam obrót event loop; inna faza ilustracji. Nie upływa umowne 100 ms.
  if(scheduled)events.push({type:'microtask-flush',at:1,node:'microtask',ids:[...pending]});
  return {events,ids:[...pending],microtasks:scheduled?1:0};
}
