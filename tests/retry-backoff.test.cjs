const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules,playbackHarness}=require('./v2-harness.cjs');
const id='x03-retry-backoff';

async function deck(format='4:3'){
 class Slide{constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}
  querySelector(s){return s==='h2'?this.heading:this.player;}cloneNode(){return new Slide(this.id);}after(){}}
 const slides=[...fs.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
 const m=await modules(['catalog','presentation','engine','renderer','code-syntax','scene-config'],{document:{querySelectorAll:()=>slides}});
 const scene=m.presentation.prepareSlides(m.catalog.scenes,{format}).get(id),c=m.engine.compileScene(scene);
 return {m,scene,c,render:m.renderer.renderScene};
}
const at=(c,id)=>c.stops.find(s=>s.id===id).time;
const frame=(c,id)=>c.snapshot(at(c,id));

test('count: 3 creates four sequential HTTP executions but only one subscription of A',async()=>{
 const {c}=await deck(),records=c.plan.records;
 assert.deepEqual(Array.from(c.stops,s=>s.id),['request-1','error-1','request-2','error-2','request-3','error-3','request-4','success','summary']);
 assert.equal([...records.keys()].filter(key=>key.startsWith('source-retry-')).length,4);
 assert.equal([...records.keys()].filter(key=>key==='retry-observer').length,1);
 const expected=[1,1,2,2,3,3,4,4,4];
 c.stops.forEach((stop,index)=>assert.equal(frame(c,stop.id).executionCounts.started,expected[index],stop.id));
 assert.deepEqual({...c.snapshot(c.duration).executionCounts},{started:4,active:0,completed:1,cancelled:0,error:3});
});

test('backoff lasts exactly 1, 2 and 4 seconds and no HTTP is active while waiting',async()=>{
 const {scene,c,render}=await deck();
 assert.deepEqual(Array.from(scene.retryPlan.windows,w=>Math.round((w.end-w.start)*10)/10),[1,2,4]);
 for(const window of scene.retryPlan.windows){
  const middle=c.snapshot((window.start+window.end)/2),svg=render(middle);
  assert.equal(middle.executionCounts.active,0);
  assert.match(svg,/data-lane-timer="0\.5"/);
  assert.match(svg,/czekam [0-9],[05] s/);
 }
});

test('three errors end at retry; A receives only User and complete from the fourth request',async()=>{
 const {c,render}=await deck(),output=c.plan.records.get('retry-observer');
 assert.deepEqual(Array.from(output.events,e=>e.value),['{…}']);
 assert.equal(output.end.kind,'complete');
 for(let i=1;i<=3;i++)assert.equal(c.plan.records.get(`source-retry-${i}`).end.kind,'error');
 const success=frame(c,'success'),history=success.histories.find(h=>h.anchor==='observer');
 assert.deepEqual(Array.from(history.values,v=>v.value),['{…}']);
 const svg=render(success);
 assert.equal((svg.match(/data-row-state="error"/g)||[]).length,3);
 assert.match(svg,/data-execution-row="#4"[^>]*data-row-state="completed"/);
 assert.match(svg,/data-lane-terminal="completed"[^>]*>✓ complete</);
 assert.doesNotMatch(svg,/data-lane-terminal="error"/);
 assert.match(svg,/data-lane-timer-text="true"[^>]*>complete</);
});

test('one pipeline and a newest-first HTTP execution stack fit both formats',async()=>{
 for(const format of ['4:3','16:9']){
  const {scene,c,render}=await deck(format),ready=c.snapshot(0),end=c.snapshot(c.duration),svg=render(end);
  assert.equal(scene.title,'retry — nie udało się? Spróbuj później');
  assert.equal(ready.nodes.find(n=>n.id==='source').executionRows.length,0);
  assert.equal(ready.nodes.find(n=>n.id==='observer').visible,false);
  assert.equal(end.panels.length,0);
  assert.equal(end.innerWorkPanels,undefined);
  const source=end.nodes.find(n=>n.id==='source'),rows=[...source.executionRows].sort((a,b)=>a.rank-b.rank);
  assert.deepEqual(Array.from(rows,r=>r.id),['#4','#3','#2','#1']);
  assert.deepEqual(Array.from(rows,r=>r.state),['completed','error','error','error']);
  assert.equal(end.nodes.find(n=>n.id==='retry').laneRows.length,1);
  assert.ok(source.y+source.h/2<=end.height,format);
  for(let i=1;i<rows.length;i++)assert.ok(rows[i].top>=rows[i-1].top+rows[i-1].h-1,`${format}: wiersze nie nachodzą`);
  assert.deepEqual(Array.from(end.nodes.filter(n=>['source','retry','observer'].includes(n.id)),n=>n.label),['HTTP GET','retry','']);
  assert.equal((svg.match(/>HTTP GET<\/text>/g)||[]).length,1);
  assert.equal((svg.match(/data-execution-row=/g)||[]).length,4);
  assert.doesNotMatch(svg,/data-inner-work-panel|data-inner-receiver|retry #[1-4]|PRACE WEWNĘTRZNE/);
  assert.doesNotMatch(svg,/NaN|Infinity/);
 }
});

test('completed attempts move down smoothly and only the newest HTTP can run',async()=>{
 const {scene,c}=await deck(),request3=frame(c,'request-3'),source=request3.nodes.find(n=>n.id==='source');
 const ordered=[...source.executionRows].sort((a,b)=>a.rank-b.rank);
 assert.deepEqual(Array.from(ordered,r=>[r.id,r.state]),[['#3','running'],['#2','error'],['#1','error']]);
 assert.equal(request3.executionCounts.active,1);
 assert.deepEqual(Array.from(request3.edges.filter(e=>e.id.startsWith('source-retry-')&&e.visible&&e.opacity>0),e=>e.id),['source-retry-3']);
 const wait4=c.snapshot((scene.retryPlan.windows[2].start+scene.retryPlan.windows[2].end)/2);
 assert.equal(wait4.executionCounts.active,0);
 assert.equal(wait4.edges.filter(e=>e.id.startsWith('source-retry-')&&e.visible&&e.opacity>0).length,0);
 assert.deepEqual(Array.from(wait4.nodes.find(n=>n.id==='source').executionRows.sort((a,b)=>a.rank-b.rank),r=>r.id),['#3','#2','#1']);
 const start2=scene.retryPlan.attempts[1].start,before=c.snapshot(start2-.001).nodes.find(n=>n.id==='source').executionRows.find(r=>r.id==='#1');
 const moving=c.snapshot(start2+.2).nodes.find(n=>n.id==='source').executionRows;
 const old=moving.find(r=>r.id==='#1'),fresh=moving.find(r=>r.id==='#2');
 assert.ok(old.top>before.top&&old.top<before.top+old.h,'#1 płynnie przesuwa się w dół');
 assert.ok(fresh.growth>0&&fresh.growth<1,'#2 płynnie pojawia się pod nagłówkiem');
});

test('code keeps RxJS 7 retry config and highlights httpGet, retry and timer',async()=>{
 const {m,scene,c}=await deck(),kinds=m['code-syntax'].codeTokens(scene.code),kind=word=>{
  const i=scene.code.indexOf(word);return new Set(kinds.slice(i,i+word.length));
 };
 assert.equal(scene.code,"httpGet<User>('/api/users/42').pipe(\n  retry({ count: 3, delay: (_error, retryCount) =>\n    timer(1000 * 2 ** (retryCount - 1)) }));");
 assert.match(scene.playerClass,/rx-lanes rx-flat-tiles rx-two-lines/);
 assert.deepEqual([...kind('http')],['src']);assert.deepEqual([...kind('retry')],['op']);assert.deepEqual([...kind('timer')],['op']);
 assert.deepEqual(Array.from(c.snapshot(0).codeView.flat().filter(part=>part.mark),part=>part.mark.id),['retry-http','retry-op','retry-timer']);
});

test('MANUAL: next during a countdown finishes the stage; rewind/reset are deterministic and notes/order include the third EXTRA',async()=>{
 const {scene,c,m}=await deck(),h=await playbackHarness(),{player,controller}=h.create({scene});
 controller.seek(at(c,'error-1'));controller.next();h.advance(300);assert.ok(player.time<5.9,'odliczanie trwa');
 controller.next();assert.equal(player.time,at(c,'request-2'),'drugie dalej kończy etap odliczania');assert.equal(player.isPlaying,false);
 controller.seek(at(c,'error-3'));controller.next();h.advance(1000);controller.next();assert.equal(player.time,at(c,'request-4'),'4 s też można pominąć');
 controller.previous();assert.equal(player.time,at(c,'error-3'));
 controller.previous();assert.equal(player.time,at(c,'request-3'));
 controller.reset();assert.equal(player.time,0);assert.equal(player.state,'ready');assert.equal(h.frames.size,0);
 assert.equal(player.resetOnExit,true);
 const auto=await playbackHarness(),autoRun=auto.create({scene});
 autoRun.controller.setMode('auto');auto.advance(27000);
 assert.equal(autoRun.player.state,'finished');assert.equal(autoRun.player.snapshot.executionCounts.started,4);
 assert.deepEqual(Array.from(m['scene-config'].extraOrder).slice(-2),[id,'x04-defer']);
 const html=fs.readFileSync('index.html','utf8');
 for(const checkpoint of ['ready','request-1','error-1','request-2','error-2','request-3','error-3','request-4','success','summary','finished'])
  assert.match(html,new RegExp(`data-checkpoint="${checkpoint}"`));
});
