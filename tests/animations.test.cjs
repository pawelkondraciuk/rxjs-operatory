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
  // Ładowanie po kolei (jak v2-harness): równoległe link() współdzielonych zależności bywa niedeterministyczne.
  const modules=[];
  for(const name of ['catalog','presentation','player','lifecycle','flow','engine'])modules.push(await load(`animations/${name}.js`));
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
  return {scenes,player,lifecycle:modules[3].namespace,flow:modules[4].namespace,engine:modules[5].namespace,callbacks};
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
  assert.ok(frames>300);
  assert.equal(scenes.get('20-sharereplay-2').comparisonMode,'shared');
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

test('playback pause cancels frames, restart resets, controls can be hidden',async()=>{
  const {player,callbacks}=await harness();const {api,elements}=player('09-concatmap');
  assert.equal(elements.get('.rx-toolbar').hidden,true);
  api.toggleControls();assert.equal(elements.get('.rx-toolbar').hidden,false);
  api.hideControls();assert.equal(elements.get('.rx-toolbar').hidden,true);
  api.playContinuously();
  for(let now=0;now<1000;now+=250){const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn(now));}
  assert.equal(api.isPlaying,true);
  api.pause();assert.equal(callbacks.size,0);
  api.restart();assert.equal(elements.get('input').value,'0');
});

test('manual stops deliver only after travel; snapshots survive seeking backwards',async()=>{
  const {player,callbacks}=await harness();
  for(const id of ['04-operator','08-map-strumienie','11-switchmap']) {
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

test('operator function delivers one mapped User string and complete without source history',async()=>{
  const {player}=await harness();const {api}=player('04-operator');
  api.seek(api.stops.find(s=>s.id==='received').time);
  assert.deepEqual(Array.from(api.snapshot.histories[0].values,v=>v.value),['"…"']);
  api.finish();assert.deepEqual(Array.from(api.snapshot.histories[0].values,v=>v.value),['"…"']);
  assert.ok(api.snapshot.edges.every(e=>e.done));
  assert.ok(api.snapshot.nodes.every(n=>!n.showProgress));
  assert.equal(api.snapshot.nodes.find(n=>n.id==='observer').notification,'complete');
  assert.equal(api.snapshot.nodes.find(n=>n.id==='source').notification,'complete');
  assert.equal(api.snapshot.histories.length,1);
});

test('manual to auto continues from the first result and holds FINISHED without orphan RAF',async()=>{
  const {player,callbacks}=await harness();const {api}=player('04-operator');
  api.controller.seek(api.stops.at(-1).time);api.controller.next();
  assert.equal(api.controller.mode,'auto');
  for(let now=0;now<30000;now+=50){const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn(now));}
  assert.equal(api.time,api.duration);assert.equal(api.state,'finished');assert.equal(callbacks.size,0);
  api.controller.reset();assert.equal(api.time,0);assert.equal(api.state,'ready');assert.equal(callbacks.size,0);
});

test('concatAll has one active inner; switchMap pauses before cancel then aborts without delivery',async()=>{
  const {player}=await harness();
  const concat=player('08-map-strumienie').api;
  concat.seek(concat.stops.find(s=>s.id==='active').time);
  assert.equal(concat.snapshot.nodes.find(n=>n.id==='inner0').workState,'active');
  assert.deepEqual(Array.from(concat.snapshot.nodes.filter(n=>n.inner&&n.visible),n=>n.id),['inner0']);
  assert.ok(!concat.snapshot.nodes.some(n=>n.workState==='queued'));
  // Pytanie switchMap: A nadal pracuje, B dotarło, ale jeszcze nie anulowało A ani nie utworzyło inner.
  const sw=player('11-switchmap').api;sw.seek(sw.stops.find(s=>s.id==='question').time);
  assert.equal(sw.snapshot.nodes.find(n=>n.id==='inner0').workState,'active');
  assert.equal(sw.snapshot.nodes.find(n=>n.id==='inner1').visible,false);
  sw.finish();const a=sw.snapshot.nodes.find(n=>n.id==='inner0');
  assert.equal(a.workState,'canceled');assert.ok(a.progress>0&&a.progress<1);assert.equal(a.notification,null);
  assert.deepEqual(Array.from(sw.snapshot.histories.find(h=>h.anchor==='observer').values,v=>v.value),['B','C']);
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

test('a shared value never occupies consecutive connections simultaneously',async()=>{
  const {player}=await harness();
  const {api,elements}=player('20-sharereplay-2');
  let svg;
  let sawInput=false,sawOutput=false;
  for(let t=0;t<api.duration;t+=.1){
    api.seek(t);svg=elements.get('.rx-stage').innerHTML;
    const input=svg.includes('data-value-on="http-replay"');
    const output=svg.includes('data-value-on="replay-A"');
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
    // Scena z fazami (scene.phases) zastępuje cały diagram przy przejściu: geometria stała w obrębie fazy.
    const initialOf=frame=>frame.phase===undefined?initial:engine.snapshot(engine.plan.phases.find(p=>p.name===frame.phase).offset);
    // Rosnący kafelek torów (laneSlots) zachowuje górę, x i szerokość; wysokość rośnie z wierszami wykonań.
    const shape=f=>JSON.stringify(f.nodes.map(n=>n.laneSlots?[n.id,n.x,n.y-n.h/2,n.w,'rows']:[n.id,n.x,n.y,n.w,n.h]));
    for(const time of [0,...engine.stops.map(s=>s.time),engine.duration]) {
      const frame=engine.snapshot(time);
      assert.equal(shape(frame),shape(initialOf(frame)),scene.id);
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

// Oba warianty catchError mają graf MAIN switchMap: tests/catch-inside.test.cjs i tests/catch-outside.test.cjs.

test('flatten strategies use identical inputs, queue values before projection and never create ignored inner',async()=>{
  const {scenes,player}=await harness();
  const ids=['09-concatmap','10-mergemap','11-switchmap','12-exhaustmap'];
  // A i B identyczne we wszystkich czterech (pytanie); switchMap ma krótszy finał — C przychodzi wcześniej.
  const input=JSON.stringify(scenes.get(ids[0]).rows[0].events.slice(0,2));
  for(const id of ids)assert.equal(JSON.stringify(scenes.get(id).rows[0].events.slice(0,2)),input,id);
  for(const id of ids.filter(id=>id!=='11-switchmap'))assert.equal(JSON.stringify(scenes.get(id).rows[0].events),JSON.stringify(scenes.get(ids[0]).rows[0].events),id);
  const concat=player(ids[0]).api;concat.seek(concat.stops.at(-1).time);
  assert.equal(concat.snapshot.nodes.find(n=>n.id==='inner1').visible,false);
  const exhaust=player(ids[3]).api;exhaust.finish();
  assert.deepEqual(Array.from(exhaust.snapshot.nodes.filter(n=>n.inner),n=>n.id),['inner0','inner2']);
  assert.deepEqual(Array.from(exhaust.snapshot.histories.find(h=>h.anchor==='observer').values,v=>v.value),['A','C']);
});

test('concatAll reveals the inner after the Observable leaves map and arrives at concatAll',async()=>{
  const {scenes,engine:{compileScene}}=await harness();
  const model=compileScene(scenes.get('08-map-strumienie'));
  assert.equal(model.events.filter(e=>e.type==='inner-create').length,2,'dwa innery: A$ i B$');
  for(const [i,value] of ['A','B'].entries()) {
    const creation=model.events.find(e=>e.type==='inner-create'&&e.node==='inner'+i);
    const mapped=model.events.find(e=>e.type==='deliver-next'&&e.edge==='source-projection'&&e.value===value);
    const arrival=model.events.find(e=>e.type==='deliver-next'&&e.edge==='projection-op'&&e.value===value+'$');
    assert.equal(creation.at,arrival.at,value);
    assert.ok(mapped.at<arrival.at,value);
    assert.equal(model.snapshot(arrival.at-.01).nodes.find(n=>n.id==='inner'+i).visible,false,value);
  }
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
  assert.match(sw.elements.get('.rx-stage').innerHTML,/data-inner-work="#1"[^]*?anulowane/);
  assert.equal(sw.api.snapshot.nodes.find(n=>n.id==='inner2').workState,'completed');
});

test('the sequential Observable example has no interlevel wires or waiting rows at any transition',async()=>{
  const {scenes,engine:{compileScene},player}=await harness();
  const model=compileScene(scenes.get('08-map-strumienie'));
  const p=player('08-map-strumienie');
  for(const t of model.checkpoints) {
    p.api.seek(t);
    assert.ok(p.api.snapshot.innerWorkPanels[0].rows.every(r=>['#1','#2'].includes(r.id)&&!['queued','pending'].includes(r.state)));
    assert.doesNotMatch(p.elements.get('.rx-stage').innerHTML,/data-connection="inner/);
    assert.doesNotMatch(p.elements.get('.rx-stage').innerHTML,/data-value-on="inner/);
  }
});

test('after eight manual stops both HTTP requests hold the same frame as finish()',async()=>{
  const {player,callbacks}=await harness(),{api}=player('08-map-strumienie');
  assert.equal(api.stops.length,8);
  api.seek(api.stops.at(-2).time);api.playContinuously();
  for(let now=0;now<30000;now+=50){const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn(now));}
  assert.equal(api.state,'finished');assert.equal(api.time,api.duration);assert.equal(callbacks.size,0);
  assert.equal(api.snapshot.executionCounts.started,2);assert.equal(api.snapshot.executionCounts.active,0);
  assert.equal(api.snapshot.innerWorkPanels[0].rows.length,2);
  assert.ok(api.snapshot.innerWorkPanels[0].rows.every(r=>r.receiver.state==='completed'));
  const final=JSON.stringify(api.snapshot);api.seek(0);api.finish();assert.equal(JSON.stringify(api.snapshot),final);
  api.seek(api.stops[0].time);assert.equal(api.snapshot.executionCounts.started,0);
  assert.equal(api.snapshot.tokens.find(t=>t.phase==='transform').value,'A$');
  api.seek(0);assert.equal(api.state,'ready');assert.equal(api.snapshot.executionCounts.started,0);assert.equal(callbacks.size,0);
});
