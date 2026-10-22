// Slajd „kod źródłowy krok po kroku” (section[data-code-walk]): pierwsze i ostatnie linie stoją, środek przewija się
// w oknie o stałej liczbie linii. Kod ukryty nad i pod oknem zastępuje zwinięty komentarz // {...}.
// Tryb full pokazuje cały kod od początku, a fragmenty zmieniają wyłącznie wyróżnienie linii.
// Opcjonalne data-mark etapu („a|b”) wyróżnia tylko te fragmenty tekstu w liniach focus zamiast całych linii.
// Etapy to natywne fragmenty Reveal (.code-walk-step): stan wybiera CSS po .current-fragment, więc przód/tył, szybkie
// przechodzenie, hash, podgląd Notes i druk (osobne strony fragmentów) działają bez własnego zegara i handlerów.
import { codeTokens } from './code-syntax.js';

const notifications={next:'next',complete:'complete',error:'error'};
// Kolorowanie składni pełnego TypeScriptu (wspólne codeTokens + komentarze, if, typy, wywołania funkcji i notyfikacje
// subscriber.next/complete/error w kolorach zdarzeń prezentacji). Zwraca rodzaj tokenu dla każdego znaku.
export function codeWalkTokens(code) {
  const kinds=codeTokens(code),mark=(from,to,kind)=>{for(let i=from;i<to;i++)kinds[i]=kind;};
  const free=i=>kinds[i]!=='str';
  // Parametry deklaracji funkcji (function httpGet<T>(url: string)) — jak parametry funkcji strzałkowych.
  const params=new Set([...code.matchAll(/function\s+[\w$]+(?:<[^>]*>)?\(([^)]*)\)/g)]
    .flatMap(m=>m[1].split(',').map(p=>p.trim().split(/[\s:=?]/)[0]).filter(Boolean)));
  for(const m of code.matchAll(/[A-Za-z_$][\w$]*/g)) {
    const i=m.index,word=m[0],end=i+word.length;
    if(!free(i)||kinds[i]==='kw')continue;
    const property=code[i-1]==='.',call=/^\s*(?:<[^>()]*>)?\(/.test(code.slice(end)),annotation=/:\s*$/.test(code.slice(Math.max(0,i-3),i));
    const kind=word==='if'?'kw':
      property&&call&&notifications[word]&&/subscriber\.$/.test(code.slice(Math.max(0,i-11),i))?notifications[word]:
      property&&call&&word==='abort'?'abort':
      !property&&/^[A-Z]/.test(word)?'type':
      annotation&&!property&&/^(string|number|boolean|void|unknown|any)$/.test(word)?'type':
      call?'fn':
      !property&&params.has(word)?'param':kinds[i];
    if(kind)mark(i,end,kind);
  }
  for(const m of code.matchAll(/\/\/.*$/gm))if(free(m.index))mark(m.index,m.index+m[0].length,'com');
  return kinds;
}

const range=text=>{const [a,b=a]=String(text).split('-').map(Number);return [a,b];};
// Model: linie stałe (top/bottom), środek, okno i etapy. Numery linii w danych są 1-based i dotyczą całego kodu.
// Etap: from — pierwsza linia okna, focus — wyróżnione linie (w oknie). Etap 0 to zwinięty środek (sam // {...}).
export function codeWalkModel(code,{mode='window',top,bottom,window,steps}) {
  const lines=code.replace(/^\n+|\s+$/g,'').split('\n');
  if(mode==='full'){top=0;bottom=0;window=lines.length;}
  const first=top+1,last=lines.length-bottom;
  if(!(top>=0&&bottom>=0&&window>0&&last-first+1>=window))throw new Error('code-walk: nieprawidłowe okno');
  const fold=`${(lines[first-1].match(/^\s*/)[0])}// {...}`;
  return {mode,lines,top,bottom,window,fold,middle:[first,last],steps:steps.map(({from,focus,mark},i)=>{
    if(mode==='full')from=first;
    const [a,b]=range(focus);
    if(!(from>=first&&from+window-1<=last&&a>=from&&b<=from+window-1&&a<=b))throw new Error(`code-walk: etap ${i+1} poza oknem`);
    const marks=mark?String(mark).split('|').filter(Boolean):[];
    for(const m of marks)if(!lines.slice(a-1,b).some(l=>l.includes(m)))throw new Error(`code-walk: etap ${i+1} bez „${m}”`);
    return {from,focus:[a,b],marks,offset:from-first,above:from>first,below:from+window-1<last};
  })};
}

const esc=text=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// Linia jako spany tokenów (rodzaj z tokenów całego kodu, więc granice linii nie mają znaczenia);
// marks[i] — klasy cw-mN wyróżnionych fragmentów etapów dla znaku i linii; ciągły fragment to jeden zewnętrzny span
// (tło bez szwów między tokenami), tokeny składni wewnątrz.
function tokensHtml(text,kinds,start) {
  let html='',run='',kind;
  const flush=()=>{if(run)html+=kind?`<span class="cw-tok-${kind}">${esc(run)}</span>`:esc(run);run='';};
  for(let i=0;i<text.length;i++){if(kinds[start+i]!==kind){flush();kind=kinds[start+i];}run+=text[i];}
  flush();return html;
}
function lineHtml(text,kinds,start,marks=[]) {
  let html='';
  for(let i=0;i<text.length;){
    const cls=(marks[i]||[]).join(' ');let j=i+1;
    while(j<text.length&&(marks[j]||[]).join(' ')===cls)j++;
    const inner=tokensHtml(text.slice(i,j),kinds,start+i);
    html+=cls?`<span class="${cls}">${inner}</span>`:inner;i=j;
  }
  return html||'​';
}
// Klasy cw-mN dla znaków linii n: wszystkie wystąpienia fragmentów data-mark etapów, w których n jest w focus.
function lineMarks(model,n) {
  const text=model.lines[n-1],marks=[];
  model.steps.forEach((s,i)=>{
    if(n<s.focus[0]||n>s.focus[1])return;
    for(const m of s.marks)for(let at=text.indexOf(m);at>=0;at=text.indexOf(m,at+m.length))
      for(let k=at;k<at+m.length;k++){const c=`cw-m${i+1}`,list=(marks[k]||=[]);if(!list.includes(c))list.push(c);}
  });
  return marks;
}
// HTML okna kodu. Zmienne CSS --cw-oN/--cw-aN/--cw-bN niosą przesunięcie i widoczność zwiniętych fragmentów etapu N;
// linie środka mają klasy cw-fN (wyróżnienie w etapie N) i cw-wN (w oknie etapu N).
export function codeWalkHtml(model) {
  const {lines,top,middle:[first,last],steps}=model,code=lines.join('\n'),kinds=codeWalkTokens(code),foldKinds=codeWalkTokens(model.fold);
  const starts=lines.reduce((acc,line,i)=>[...acc,i?acc[i-1]+lines[i-1].length+1:0],[]);
  const line=(n,cls)=>`<div class="cw-line ${cls}">${lineHtml(lines[n-1],kinds,starts[n-1],lineMarks(model,n))}</div>`;
  const vars=[`--cw-window:${model.window}`,...steps.flatMap((s,i)=>[`--cw-o${i+1}:${s.offset}`,`--cw-a${i+1}:${+s.above}`,`--cw-b${i+1}:${+s.below}`])];
  const middleClass=n=>[model.mode==='full'?'cw-full-line':'cw-mid',...steps.flatMap((s,i)=>[
    ...(!s.marks.length&&n>=s.focus[0]&&n<=s.focus[1]?[`cw-f${i+1}`]:[]),...(n>=s.from&&n<s.from+model.window?[`cw-w${i+1}`]:[])])].join(' ');
  const fold=side=>`<div class="cw-line cw-fold cw-fold-${side}" aria-hidden="true">${lineHtml(model.fold,foldKinds,0)}</div>`;
  if(model.mode==='full')return `<div class="code-walk code-walk-full" role="img" aria-label="${esc(code).replace(/"/g,'&quot;')}">`+
    lines.map((_,i)=>line(i+1,middleClass(i+1))).join('')+'</div>';
  return `<div class="code-walk" style="${vars.join(';')}" role="img" aria-label="${esc(code).replace(/"/g,'&quot;')}">`+
    lines.slice(0,top).map((_,i)=>line(i+1,'cw-fixed')).join('')+fold('top')+
    `<div class="cw-viewport"><div class="cw-track">${lines.slice(first-1,last).map((_,i)=>line(first+i,middleClass(first+i))).join('')}</div></div>`+
    fold('bottom')+lines.slice(last).map((_,i)=>line(last+i+1,'cw-fixed')).join('')+'</div>';
}

// Buduje okno kodu z section[data-code-walk]: źródło w script[type="text/plain"].code-walk-source, etapy w
// .code-walk-step[data-from][data-focus][data-mark?] (kolejne wyróżnienia Reveal; stałe notatki na sekcji).
// data-code-walk-mode="full": bez okna i zwijania; kroki wymagają tylko data-focus.
export function prepareCodeWalk(section) {
  const source=section.querySelector('.code-walk-source'),steps=[...section.querySelectorAll('.code-walk-step')];
  const model=codeWalkModel(source.textContent,{mode:section.dataset.codeWalkMode,top:Number(section.dataset.fixedTop),bottom:Number(section.dataset.fixedBottom),
    window:Number(section.dataset.window),steps:steps.map(step=>({from:Number(step.dataset.from),focus:step.dataset.focus,mark:step.dataset.mark}))});
  steps.forEach((step,i)=>step.classList.add(`cw-step-${i+1}`));
  const holder=section.ownerDocument.createElement('div');
  // Pełna wysokość (stałe linie, dwa zwinięte fragmenty i okno) zarezerwowana od etapu 0.
  holder.className='code-walk-holder';holder.style.setProperty('--cw-lines',String(model.mode==='full'?model.lines.length:model.top+model.bottom+2+model.window));
  holder.innerHTML=codeWalkHtml(model);
  source.replaceWith(holder);
  return model;
}
