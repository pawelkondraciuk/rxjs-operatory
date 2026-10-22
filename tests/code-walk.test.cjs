const {slideNotes}=require('./slide-notes.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {modules}=require('./v2-harness.cjs');
// 05b-http-kod: cały kod httpGet od wejścia (tryb full), cztery etapy wyróżniają tylko fragmenty linii (data-mark).
const html=fs.readFileSync('index.html','utf8');
const section=html.match(/<section id="05b-http-kod"[^>]*>([\s\S]*?)<\/section>/);
const attrs=section[0].match(/<section[^>]*>/)[0],body=section[1];
const source=body.match(/<script type="text\/plain" class="code-walk-source">([\s\S]*?)<\/script>/)[1];
const steps=[...body.matchAll(/<span class="fragment code-walk-step" data-focus="([\d-]+)" data-mark="([^"]+)">([\s\S]*?)<\/span>/g)]
 .map(([,focus,mark,notes])=>({focus,mark,notes}));
const options={mode:'full',steps};
async function walk(){
 const {['code-walk']:w}=await modules(['code-walk']);
 return {w,model:w.codeWalkModel(source,options)};
}
const text=markup=>markup.replace(/<[^>]+>/g,'').replace(/​/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&');
// Wyróżniony fragment to jeden zewnętrzny span.cw-mN ze spanami tokenów w środku (bez szwów tła).
const marked=(markup,n)=>[...markup.matchAll(new RegExp(`<span class="cw-m${n}">((?:<span class="cw-tok-[a-z]+">[^<]*</span>|[^<])*)</span>`,'g'))].map(([,inner])=>text(inner));

test('full httpGet slide shows only the short Observable body; four steps mark subscriber, fetch + r.json(), next and complete',async()=>{
 const {w,model}=await walk();
 assert.match(attrs,/data-code-walk/);assert.match(attrs,/data-code-walk-mode="full"/);assert.match(attrs,/data-line-numbers/);assert.match(body,/<h2>httpGet od środka<\/h2>/);
 assert.equal(model.lines.join('\n'),`return new Observable(subscriber => {
  fetch(url)
    .then(r => r.json())
    .then(data => {
      subscriber.next(data);
      subscriber.complete();
    });
});`);
 assert.deepEqual(steps.map(s=>[s.focus,s.mark]),[['1','subscriber'],['2-3','fetch|r.json()'],['5','subscriber.next(data)'],['6','complete()']]);
 const markup=w.codeWalkHtml(model);
 assert.deepEqual(marked(markup,1),['subscriber']);
 assert.deepEqual(marked(markup,2),['fetch','r.json()']);
 assert.deepEqual(marked(markup,3),['subscriber.next(data)']);
 assert.deepEqual(marked(markup,4),['complete()']);
 assert.doesNotMatch(markup,/cw-f\d|cw-fold|cw-viewport|cw-mid|cw-fixed/,'data-mark zastępuje wyróżnienie całych linii');
 assert.throws(()=>w.codeWalkModel(source,{mode:'full',steps:[{focus:'2',mark:'subscriber'}]}),/bez „subscriber”/);
});

test('syntax colouring: keywords, types, functions, params and next/complete in event colours',async()=>{
 const {w}=await walk(),code=source.trim(),kinds=w.codeWalkTokens(code);
 const kindOf=word=>kinds[code.indexOf(word)];
 for(const word of ['return','new'])assert.equal(kindOf(word),'kw',word);
 assert.equal(kindOf('Observable'),'type');
 for(const word of ['fetch','then','json'])assert.equal(kindOf(word),'fn',word);
 for(const word of ['subscriber','data'])assert.equal(kindOf(word),'param',word);
 assert.equal(kindOf('next'),'next');assert.equal(kindOf('complete'),'complete');
 assert.equal(w.codeWalkTokens('    // {...}')[4],'com');
});

test('HTML keeps every line verbatim, escaped, with marks layered over syntax tokens',async()=>{
 const {w,model}=await walk(),markup=w.codeWalkHtml(model);
 const lines=[...markup.matchAll(/<div class="cw-line ([^"]*)"[^>]*>([\s\S]*?)<\/div>/g)].map(([,cls,inner])=>({cls,text:text(inner)}));
 assert.deepEqual(lines.map(l=>l.text),Array.from(model.lines));
 assert.ok(lines.every(l=>/cw-full-line/.test(l.cls)));
 assert.match(markup,/<span class="cw-m1"><span class="cw-tok-param">subscriber<\/span><\/span>/);
 assert.match(markup,/<span class="cw-m3">[\s\S]*<span class="cw-tok-next">next<\/span>[\s\S]*<\/span>/);
 assert.match(markup,/<span class="cw-m4"><span class="cw-tok-complete">complete<\/span>\(\)<\/span>/);
 assert.doesNotMatch(markup,/=> \{<\/div>/,'tekst escapowany');
});

test('prepareCodeWalk replaces the source, numbers the step fragments and reserves the full height',async()=>{
 const {w}=await walk(),classes=steps.map(()=>[]);let replaced,holder;
 const fake={dataset:{codeWalkMode:'full'},
  querySelector:s=>s==='.code-walk-source'?{textContent:source,replaceWith:n=>{replaced=n;}}:null,
  querySelectorAll:()=>steps.map((s,i)=>({dataset:{focus:s.focus,mark:s.mark},classList:{add:c=>classes[i].push(c)}})),
  ownerDocument:{createElement:()=>(holder={style:{props:{},setProperty(k,v){this.props[k]=v;}}})}};
 w.prepareCodeWalk(fake);
 assert.equal(replaced,holder);assert.equal(holder.className,'code-walk-holder');
 assert.equal(holder.style.props['--cw-lines'],'8');
 assert.deepEqual(classes,steps.map((_,i)=>[`cw-step-${i+1}`]));
 assert.match(holder.innerHTML,/^<div class="code-walk code-walk-full"/);
 assert.match(holder.innerHTML,/cw-m4/);
});

test('CSS drives every step from .current-fragment and fits both formats',()=>{
 const css=fs.readFileSync('animations/reveal.css','utf8');
 for(let i=1;i<=6;i++){
  assert.match(css,new RegExp(`\\.code-walk-slide:has\\(\\.cw-step-${i}\\.current-fragment\\) \\.code-walk \\.cw-f${i}`));
  assert.match(css,new RegExp(`\\.code-walk-slide:has\\(\\.cw-step-${i}\\.current-fragment\\) \\.code-walk \\.cw-m${i}`));
 }
 assert.match(css,/prefers-reduced-motion[^}]*cw-m/);
 const lines=source.trim().split('\n'),longest=Math.max(...lines.map(l=>l.length));
 for(const [size,lh,pad,title,height] of [[37,1.5,44,90,960],[36,1.34,36,64,720]]){
  assert.ok((longest+3)*.602*size+48<=1280,`${size}px mieści najdłuższą linię z numerem`);
  assert.ok(title+lines.length*lh*size+pad<=height,`${size}px mieści cały kod`);
 }
});

test('httpGet code has one static list and no fragment notes',()=>{
 assert.equal(steps.length,4);assert.ok(steps.every(s=>!s.notes.trim()));
 assert.equal((body.match(/<aside class="notes">/g)||[]).length,1);
 const notes=slideNotes('05b-http-kod');assert.match(notes,/Producent uruchamiany przy subscribe/);assert.match(notes,/fetch → r\.json\(\)/);assert.match(notes,/tylko ścieżka sukcesu/);
});

test('full myMap slide preserves all code and highlights only upstream subscribe then downstream next',async()=>{
 const {['code-walk']:w}=await modules(['code-walk']);
 const section=html.match(/<section id="04b-map-kod"[^>]*>([\s\S]*?)<\/section>/)[0];
 assert.match(section,/data-code-walk-mode="full"/);
 const source=section.match(/<script type="text\/plain" class="code-walk-source">([\s\S]*?)<\/script>/)[1];
 const unesc=t=>t.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 const steps=[...section.matchAll(/<span class="fragment code-walk-step" data-focus="([\d-]+)" data-mark="([^"]*)">([\s\S]*?)<\/span>/g)]
  .map(([,focus,mark,notes])=>({focus,mark:unesc(mark),notes}));
 assert.match(section,/<section id="04b-map-kod"[^>]*data-line-numbers/);
 let holder;
 const classes=steps.map(()=>[]);
 const model=w.prepareCodeWalk({dataset:{codeWalkMode:'full'},
  querySelector:()=>({textContent:source,replaceWith:n=>{holder=n;}}),
  querySelectorAll:()=>steps.map((s,i)=>({dataset:{focus:s.focus,mark:s.mark},classList:{add:c=>classes[i].push(c)}})),
  ownerDocument:{createElement:()=>({style:{props:{},setProperty(k,v){this.props[k]=v;}}})}});
 assert.equal(model.lines.join('\n'),`function myMap<T, R>(fn: (value: T) => R) {
  return (source$: Observable<T>) =>
    new Observable<R>(subscriber => {

      return source$.subscribe({
        next: value => subscriber.next(fn(value)),
        error: err => subscriber.error(err),
        complete: () => subscriber.complete()
      });

    });
}`);
 assert.equal(holder.style.props['--cw-lines'],'12');
 assert.deepEqual(classes,[['cw-step-1'],['cw-step-2']]);
 assert.doesNotMatch(holder.innerHTML,/cw-fold|cw-viewport|cw-track|cw-mid|cw-fixed/);
 const lines=[...holder.innerHTML.matchAll(/<div class="cw-line ([^"]*)">([\s\S]*?)<\/div>/g)];
 assert.deepEqual(lines.map(([,cls,line])=>text(line)),Array.from(model.lines));
 assert.deepEqual(lines.filter(([,cls])=>/cw-f\d/.test(cls)),[],'bez tła całych linii');
 assert.deepEqual(marked(holder.innerHTML,1),['source$: Observable<T>','source$.subscribe({']);
 assert.deepEqual(marked(holder.innerHTML,2),['subscriber','subscriber.next(fn(value))']);
 const css=fs.readFileSync('animations/reveal.css','utf8');
 assert.match(css,/\[data-line-numbers\] \.cw-full-line::before \{[^}]*content:counter\(cw-line\)/);
 assert.match(holder.innerHTML,/<span class="cw-tok-next">next<\/span>/);
 assert.match(holder.innerHTML,/<span class="cw-tok-complete">complete<\/span>/);
 assert.match(holder.innerHTML,/<span class="cw-tok-error">error<\/span>/);
 assert.ok(steps.every(s=>!s.notes.trim()));
 const notes=slideNotes('04b-map-kod');assert.match(notes,/subscribe wyniku → subscribe źródła/);assert.match(notes,/teardown/);
 assert.throws(()=>w.codeWalkModel(source,{mode:'full',steps:[{focus:'13'}]}),/poza oknem/);
 for(const [size,lh,pad,title,height] of [[37,1.5,44,90,960],[36,1.34,36,64,720]]){
  assert.ok((Math.max(...model.lines.map(l=>l.length))+3)*.602*size+48<=1280,'najdłuższa linia z numerem');
  assert.ok(title+model.lines.length*lh*size+pad<=height);
 }
});
