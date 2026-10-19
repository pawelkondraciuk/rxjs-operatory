const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {modules}=require('./v2-harness.cjs');
// 05b-http-kod: kod źródłowy httpGet krok po kroku — stałe 2 pierwsze i 2 ostatnie linie, środek w oknie 5 linii.
const html=fs.readFileSync('index.html','utf8');
const section=html.match(/<section id="05b-http-kod"[^>]*>([\s\S]*?)<\/section>/);
const attrs=section[0].match(/<section[^>]*>/)[0],body=section[1];
const source=body.match(/<script type="text\/plain" class="code-walk-source">([\s\S]*?)<\/script>/)[1];
const steps=[...body.matchAll(/<span class="fragment code-walk-step" data-from="(\d+)" data-focus="([\d-]+)">([\s\S]*?)<\/span>/g)]
 .map(([,from,focus,notes])=>({from:Number(from),focus,notes}));
const option=name=>Number(attrs.match(new RegExp(`data-${name}="(\\d+)"`))[1]);
const options={top:option('fixed-top'),bottom:option('fixed-bottom'),window:option('window'),steps};
async function walk(){
 const {['code-walk']:w}=await modules(['code-walk']);
 const model=w.codeWalkModel(source,options);
 return {w,model,line:n=>model.lines[n-1].trim()};
}
const text=markup=>markup.replace(/<[^>]+>/g,'').replace(/​/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&');

test('slide keeps the first and last two lines and folds the middle; four steps walk through the body',async()=>{
 const {model,line}=await walk();
 assert.match(attrs,/data-code-walk/);assert.match(body,/<h2>httpGet od środka<\/h2>/);
 assert.equal(model.lines.length,17);
 assert.deepEqual(Array.from(model.lines.slice(0,2),l=>l.trim()),['function httpGet<T>(url: string): Observable<T> {','return new Observable(subscriber => {']);
 assert.deepEqual(Array.from(model.lines.slice(-2),l=>l.trim()),['});','}']);
 assert.equal(model.fold,'    // {...}');
 const focused=Array.from(model.steps,s=>Array.from({length:s.focus[1]-s.focus[0]+1},(_,i)=>line(s.focus[0]+i)).join('\n'));
 assert.match(focused[0],/^const controller = new AbortController\(\);\n\nfetch\(url, \{ signal: controller\.signal \}\)$/);
 assert.match(focused[1],/\.then\(response => response\.json\(\)\)[\s\S]*\.then\(data => \{\nsubscriber\.next\(data\);\nsubscriber\.complete\(\);\n\}\)$/);
 assert.match(focused[2],/^\.catch\(err => \{\nif \(!subscriber\.closed\) subscriber\.error\(err\);\n\}\);$/);
 assert.equal(focused[3],'return () => controller.abort();');
 // Zwinięte fragmenty: nad oknem od drugiego etapu, pod oknem do przedostatniego.
 assert.deepEqual(Array.from(model.steps,s=>[s.above,s.below]),[[false,true],[true,true],[true,true],[true,false]]);
 for(const s of model.steps)assert.ok(s.from>=3&&s.from+options.window-1<=15);
});

test('syntax colouring: keywords, types, functions, params and next/complete/error/abort in event colours',async()=>{
 const {w}=await walk(),kinds=w.codeWalkTokens(source.trim());
 const kindOf=word=>kinds[source.trim().indexOf(word)];
 for(const word of ['function','return','new','const','if'])assert.equal(kindOf(word),'kw',word);
 for(const word of ['Observable','AbortController','string'])assert.equal(kindOf(word),'type',word);
 for(const word of ['httpGet','fetch','then','json','catch'])assert.equal(kindOf(word),'fn',word);
 for(const word of ['url','subscriber','response','data','err'])assert.equal(kindOf(word),'param',word);
 assert.equal(kindOf('next'),'next');assert.equal(kindOf('complete'),'complete');assert.equal(kindOf('error'),'error');assert.equal(kindOf('abort'),'abort');
 assert.equal(w.codeWalkTokens('    // {...}')[4],'com');
});

test('HTML keeps every line verbatim; middle lines carry focus and window classes per step',async()=>{
 const {w,model}=await walk(),markup=w.codeWalkHtml(model);
 const lines=[...markup.matchAll(/<div class="cw-line ([^"]*)"[^>]*>([\s\S]*?)<\/div>/g)].map(([,cls,inner])=>({cls,text:text(inner)}));
 const code=lines.filter(l=>!/cw-fold/.test(l.cls));
 assert.deepEqual(code.map(l=>l.text),Array.from(model.lines));
 assert.deepEqual(lines.filter(l=>/cw-fold/.test(l.cls)).map(l=>l.text),['    // {...}','    // {...}']);
 assert.ok(code.slice(0,2).concat(code.slice(-2)).every(l=>/cw-fixed/.test(l.cls)));
 assert.ok(code.slice(2,-2).every(l=>/cw-mid/.test(l.cls)));
 model.steps.forEach((s,i)=>{
  const focus=code.map((l,n)=>[n+1,l]).filter(([,l])=>l.cls.split(' ').includes(`cw-f${i+1}`)).map(([n])=>n);
  assert.deepEqual(focus,Array.from({length:s.focus[1]-s.focus[0]+1},(_,k)=>s.focus[0]+k));
  assert.equal(code.filter(l=>l.cls.split(' ').includes(`cw-w${i+1}`)).length,options.window);
  assert.match(markup,new RegExp(`--cw-o${i+1}:${s.offset};--cw-a${i+1}:${+s.above};--cw-b${i+1}:${+s.below}`));
 });
 assert.match(markup,/<span class="cw-tok-complete">complete<\/span>/);
 assert.doesNotMatch(markup,/<T>|=> \{<\/div>/,'tekst escapowany');
});

test('prepareCodeWalk replaces the source, numbers the step fragments and reserves the full height',async()=>{
 const {w}=await walk(),classes=steps.map(()=>[]);let replaced,holder;
 const fake={dataset:{fixedTop:'2',fixedBottom:'2',window:'5'},
  querySelector:s=>s==='.code-walk-source'?{textContent:source,replaceWith:n=>{replaced=n;}}:null,
  querySelectorAll:()=>steps.map((s,i)=>({dataset:{from:String(s.from),focus:s.focus},classList:{add:c=>classes[i].push(c)}})),
  ownerDocument:{createElement:()=>(holder={style:{props:{},setProperty(k,v){this.props[k]=v;}}})}};
 w.prepareCodeWalk(fake);
 assert.equal(replaced,holder);assert.equal(holder.className,'code-walk-holder');
 assert.equal(holder.style.props['--cw-lines'],'11');
 assert.deepEqual(classes,steps.map((_,i)=>[`cw-step-${i+1}`]));
 assert.match(holder.innerHTML,/^<div class="code-walk"/);
});

test('CSS drives every step from .current-fragment, scrolls with transitions and fits both formats',()=>{
 const css=fs.readFileSync('animations/reveal.css','utf8');
 for(let i=1;i<=steps.length;i++){
  assert.match(css,new RegExp(`\\.code-walk-slide:has\\(\\.cw-step-${i}\\.current-fragment\\) \\.code-walk \\{ --cw-offset:var\\(--cw-o${i}\\)`));
  assert.match(css,new RegExp(`\\.code-walk-slide:has\\(\\.cw-step-${i}\\.current-fragment\\) \\.code-walk \\.cw-f${i}`));
 }
 assert.match(css,/\.cw-track \{ transform:translateY\(calc\(var\(--cw-offset\) \* -1 \* var\(--cw-lh\)\)\); transition:transform/);
 assert.match(css,/\.cw-viewport \{ height:calc\(var\(--cw-shown\) \* var\(--cw-lh\)\); overflow:hidden; transition:height/);
 assert.match(css,/prefers-reduced-motion[^}]*\.cw-track/);
 // Szerokość z zapasem dla czcionki zastępczej (0,602 em), wysokość: tytuł + 11 linii.
 const longest=Math.max(...source.split('\n').map(l=>l.length));
 for(const [size,lh,pad,title,height] of [[37,1.5,44,90,960],[36,1.34,36,64,720]]){
  assert.ok(longest*.602*size+48<=1280,`${size}px mieści najdłuższą linię`);
  assert.ok(title+11*lh*size+pad<=height,`${size}px mieści 11 linii`);
 }
});

test('speaker notes: one per step inside its fragment, plus the folded overview',()=>{
 assert.equal(steps.length,4);
 assert.deepEqual(steps.map(s=>s.notes.match(/<strong>(\d) —/)[1]),['1','2','3','4']);
 assert.match(steps[0].notes,/dopiero przy subscribe/);
 assert.match(steps[1].notes,/subscriber\.next\(data\)[\s\S]*subscriber\.complete\(\)/);
 assert.match(steps[2].notes,/subscriber\.error\(err\)/);
 assert.match(steps[3].notes,/teardown[\s\S]*unsubscribe[\s\S]*controller\.abort\(\)/);
 const overview=body.slice(body.lastIndexOf('</span>')).match(/<aside class="notes">([\s\S]*?)<\/aside>/)[1];
 assert.match(overview,/0 — Jak działa httpGet\?[\s\S]*\/\/ \{\.\.\.\}/);
});

test('full myMap slide preserves all code and highlights only upstream subscribe then downstream next',async()=>{
 const {['code-walk']:w}=await modules(['code-walk']);
 const section=html.match(/<section id="04b-map-kod"[^>]*>([\s\S]*?)<\/section>/)[0];
 assert.match(section,/data-code-walk-mode="full"/);
 const source=section.match(/<script type="text\/plain" class="code-walk-source">([\s\S]*?)<\/script>/)[1];
 const steps=[...section.matchAll(/<span class="fragment code-walk-step" data-focus="(\d+)">([\s\S]*?)<\/span>/g)]
  .map(([,focus,notes])=>({focus,notes}));
 let holder;
 const classes=steps.map(()=>[]);
 const model=w.prepareCodeWalk({dataset:{codeWalkMode:'full'},
  querySelector:()=>({textContent:source,replaceWith:n=>{holder=n;}}),
  querySelectorAll:()=>steps.map((s,i)=>({dataset:{focus:s.focus},classList:{add:c=>classes[i].push(c)}})),
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
 assert.deepEqual(lines.filter(([,cls])=>/cw-f\d/.test(cls)).map(([,cls,line])=>text(line).trim()),
  ['return source$.subscribe({','next: value => subscriber.next(fn(value)),']);
 assert.match(holder.innerHTML,/<span class="cw-tok-next">next<\/span>/);
 assert.match(holder.innerHTML,/<span class="cw-tok-complete">complete<\/span>/);
 assert.match(holder.innerHTML,/<span class="cw-tok-error">error<\/span>/);
 assert.match(steps[0].notes,/Subskrypcja idzie w lewo[\s\S]*teardown/);
 assert.match(steps[1].notes,/Emisja idzie w prawo[\s\S]*Prawo: „A share\?”/);
 assert.throws(()=>w.codeWalkModel(source,{mode:'full',steps:[{focus:'13'}]}),/poza oknem/);
 for(const [size,lh,pad,title,height] of [[37,1.5,44,90,960],[36,1.34,36,64,720]]){
  assert.ok(Math.max(...model.lines.map(l=>l.length))*.602*size+48<=1280);
  assert.ok(title+model.lines.length*lh*size+pad<=height);
 }
});
