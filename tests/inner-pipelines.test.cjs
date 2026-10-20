const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {modules,playbackHarness}=require('./v2-harness.cjs');
// Wspólny standard dolnych pipeline'ów (instances) i kolorowania kodu na ośmiu slajdach z inner Observable.
const ids=['08-map-strumienie','09-concatmap','10-mergemap','11-switchmap','12-exhaustmap','11a-distinct-switchmap','b04-catcherror-2','b04-catcherror'];
async function deck(format='4:3'){
 class Slide{constructor(id){this.id=id;this.dataset={animation:id};this.heading={};this.player={setAttribute(){}};}
  querySelector(s){return s==='h2'?this.heading:this.player;}cloneNode(){return new Slide(this.id);}after(){}}
 const slides=[...fs.readFileSync('index.html','utf8').matchAll(/data-animation="([^"]+)"/g)].map(m=>new Slide(m[1]));
 const m=await modules(['catalog','presentation','engine','renderer','code-syntax'],{document:{querySelectorAll:()=>slides}});
 const scenes=m.presentation.prepareSlides(m.catalog.scenes,{format});
 return {m,scenes,compile:id=>m.engine.compileScene(scenes.get(id)),render:m.renderer.renderScene};
}
const rowSvg=(svg,id)=>{const from=svg.indexOf(`data-inner-work="${id}"`);const next=svg.indexOf('data-inner-work="',from+1);return svg.slice(from,next<0?undefined:next);};
const at=(c,id)=>c.stops.find(s=>s.id===id).time;

test('every checkpoint of the eight slides uses the same columns; texts stay inside their tiles in both formats',async()=>{
 for(const format of ['4:3','16:9']){
  const {compile,render}=await deck(format);
  for(const id of ids){
   const c=compile(id);
   for(const t of [0,...c.stops.map(s=>s.time),c.duration]){
    const f=c.snapshot(t),panel=f.innerWorkPanels[0],svg=render(f);
    assert.doesNotMatch(svg,/NaN|Infinity|PRACE WEWNĘTRZNE|data-inner-inbox|data-inner-name/,id);
    for(const row of panel.rows){
     const lane=row.y+panel.headerH,part=rowSvg(svg,row.id);
     assert.ok(lane+panel.rowHeight<=f.height,`${format} ${id}: ${row.id} mieści się w ramce`);
     // ID (font panelu) kończy się przed kulką, kulka przed kolumną etapów.
     const font=panel.font,r=(panel.ball||f.ball).r;
     assert.ok(panel.idX+row.id.length*.62*font<panel.ballX-r,`${id}: ID nie nachodzi na kulkę`);
     assert.ok(panel.ballX+r<panel.stagesLeft,`${id}: kulka przed HTTP GET`);
     // Napis placeholdera mieści się w nim (bez nachodzenia na ID).
     const label=part.match(/data-inner-placeholder="(\w+)"[^>]*>.*?<text x="([\d.]+)"[^>]*font-size="([\d.]+)"[^>]*>([^<]*)</);
     if(label){const width=label[4].length*.62*Number(label[3]);assert.ok(Number(label[2])-width/2>panel.stagesLeft,`${id}: „${label[4]}” w placeholderze`);}
     // Subscriber: „inner #n”, kulka wartości i status nie nachodzą na siebie.
     if(row.receiver){
      const k=f.textScale||1,size=.75*font,labelEnd=panel.receiverX+6*k+16+25+8*k+('inner '+row.id).length*.55*size;
      const valueX=Number(part.match(/data-inner-received="[^"]*"[^>]*><circle cx="([\d.]+)"/)?.[1]??panel.receiverX+195);
      const status=part.match(/data-lane-terminal="\w+"[^>]*>([^<]*)</)?.[1];
      assert.ok(labelEnd<valueX-r,`${id}: etykieta przed wartością`);
      if(status&&row.receiver.value!==undefined)
       assert.ok(valueX+r<panel.receiverX+panel.receiverW-14-status.length*.56*16*k,`${id}: wartość przed statusem`);
     }
    }
   }
  }
 }
});

test('concatAll introduction: two sequential HTTP pipelines complete without placeholders',async()=>{
 const {compile,render}=await deck(),c=compile('08-map-strumienie');
 const active=c.snapshot(at(c,'active')),svg=render(active);
 assert.deepEqual(Array.from(active.innerWorkPanels[0].rows,r=>r.id+':'+r.value+':'+r.state),['#1:A$:active']);
 assert.match(rowSvg(svg,'#1'),/data-inner-header="source"[\s\S]*>HTTP GET</);
 assert.match(rowSvg(svg,'#1'),/data-inner-receiver="#1"[\s\S]*>inner #1</);
 const done=render(c.snapshot(c.duration));
 for(const id of ['#1','#2'])assert.match(rowSvg(done,id),/data-stage-state="completed"[\s\S]*data-receiver-state="completed"[\s\S]*>✓ complete</);
 for(const t of [0,...c.checkpoints,c.duration])assert.doesNotMatch(render(c.snapshot(t)),/data-inner-placeholder|W KOLEJCE|data-inner-work="#3"/);
});

test('switchMap and distinct: cancelled pipelines keep their tiles, grey out and show × odłączono without complete; duplicates create no row',async()=>{
 const {compile,render}=await deck();
 const c=compile('11-switchmap'),svg=render(c.snapshot(at(c,'started')));
 assert.match(rowSvg(svg,'#1'),/data-stage-state="cancelled"[\s\S]*data-receiver-state="cancelled"[\s\S]*>× odłączono</);
 assert.doesNotMatch(rowSvg(svg,'#1'),/✓ complete|data-row-state="completed"/);
 assert.match(rowSvg(svg,'#2'),/data-inner-header="source"[\s\S]*>inner #2</);
 const d=compile('11a-distinct-switchmap'),end=d.snapshot(d.duration);
 assert.equal(end.innerWorkPanels[0].rows.length,3,'A, A, B, B, A → trzy inner, powtórzenia bez wiersza');
});

test('exhaustMap: skipped B keeps #2 and its ball with a dimmed POMINIĘTE placeholder, without HTTP or subscriber',async()=>{
 const {compile,render}=await deck(),c=compile('12-exhaustmap'),f=c.snapshot(at(c,'answer')),part=rowSvg(render(f),'#2');
 assert.match(part,/data-inner-placeholder="ignored"[\s\S]*>POMINIĘTE</);
 assert.match(part,/data-inner-id="#2" opacity=".45"/);
 assert.doesNotMatch(part,/data-inner-header|data-inner-receiver/);
 assert.equal(f.executionCounts.started,1);
});

test('catchError inside: HTTP GET → catchError → inner subscriber gets [] and ✓ complete; outside: HTTP GET → inner subscriber gets ! error',async()=>{
 const {compile,render}=await deck();
 const inside=compile('b04-catcherror-2'),inSvg=rowSvg(render(inside.snapshot(at(inside,'fallback'))),'#1');
 assert.match(inSvg,/data-inner-header="source"[\s\S]*data-inner-header="catch"[\s\S]*data-inner-receiver="#1"/);
 assert.match(inSvg,/data-inner-received="\[\]"/);assert.match(inSvg,/data-lane-terminal="completed"[^>]*>✓ complete</);
 const outside=compile('b04-catcherror'),outSvg=rowSvg(render(outside.snapshot(outside.duration)),'#1');
 assert.doesNotMatch(outSvg,/data-inner-header="catch"/);
 assert.match(outSvg,/data-receiver-state="errored"[\s\S]*>! error</);assert.doesNotMatch(outSvg,/data-inner-received/);
});

test('code syntax: tokens are coloured on every slide as a layer independent of the pastel marks; code text unchanged',async()=>{
 const {m,scenes}=await deck(),{codeTokens}=m['code-syntax'];
 const code="klik$.pipe(switchMap(id =>\n  httpGet(url(id)).pipe(catchError(() => of([])))))";
 const kinds=codeTokens(code),kindAt=word=>kinds[code.indexOf(word)];
 assert.equal(kindAt('klik$'),'src');assert.equal(kindAt('switchMap'),'op');assert.equal(kindAt('catchError'),'op');assert.equal(kindAt('of('),'op');
 assert.equal(kindAt('httpGet'),'src');assert.equal(kinds[code.indexOf('httpGet')+6],'src','całe httpGet jako źródło');assert.equal(kindAt('id =>'),'param');
 assert.equal(kinds[code.indexOf('url')],null,'pomocnicza funkcja bez koloru');assert.equal(kinds[code.indexOf('pipe')],null);
 const typed="const user$ = httpGet<User>('/api/users/42');",tk=codeTokens(typed);
 assert.equal(tk[typed.indexOf('User')],'type');assert.equal(tk[typed.indexOf("'/api")],'str');assert.equal(tk[0],'kw');
 // Każdy slajd z kodem (01-tytul nie jest podpięty do HTML, 25-podsumowanie nie ma kodu).
 for(const [id,scene]of scenes)if(scene.code)assert.equal(scene.codeSyntax,true,id);
 const late="klik$.pipe(withLatestFrom(filtry$))",lk=codeTokens(late);assert.equal(lk[late.indexOf('withLatestFrom')],'op');
 const ng="@if (user$ | async; as user) { … }",nk=codeTokens(ng);assert.equal(nk[ng.indexOf('async')],'op');assert.equal(nk[ng.indexOf('user$')],'src');
 // Player: tokeny wewnątrz pastelowego wyróżnienia (obie warstwy), tekst kodu bez zmian.
 const h=await playbackHarness(),{elements}=h.create({scene:scenes.get('b04-catcherror-2')}),html=elements.get('.rx-code').innerHTML;
 assert.match(html,/<span class="rx-code-mark[^"]*"[^>]*data-mark="switch"[^>]*><span class="rx-tok rx-tok-op">switchMap<\/span><\/span>/);
 assert.match(html,/<span class="rx-tok rx-tok-src">klik\$<\/span>/);
 assert.equal(html.replace(/<[^>]+>/g,'').replace(/&gt;/g,'>'),scenes.get('b04-catcherror-2').code);
 // Każdy slajd: tekst kodu po zdjęciu znaczników jest identyczny z kodem sceny (także dopisywane fragmenty).
 for(const [id,scene]of scenes){
  if(!scene.code)continue;
  const {player,elements}=h.create({scene});player.finish?.();
  const shown=elements.get('.rx-code').innerHTML.replace(/<wbr>/g,'').replace(/<[^>]+>/g,'').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
  assert.equal(shown,player.snapshot.codeView?player.snapshot.codeView.map(l=>l.map(p=>p.text).join('')).join('\n'):player.snapshot.code,id);
 }
 const op=h.create({scene:scenes.get('04-operator')}).elements.get('.rx-code').innerHTML;
 assert.match(op,/<span class="rx-tok rx-tok-src">httpGet<\/span>/);assert.match(op,/rx-tok-str">&#39;\/api\/users\/42&#39;</);
});
