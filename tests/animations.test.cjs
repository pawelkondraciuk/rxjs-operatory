const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function harness() {
  const callbacks = new Map();
  let sequence = 0;
  class Slide {
    constructor(id) { this.id=id; this.dataset={animation:id}; this.heading={}; this.player={setAttribute(){}}; }
    querySelector(s) { return s==='h2'?this.heading:this.player; }
    cloneNode() { return new Slide(this.id); }
    after() {}
  }
  const slides = [...fs.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
  const context=vm.createContext({document:{activeElement:null,querySelectorAll:()=>slides},
    requestAnimationFrame:fn=>{callbacks.set(++sequence,fn);return sequence;},
    cancelAnimationFrame:id=>callbacks.delete(id)});
  const cache=new Map();
  async function load(file) {
    const absolute=path.resolve(file);
    if(cache.has(absolute))return cache.get(absolute);
    const m=new vm.SourceTextModule(fs.readFileSync(absolute,'utf8'),{context,identifier:absolute});
    cache.set(absolute,m);
    await m.link((specifier,parent)=>load(path.resolve(path.dirname(parent.identifier),specifier)));
    return m;
  }
  const modules=await Promise.all(['catalog','presentation','player','lifecycle','flow','engine','resolver'].map(name=>load(`animations/${name}.js`)));
  for(const m of modules)await m.evaluate();
  const scenes=modules[1].namespace.prepareSlides(modules[0].namespace.scenes);
  function player(id,controls) {
    const elements=new Map();
    const root={isConnected:true,contains:()=>false,addEventListener(){},querySelector(selector){
      if(!elements.has(selector))elements.set(selector,{hidden:selector==='.rx-toolbar',textContent:'',innerHTML:'',setAttribute(){},addEventListener(){}});
      return elements.get(selector);
    }};
    return {api:modules[2].namespace.createPlayer(root,scenes.get(id),controls),elements};
  }
  return {scenes,player,lifecycle:modules[3].namespace,flow:modules[4].namespace,engine:modules[5].namespace,resolver:modules[6].namespace,callbacks};
}

test('all slide variants render through every event and termination without invalid geometry',async()=>{
  const {scenes,player}=await harness();
  let frames=0;
  for(const scene of scenes.values()) {
    const {api,elements}=player(scene.id);
    assert.ok(Number.isFinite(api.duration),scene.id);
    const times=new Set([0,api.duration,...Array.from({length:Math.ceil(api.duration*2)},(_,i)=>i/2),...scene.rows.flatMap(r=>[
      ...r.events.flatMap(e=>[e.at,e.at+.4,e.at+1.7]),
      ...r.spans.flatMap(p=>[p.start,p.end,p.end+.4,p.end+1.7]),
    ])]);
    for(const time of times){
      api.seek(time);
      const svg=elements.get('.rx-stage').innerHTML;
      assert.match(svg,/<svg /,scene.id);
      assert.doesNotMatch(svg,/NaN|Infinity|="undefined"/,`${scene.id} @ ${time}`);
      frames++;
    }
  }
  assert.ok(frames>1000);
  assert.equal(scenes.get('07-hot-cold-2').comparisonMode,'shared');
  assert.equal(scenes.get('16-czas-cztery-4').seriesIndices[0],4);
});

test('four time operators keep distinct emission times and receiver histories',async()=>{
  const {scenes,engine}=await harness();
  const scene=scenes.get('15-debounce-audit');
  const expected=[
    [[11.8,'G'],[16.5,'I'],[21.5,'J']],
    [[4.5,'D'],[9.5,'G'],[15.5,'I'],[21.5,'J']],
    [[1,'A'],[6,'E'],[12,'H'],[18,'J']],
    [[3.5,'C'],[7,'E'],[10.5,'G'],[14,'I'],[21,'J']],
  ];
  assert.equal(scene.rows.length,5);
  scene.rows.slice(1).forEach((row,i)=>{
    assert.deepEqual(Array.from(row.events,e=>[e.at,e.value]),expected[i],row.label);
    assert.equal(row.completeAt,undefined,'ongoing source does not complete');
  });
  const compiled=engine.compileScene(scene);
  const received=frame=>Array.from(frame.histories,h=>Array.from(h.values,e=>e.value));
  assert.deepEqual(received(compiled.snapshot(0)),[[],[],[],[]]);
  assert.deepEqual(received(compiled.snapshot(compiled.stops[0].time)),[[],['D'],['A'],['C']]);
  const final=compiled.snapshot(compiled.duration);
  assert.deepEqual(received(final),expected.map(events=>events.map(e=>e[1])));
  for(const history of final.histories){
    const sink=final.nodes.find(n=>n.id===history.anchor);
    assert.ok(history.y-23>sink.y-sink.h/2 && history.y+23<sink.y+sink.h/2);
  }
});

test('legend directions, terminal colors and final value delivery',async()=>{
  const {lifecycle:{connectionState,palette}}=await harness();
  assert.equal(connectionState(.4,0,null).offset,-.5); // B → A during subscribe
  assert.ok(Math.abs(connectionState(3.4,0,{at:3,kind:'unsubscribe'}).offset-.5)<1e-9); // B → A
  const finish=connectionState(4.2,0,{at:3,kind:'complete'},[{at:3}]);
  assert.ok(Math.abs(finish.offset+.5)<1e-9); // A → B after value arrives
  assert.equal(finish.color,palette.complete);
  assert.equal(connectionState(3.4,0,{at:3,kind:'error'}).color,palette.error);
  assert.equal(connectionState(6,0,{at:3,kind:'complete'}).done,true);
});

test('only receiver changes terminal color; refCount removes the correct subscriptions',async()=>{
  const {player}=await harness();
  const complete=player('07-hot-cold');complete.api.finish();
  let svg=complete.elements.get('.rx-stage').innerHTML;
  assert.match(svg,/data-node="receiver0"[^]*?fill="#087438"/);
  assert.match(svg,/data-node="work0"[^]*?fill="#ffc15c"/);
  assert.doesNotMatch(svg,/data-connection=/);
  for(const [id,alive] of [['22-refcount',true],['22-refcount-2',false]]){
    const p=player(id);p.api.finish();svg=p.elements.get('.rx-stage').innerHTML;
    assert.equal(svg.includes('data-connection="timer-hub"'),alive);
    assert.doesNotMatch(svg,/data-connection="hub-view/);
  }
  const error=player('b05-finalize-2');error.api.finish();
  assert.match(error.elements.get('.rx-stage').innerHTML,/data-node="sink0"[^]*?fill="#b51e2e"/);
});

test('playback loops, pause cancels frames, restart resets, controls can be hidden',async()=>{
  const {player,callbacks}=await harness();const {api,elements}=player('b09-pairwise');
  assert.equal(elements.get('.rx-toolbar').hidden,true);
  api.toggleControls();assert.equal(elements.get('.rx-toolbar').hidden,false);
  api.hideControls();assert.equal(elements.get('.rx-toolbar').hidden,true);
  api.restart();
  for(let now=0;now<=(api.duration+3)*1000;now+=250){const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn(now));}
  assert.ok(Number(elements.get('input').value)<3);
  assert.equal(elements.get('.rx-play').textContent,'Pauza');
  api.pause();assert.equal(callbacks.size,0);
  api.restart();assert.equal(elements.get('input').value,'0');
});

test('manual stops deliver only after travel; snapshots survive seeking backwards',async()=>{
  const {player,callbacks}=await harness();
  for(const id of ['04-operator','08-map-strumienie','11-switchmap','19-share']) {
    const {api}=player(id);
    const initial=JSON.stringify(api.snapshot);
    let now=0;
    for(const stop of api.stops) {
      api.playTo(stop.time);
      for(let i=0;i<3000&&api.isPlaying;i++,now+=50){const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn(now));}
      assert.equal(api.time,stop.time,id+' '+stop.id);
      assert.equal(callbacks.size,0);
      if(stop.caption)assert.equal(api.snapshot.caption,stop.caption);
      const stable=JSON.stringify(api.snapshot);api.finish();api.seek(stop.time);
      assert.equal(JSON.stringify(api.snapshot),stable);
    }
    api.seek(0);assert.equal(JSON.stringify(api.snapshot),initial);
  }
});

test('map keeps its accepted chronology and highlights the currently handling node',async()=>{
  const {player}=await harness();const {api}=player('04-operator');
  for(const start of [5,9,13]) {
    for(const [offset,node,phase] of [[.1,'source','emitting'],[.6,null,'to-map'],[1.25,'map','in-map'],[1.75,null,'to-observer'],[2.5,'observer',null]]) {
      api.seek(start+offset);
      assert.deepEqual(Array.from(api.snapshot.nodes.filter(n=>n.active),n=>n.id),node?[node]:[]);
      if(phase)assert.ok(api.snapshot.tokens.some(t=>t.phase===phase));
    }
  }
  api.seek(7.49);assert.equal(api.snapshot.histories[0].values.length,0);
  api.seek(7.5);assert.equal(api.snapshot.histories[0].values[0].value,'10');
  api.finish();assert.deepEqual(Array.from(api.snapshot.histories[0].values,v=>v.value),['10','20','30']);
  assert.ok(api.snapshot.edges.every(e=>!e.visible));
  assert.equal(api.snapshot.nodes.find(n=>n.id==='source').notification,null);
});

test('manual to auto continues from the stop and holds FINISHED without orphan RAF',async()=>{
  const {player,callbacks}=await harness();const {api}=player('04-operator');
  api.seek(7.5);api.playContinuously();
  for(let now=0;now<30000;now+=50){const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn(now));}
  assert.equal(api.time,api.duration);assert.equal(api.state,'finished');assert.equal(callbacks.size,0);
  api.reset();assert.equal(api.time,0);assert.equal(api.state,'playing');api.pause();
});

test('concatAll queues created Observables, switchMap pauses before cancel then aborts without delivery',async()=>{
  const {player}=await harness();
  const concat=player('08-map-strumienie').api;
  concat.seek(concat.stops.at(-1).time);
  assert.equal(concat.snapshot.nodes.find(n=>n.id==='inner0').workState,'active');
  for(const id of ['inner1','inner2']) {
    const n=concat.snapshot.nodes.find(n=>n.id===id);
    assert.ok(n.visible);assert.equal(n.workState,'queued');assert.equal(n.showProgress,false);
    assert.equal(concat.snapshot.edges.find(e=>e.from===id).visible,false);
  }
  const sw=player('11-switchmap').api;sw.seek(sw.stops.at(-1).time);
  assert.equal(sw.snapshot.nodes.find(n=>n.id==='inner0').workState,'active');
  assert.equal(sw.snapshot.nodes.find(n=>n.id==='inner1').visible,false);
  sw.finish();const a=sw.snapshot.nodes.find(n=>n.id==='inner0');
  assert.equal(a.workState,'canceled');assert.ok(a.progress>0&&a.progress<1);assert.equal(a.notification,null);
  assert.ok(sw.snapshot.histories[0].values.every(v=>v.value!=='A'&&v.value!=='B'));
});

test('subscription travels receiver → share → source; values travel source → share → receivers',async()=>{
  const {flow:{planFlow},lifecycle:{transitionDuration}}=await harness();
  const source={id:'http'},hub={id:'share'},a={id:'a'},b={id:'b'};
  const value={at:7,value:'dane'};
  const edge=(from,to,start)=>({id:from.id+'-'+to.id,a:from,b:to,logicalStart:start,logicalEnd:{at:7,kind:'complete'},events:[value]});
  const plan=planFlow([source,hub,a,b],[edge(source,hub,1),edge(hub,a,1),edge(hub,b,3)],21);
  const upstream=plan.records.get('http-share'),first=plan.records.get('share-a'),second=plan.records.get('share-b');
  assert.ok(upstream.start>=first.start+transitionDuration);
  assert.ok(plan.births.get('share')<plan.births.get('http'));
  assert.ok(second.start>upstream.start+transitionDuration);
  assert.ok(first.events[0].at>upstream.events[0].arrival);
  assert.equal(first.events[0].at,second.events[0].at); // Dopiero fan-out jest równoczesny.
  assert.equal(plan.receivedAt('a',value),first.events[0].arrival);
  assert.ok(first.end.at>=upstream.end.at+transitionDuration);
});

test('READY shows participants and a value never occupies consecutive connections simultaneously',async()=>{
  const {player}=await harness();
  const {api,elements}=player('07-hot-cold-2');
  api.seek(1.15);
  let svg=elements.get('.rx-stage').innerHTML;
  const opacity=Number(svg.match(/data-node="hub" opacity="([^"]+)"/)[1]);
  assert.equal(opacity,1);
  assert.doesNotMatch(svg,/data-connection="work0-hub"/);
  let sawInput=false,sawOutput=false;
  for(let t=0;t<api.duration;t+=.1){
    api.seek(t);svg=elements.get('.rx-stage').innerHTML;
    const input=svg.includes('data-value-on="work0-hub"');
    const output=svg.includes('data-value-on="hub-receiver0"');
    assert.ok(!(input&&output),`simultaneous value at ${t}`);
    if(input)sawInput=true;
    if(output){assert.ok(sawInput);sawOutput=true;}
  }
  assert.ok(sawInput&&sawOutput);
});

test('every variant has deterministic READY, question, FINISHED and fixed geometry',async()=>{
  const {scenes,engine:{compileScene}}=await harness();
  for(const scene of scenes.values()) {
    const engine=compileScene(scene),initial=engine.snapshot(0);
    const shape=f=>JSON.stringify(f.nodes.map(n=>[n.id,n.x,n.y,n.w,n.h]));
    for(const time of [0,...engine.stops.map(s=>s.time),engine.duration]) {
      const frame=engine.snapshot(time);
      assert.equal(shape(frame),shape(initial),scene.id);
      const copy=JSON.stringify(frame);engine.snapshot(engine.duration);engine.snapshot(0);
      assert.equal(JSON.stringify(engine.snapshot(time)),copy,scene.id);
      for(const node of frame.nodes) {
        assert.ok(node.x-node.w/2>=0&&node.x+node.w/2<=frame.width,scene.id+' '+node.id+' horizontal');
        assert.ok(node.y-node.h/2>=0&&node.y+node.h/2<=frame.height,scene.id+' '+node.id+' vertical');
      }
    }
    assert.equal(new Set(engine.events.map(e=>e.id)).size,engine.events.length,scene.id+' event IDs');
    assert.ok(engine.stops.every((s,i)=>s.time<=engine.duration&&(!i||s.time>engine.stops[i-1].time)),scene.id+' stops');
  }
});

test('flatten strategies use identical inputs, queue values before projection and never create ignored inner',async()=>{
  const {scenes,player}=await harness();
  const ids=['09-concatmap','10-mergemap','11-switchmap','12-exhaustmap'];
  const input=JSON.stringify(scenes.get(ids[0]).rows[0].events);
  for(const id of ids)assert.equal(JSON.stringify(scenes.get(id).rows[0].events),input,id);
  const concat=player(ids[0]).api;concat.seek(concat.stops.at(-1).time);
  assert.equal(concat.snapshot.nodes.find(n=>n.id==='inner1').visible,false);
  const exhaust=player(ids[3]).api;exhaust.finish();
  assert.deepEqual(Array.from(exhaust.snapshot.nodes.filter(n=>n.inner),n=>n.id),['inner0','inner3']);
  assert.deepEqual(Array.from(exhaust.snapshot.histories[0].values,v=>v.value),['A1','A2','D1','D2']);
});

test('concatAll creates references only after the input arrives at projection',async()=>{
  const {scenes,engine:{compileScene}}=await harness();
  const model=compileScene(scenes.get('08-map-strumienie'));
  const creation=model.events.find(e=>e.type==='inner-create'&&e.node==='inner1');
  const arrival=model.events.find(e=>e.type==='deliver-next'&&e.edge==='source-projection'&&e.value==='B');
  assert.equal(creation.at,arrival.at);
  assert.equal(model.snapshot(arrival.at-.01).nodes.find(n=>n.id==='inner1').visible,false);
});

test('microtask collects synchronous IDs once; buffer windows and in-flight deduplication are independent',async()=>{
  const {resolver:{planEnrichment,planResolver}}=await harness();
  const micro=planEnrichment();
  assert.deepEqual(Array.from(micro.ids),['A','B','C']);assert.equal(micro.microtasks,1);
  assert.ok(micro.events.findIndex(e=>e.type==='microtask-flush')>micro.events.findIndex(e=>e.type==='sync-end'));
  assert.equal(planEnrichment(['X'],['X']).microtasks,0);
  const plan=planResolver();
  assert.equal(plan.batches.length,1);assert.equal(plan.batches[0].at,.25);
  assert.deepEqual(Array.from(plan.batches[0].ids),['A','B','C','D','E']);
  assert.equal(plan.events.filter(e=>e.type==='queue-add'&&e.value==='C').length,1);
  assert.deepEqual(Array.from(plan.results,r=>Array.from(r.ids)),[['A','B','C'],['C','D','E']]);
  assert.ok(plan.results.every(r=>r.at===.65));
  const limited=planResolver({maxBatchSize:3});
  assert.equal(limited.batches.length,2);assert.equal(limited.batches[0].reason,'size');assert.equal(limited.batches[0].at,.05);
  assert.equal(limited.batches[1].at,.30); // restart bufora po wcześniejszym flush
  const late=planResolver({calls:[{at:.3,ids:['A']}],destroyAt:1.2});
  assert.equal(late.batches[0].at,.5); // okno od subskrypcji, nie .3 + .25
  const failure=planResolver({errorIds:['C']});assert.equal(failure.results.length,0);
  assert.equal(failure.events.filter(e=>e.type==='resolve-error').length,2);
  assert.equal(planResolver({calls:[{at:0,ids:[]}]}).results.length,1);
});

test('simultaneous values remain ordered and do not overlap on one edge',async()=>{
  const {flow:{planFlow}}=await harness();
  const a={id:'a'},b={id:'b'},c={id:'c'},values=['A','B','C'].map(value=>({at:1,value}));
  const plan=planFlow([a,b,c],[{id:'ab',a,b,logicalStart:0,events:values},{id:'bc',a:b,b:c,logicalStart:0,events:values}],3);
  for(const record of plan.records.values())record.events.forEach((event,i)=>{
    if(i)assert.ok(event.at>=record.events[i-1].arrival);
  });
  plan.records.get('bc').events.forEach((event,i)=>assert.ok(event.at>plan.records.get('ab').events[i].arrival));
});

test('next history preserves repeated values; deduplication belongs only to an explicit Set',async()=>{
  const {engine:{compileScene}}=await harness();
  const scene={id:'duplicates',title:'Powtórzenia',duration:2,rows:[],graph:{layout:'fixed',
    nodes:[{id:'a',x:200,y:100},{id:'b',x:800,y:100}],
    edges:[{from:'a',to:'b',events:[{at:1,value:'A'},{at:1,value:'A'}]}],
    trays:[{anchor:'b',x:800,y:200,w:250}]}};
  const stream=compileScene(scene);
  assert.deepEqual(Array.from(stream.snapshot(stream.duration).histories[0].values,v=>v.value),['A','A']);
  scene.graph.trays[0].deduplicate=true;
  const set=compileScene(scene);
  assert.deepEqual(Array.from(set.snapshot(set.duration).histories[0].values,v=>v.value),['A']);
});

test('work panel shows queued input immediately and holds an aborted progress bar without complete',async()=>{
  const {player}=await harness();
  const concat=player('09-concatmap');concat.api.seek(concat.api.stops.at(-1).time);
  const queued=concat.api.snapshot.nodes.find(n=>n.id==='queued1');
  assert.ok(queued.visible);assert.equal(queued.opacity,1);assert.equal(queued.label,'B (wartość)');
  assert.ok(!queued.inner);
  const sw=player('11-switchmap');sw.api.finish();
  const canceled=sw.api.snapshot.nodes.find(n=>n.id==='inner0');
  assert.equal(canceled.workState,'canceled');assert.ok(canceled.progress>0&&canceled.progress<1);
  assert.match(sw.elements.get('.rx-stage').innerHTML,/HTTP A[^]*?anulowana · ABORT/);
  assert.equal(sw.api.snapshot.nodes.find(n=>n.id==='inner3').workState,'completed');
});

test('internal work has no subscription wires and queued Observables are grey from their first frame',async()=>{
  const {scenes,engine:{compileScene},player}=await harness();
  const model=compileScene(scenes.get('08-map-strumienie'));
  for(const id of ['inner1','inner2']) {
    const birth=model.events.find(e=>e.type==='inner-create'&&e.node===id).at;
    for(const dt of [0,.01,.1]) {
      const node=model.snapshot(birth+dt).nodes.find(n=>n.id===id);
      assert.equal(node.workState,'queued');assert.equal(node.fill,'#e7ecef');
      assert.equal(node.showProgress,false);
    }
  }
  const p=player('08-map-strumienie');
  for(const stop of p.api.stops) {
    p.api.seek(stop.time);
    assert.doesNotMatch(p.elements.get('.rx-stage').innerHTML,/data-connection="inner/);
    assert.doesNotMatch(p.elements.get('.rx-stage').innerHTML,/data-value-on="inner/);
  }
});
