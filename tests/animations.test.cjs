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
  const modules=await Promise.all(['catalog','presentation','player','lifecycle','flow'].map(name=>load(`animations/${name}.js`)));
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
  return {scenes,player,lifecycle:modules[3].namespace,flow:modules[4].namespace,callbacks};
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
  const {player,callbacks}=await harness();const {api,elements}=player('07-hot-cold');
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

test('operator fragments animate to stable subscription, map and delivery frames',async()=>{
  const {scenes,player,callbacks}=await harness();
  const {api,elements}=player('04-operator');
  let now=0;
  const advance=seconds=>{
    const end=now+seconds*1000;
    for(;now<=end;now+=50){const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn(now));}
  };
  const svg=()=>elements.get('.rx-stage').innerHTML;
  assert.match(svg(),/>Źródło<\/text>/);
  assert.doesNotMatch(svg(),/Subject|data-subscription|data-token="received"/);
  for(const [index,target] of scenes.get('04-operator').fragmentSteps.slice(1).entries()){
    api.playTo(target);
    advance(6);
    assert.equal(callbacks.size,0,`fragment ${index} stops without a queued frame`);
    assert.equal(Number(elements.get('input').value),target);
    const received=(svg().match(/data-token="received"/g)||[]).length;
    assert.equal(received,Math.min(3,Math.floor(index/2)));
    if([1,3,5].includes(index))assert.match(svg(),/data-transformation="true"/);
    if(index===0)assert.match(svg(),/data-subscription="true" data-progress="1"/);
    if(index>=7)assert.doesNotMatch(svg(),/data-subscription/);
    const stable=svg();advance(2);assert.equal(svg(),stable);
  }
  api.seek(6.25);
  assert.doesNotMatch(svg(),/data-token="received"/);
  api.playTo(7.5);advance(.5);api.pause();
  assert.equal(callbacks.size,0);
  api.playTo(7.5);advance(3);
  assert.equal((svg().match(/data-token="received"/g)||[]).length,1);
  api.seek(0);assert.doesNotMatch(svg(),/data-subscription|data-token="received"/);
});

test('operator highlights only the block handling the current value',async()=>{
  const {player}=await harness();
  const {api,elements}=player('04-operator');
  const check=(time,active,phase)=>{
    api.seek(time);
    const svg=elements.get('.rx-stage').innerHTML;
    const highlighted=[...svg.matchAll(/data-node="([^"]+)" data-active="true"/g)].map(match=>match[1]);
    assert.deepEqual(highlighted,active? [active] : [],`active block at ${time}`);
    if(phase)assert.match(svg,new RegExp(`data-token="${phase}"`));
    if(active)assert.match(svg,new RegExp(`data-node="${active}" data-active="true"><rect[^>]*stroke="#805095"`));
  };
  for(const start of [5,9,13]){
    check(start+.1,'source','emitting');
    check(start+.6,null,'to-map');
    check(start+1.25,'map');
    check(start+1.75,null,'to-observer');
    check(start+2.5,'observer','received');
    check(start+3.1,null,'received');
  }
  check(21.1,'source','unobserved');
  check(21.6,null,'unobserved');
  api.seek(6.25);check(7.5,'observer','received');
  api.seek(6.25);check(6.25,'map');
});

test('automatic playback releases a manual stop and loops after the first full walkthrough',async()=>{
  const {player,callbacks}=await harness();
  const stops=[];
  const {api}=player('04-operator',{onStop:time=>{stops.push(time);if(time===22)api.playContinuously();}});
  let now=0;
  const advance=seconds=>{
    const end=now+seconds*1000;
    for(;now<=end;now+=50){const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn(now));}
  };
  api.playTo(4);advance(1);api.playContinuously();advance(5);
  assert.ok(api.time>4);
  assert.equal(stops.length,0);
  api.seek(20);api.playTo(22);advance(3);
  assert.deepEqual(stops,[22]);
  assert.ok(callbacks.size>0);
  advance(5);
  assert.ok(api.time<5,'automatic repeat starts from the beginning');
  api.pause();assert.equal(callbacks.size,0);
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

test('share fades in and a value never occupies consecutive connections simultaneously',async()=>{
  const {player}=await harness();
  const {api,elements}=player('07-hot-cold-2');
  api.seek(1.15);
  let svg=elements.get('.rx-stage').innerHTML;
  const opacity=Number(svg.match(/data-node="hub" opacity="([^"]+)"/)[1]);
  assert.ok(opacity>0&&opacity<1);
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
