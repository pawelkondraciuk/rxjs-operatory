const {test}=require('node:test'),assert=require('node:assert/strict');
const {modules}=require('./v2-harness.cjs');
const harness=async()=> (await modules(['renderer'])).renderer;
const panel={id:'jobs',x:190,y:140,w:860,h:310,from:{x:720,y:121},label:'PRACE WEWNĘTRZNE',recipe:'Każde inner$: HTTP → catchError',maxRows:3,detailsHeight:64};
const execution=(id,p={})=>({id,node:'inner'+id,edge:id+'-op',panel:'jobs',label:id+'$',state:'running',progress:.37,httpState:'running',handledError:false,focused:false,values:[],...p});
const queued=id=>({id:'queued'+id,panel:'jobs',label:id+' (wartość)',createdBy:{value:id},visible:true,workRow:true,workState:'queued',status:'w kolejce',x:600,y:250,w:560,h:42,opacity:1});
const frame=(p={})=>({title:'Scena',caption:'Pytanie',width:1240,height:460,time:2,panels:[panel],executions:[],nodes:[],edges:[],tokens:[],histories:[],cards:[],queue:'Kolejka wartości: [B, C]',...p});
test('panel reveals one recipe after subscription and replaces legacy queue/work rows',async()=>{
 const {renderScene}=await harness();assert.doesNotMatch(renderScene(frame()),/data-inner-recipe/);
 const svg=renderScene(frame({executions:[execution('A')],nodes:[{...queued('A'),id:'innerA',workState:'active'},queued('B')]}));
 assert.equal((svg.match(/data-inner-recipe=/g)||[]).length,1);assert.equal((svg.match(/data-execution=/g)||[]).length,2);
 assert.doesNotMatch(svg,/data-node="innerA"|data-node="queuedB"|data-queue=/);assert.match(svg,/◷ w kolejce/);
});
test('HTTP error and inner complete have separate labels, one focus and fixed details geometry',async()=>{
 const {renderScene}=await harness(),a=execution('A',{state:'cancelled',httpState:'cancelled'}),b=execution('B',{httpState:'error',handledError:true,focused:true,handlerLabel:'catchError'});
 const error=renderScene(frame({executions:[a,b],focusedExecutionId:'B'}));
 assert.match(error,/data-execution="B" data-inner-state="running" data-http-state="error"/);assert.match(error,/HTTP error · przechwycony/);
 assert.match(error,/catchError · przechwycony/);assert.equal((error.match(/data-execution-details=/g)||[]).length,1);
 const complete=renderScene(frame({executions:[a,{...b,state:'completed',values:[{value:'fallback B'}]}],focusedExecutionId:'B'}));
 assert.match(complete,/data-execution="B" data-inner-state="completed" data-http-state="error"/);
 assert.match(complete,/HTTP error → fallback → ✓ complete/);assert.match(complete,/fallback: fallback B → ✓ complete inner/);assert.doesNotMatch(complete,/× error inner/);
 const empty=renderScene(frame({executions:[{...b,state:'completed'}],focusedExecutionId:'B'}));assert.match(empty,/bez wartości → ✓ complete inner/);
 const geometry=svg=>svg.match(/data-execution-details="B"><rect x="[^"]+" y="[^"]+" width="[^"]+" height="[^"]+"/)[0];
 assert.equal(geometry(error),geometry(complete));assert.equal(geometry(error),geometry(empty));
});
test('bounded rows retain focus, active work and every queued value, summarizing only terminal history',async()=>{
 const {executionPanelRows,renderScene}=await harness(),history=Array.from({length:6},(_,i)=>execution(String(i),{state:i%2?'cancelled':'completed'}));
 const data=frame({executions:[...history,execution('A')],nodes:['B','C','D'].map(queued),focusedExecutionId:'0'}),s=executionPanelRows(data,panel);
 assert.equal(s.rows.length,3);assert.ok(s.rows.some(r=>r.id==='0'));assert.ok(s.rows.some(r=>r.id==='A'));
 assert.deepEqual(Array.from(s.rows.find(r=>r.type==='queued').members,r=>r.createdBy.value),['B','C','D']);assert.equal(s.hidden.length,5);
 const svg=renderScene(data);assert.match(svg,/B, C, D/);assert.match(svg,/data-execution-summary/);assert.equal((svg.match(/data-execution-details=/g)||[]).length,1);
});
test('cancelled work preserves progress and never gains a complete label',async()=>{
 const {renderScene}=await harness(),data=frame({executions:[execution('A',{state:'cancelled',httpState:'cancelled'})]}),before=JSON.stringify(data),svg=renderScene(data);
 assert.match(svg,/data-execution-progress="0.37"/);assert.match(svg,/× anulowana · ABORT \(klient\)/);assert.doesNotMatch(svg,/✓ complete/);
 assert.equal(JSON.stringify(data),before);assert.equal(renderScene(data),svg);
});
test('reduced motion changes travel only, preserving delivery history and immutable snapshots',async()=>{
 const {renderScene}=await harness(),data=frame({edges:[{id:'a-b',visible:true,phase:'subscribed',offset:-.4,color:'#111',points:[[100,50],[900,50]]}],tokens:[{edge:'a-b',phase:'travel',x:400,y:50,value:'B',color:'b'}],histories:[{x:1000,y:90,w:200,values:[{value:'A'},{value:'A'}]}]});
 const before=JSON.stringify(data),normal=renderScene(data),reduced=renderScene(data,{reducedMotion:true});
 assert.match(normal,/stroke-dashoffset="-0.4"/);assert.match(reduced,/stroke-dashoffset="0"/);
 assert.match(normal,/data-token="travel"><rect x="377"/);assert.match(reduced,/data-token="travel"><rect x="877"/);
 assert.equal((normal.match(/data-token="received"/g)||[]).length,2);assert.equal((reduced.match(/data-token="received"/g)||[]).length,2);assert.equal(JSON.stringify(data),before);
});
test('legacy queue and work remain available without execution data',async()=>{
 const {renderScene}=await harness(),data=frame({panels:[{...panel,id:undefined}],nodes:[queued('B')]});delete data.executions;
 const svg=renderScene(data);assert.match(svg,/data-node="queuedB"/);assert.match(svg,/data-queue="true"/);assert.doesNotMatch(svg,/data-execution=/);
});
test('long values preserve escaped full titles with bounded token text',async()=>{
 const {renderScene}=await harness(),value='bardzo długi fallback <B> & kolejna wartość';
 const svg=renderScene(frame({histories:[{x:1100,y:90,w:240,values:[{value}]}]}));
 assert.match(svg,/<title>bardzo długi fallback &lt;B&gt; &amp; kolejna wartość<\/title>/);assert.match(svg,/>bardzo dł…<\/text>/);assert.doesNotMatch(svg,/NaN|Infinity/);
});
test('receiver keeps readable fallback and collapses only older visual history inside its tile',async()=>{
 const {renderScene}=await harness(),data=frame({histories:[{x:1100,y:90,w:240,values:[{value:'A1'},{value:'A2'},{value:'fallback B'}]}]}),svg=renderScene(data);
 assert.match(svg,/>fallback B<\/text>/);assert.match(svg,/>A2<\/text>/);assert.doesNotMatch(svg,/>A1<\/text>/);assert.match(svg,/>…<\/text>/);assert.equal(data.histories[0].values.length,3);
 const tokens=[...svg.matchAll(/data-token="received"[^]*?<rect x="([^"]+)"[^]*?width="([^"]+)"/g)];
 for(const match of tokens){const x=Number(match[1]),w=Number(match[2]);assert.ok(x>=980&&x+w<=1220);}
});
