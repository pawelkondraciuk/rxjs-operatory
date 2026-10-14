import { compileScene } from './engine.js';
import { renderScene } from './renderer.js';
import { esc, clamp } from './primitives.js';
import { createStageController } from './stage-controller.js';

// Jedyny zegar animacji. Semantyka i geometria nie zależą od RAF ani od DOM.
export function createPlayer(root, scene, controls = {}) {
const engine=compileScene(scene), playbackDuration=engine.duration;
root.classList?.toggle('rx-expanded',scene.playerLayout==='expanded');
root.classList?.toggle('rx-function',scene.playerLayout==='function');
// Scena może mieć własny kolor tekstu (np. tory wykonania: #26323B); reszta korzysta z domyślnego --ink.
if(scene.ink)root.style?.setProperty('--ink',scene.ink);
// playerClass: klasy CSS (rozdzielone spacją) tylko dla tej sceny (np. większe liczniki), bez zmiany układu innych slajdów.
if(scene.playerClass)root.classList?.add(...scene.playerClass.split(' '));
const staged=scene.playback?.controller==='stages', listeners=new Set();
let controller;
let time=0, running=false, previous=null, lastPaint=-Infinity, animationFrame=null, stopAt=null;
root.innerHTML=`<div class="rx-code"></div><div class="rx-stage"></div>
<div class="rx-summary"><div class="rx-caption"></div><div class="rx-metrics"></div></div>
<div class="rx-toolbar" hidden aria-label="Sterowanie animacją">
<button class="rx-play" type="button" title="${staged?'Pauza / kontynuuj etap (Spacja)':'Odtwórz / pauza (A)'}">Odtwórz</button>
<button class="rx-back" type="button" title="Poprzedni krok ([)">← Krok</button>
<button class="rx-next" type="button" title="Następny krok (])">Krok →</button>
${staged?'<button class="rx-finish" type="button" title="Pokaż wynik (F)">Pokaż wynik</button>':''}
<button class="rx-reset" type="button" title="Od początku (R)">↺</button>
<label class="rx-scrub"><span class="rx-clock"></span><input type="range" min="0" max="${scene.duration}" step="any" value="0" aria-label="Czas animacji"></label>
<button class="rx-hide" type="button" title="Ukryj sterowanie (U)">Ukryj · U</button></div>`;
const q=s=>root.querySelector(s);
const el={code:q('.rx-code'),stage:q('.rx-stage'),metrics:q('.rx-metrics'),caption:q('.rx-caption'),back:q('.rx-back'),play:q('.rx-play'),next:q('.rx-next'),clock:q('.rx-clock'),slider:q('input'),toolbar:q('.rx-toolbar')};

el.slider.max=String(playbackDuration);
function paint(){
 const snapshot=engine.snapshot(Math.min(time,playbackDuration));
 const reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
 // Kod jest tekstem (esc); <wbr> po „).” pozwala przenieść cały .pipe/.subscribe do nowej linii.
 const codeHtml=code=>esc(code).replace(/\)\./g,')<wbr>.');
 const reveal=snapshot.codeReveal;
 // codeView: fragmenty z kolorowym wyróżnieniem (tło + podkreślenie w kolorze klocka/toru), pojawianiem się i aktywnym podświetleniem.
 const mark=segment=>{
  const opacity=reducedMotion&&segment.opacity>0?1:segment.opacity,text=codeHtml(segment.text);
  if(!segment.mark)return opacity<1?`<span style="opacity:${opacity}" aria-hidden="${opacity===0}">${text}</span>`:text;
  return `<span class="rx-code-mark${segment.active?' rx-code-active':''}" data-mark="${esc(segment.mark.id||'')}" style="--mark-bg:${segment.mark.bg};--mark-line:${segment.mark.line};opacity:${opacity}" aria-hidden="${opacity===0}">${text}</span>`;
 };
 if(snapshot.codeView)el.code.innerHTML=snapshot.codeView.map(line=>line.map(mark).join('')).join('\n');
 else el.code.innerHTML=reveal?codeHtml(reveal.prefix)+`<span data-code-reveal="true" style="opacity:${reducedMotion&&reveal.opacity>0?1:reveal.opacity}" aria-hidden="${reveal.opacity===0}">${codeHtml(reveal.suffix)}</span>`:codeHtml(snapshot.code);
 el.stage.innerHTML=renderScene(snapshot,{reducedMotion});
 el.caption.textContent=snapshot.caption;
 el.metrics.innerHTML=snapshot.metrics.map(m=>'<div class="rx-metric"><span>'+esc(m.label)+'</span><b>'+esc(m.value)+'</b></div>').join('');
 el.play.textContent=staged&&time>=playbackDuration?'Wynik':running?'Pauza':time>=playbackDuration?'Powtórz':time>0?'Kontynuuj':'Odtwórz';
 el.back.disabled=!staged&&time<=0; el.next.disabled=!staged&&!controls.step&&time>=playbackDuration;
 el.play.disabled=staged&&time>=playbackDuration;
 el.clock.textContent=Math.min(time,playbackDuration).toFixed(1).replace('.',',')+' / '+playbackDuration.toFixed(1).replace('.',',')+' s';
 el.slider.value=String(Math.min(time,playbackDuration));
 el.slider.setAttribute('aria-valuetext',Math.min(time,playbackDuration).toFixed(1)+' sekund');
 listeners.forEach(listener=>listener());
}
function pause(){
 running=false;previous=null;
 if(animationFrame!==null)cancelAnimationFrame(animationFrame);
 animationFrame=null;paint();
}
function seek(target){pause();stopAt=null;time=clamp(target,0,playbackDuration);paint();}
// Szybkie „dalej” kończy rozpoczęty etap zamiast wybierać następny.
function finishStep(){
 if(stopAt===null)return false;
 const target=stopAt;
 seek(target);controls.onStop?.(target);
 return true;
}
// Reveal wybiera fragment; odtwarzacz jedynie animuje dojście do jego kadru.
function playTo(target){
 pause();stopAt=clamp(target,0,playbackDuration);
 if(time>=stopAt){seek(stopAt);return;}
 play();
}
function step(direction){
 const points=engine.checkpoints;
 const target=direction>0?points.find(v=>v>time+.05):[...points].reverse().find(v=>v<time-.05);
 seek(target===undefined?(direction>0?playbackDuration:0):target);
}

function play(){
 if(running)return;
 if(time>=playbackDuration)time=0;
 running=true;previous=null;paint();animationFrame=requestAnimationFrame(frame);
}
function toggle(){if(running)pause();else play();}
function playContinuously(){stopAt=null;play();}
function restart(){pause();stopAt=null;time=0;play();}
function hideControls(){el.toolbar.hidden=true;if(root.contains(document.activeElement))document.activeElement.blur();}
function toggleControls(){if(el.toolbar.hidden)el.toolbar.hidden=false;else hideControls();}
function frame(now){
 animationFrame=null;
 if(!running)return;
 if(!root.isConnected){pause();return;}
 if(previous!==null)time+=Math.min((now-previous)/1000,.25);
 previous=now;
 if(stopAt!==null&&time>=stopAt){time=stopAt;stopAt=null;pause();controls.onStop?.(time);return;}
 if(time>=playbackDuration && (staged || scene.playback?.finish !== 'loop')){time=playbackDuration;pause();controls.onFinish?.();return;}
 if(time>=playbackDuration+2){time=0;}
 if(now-lastPaint>=33){paint();lastPaint=now;}
 animationFrame=requestAnimationFrame(frame);
}
q('.rx-hide').addEventListener('click',hideControls);
el.back.addEventListener('click',()=>controller?controller.previous():controls.step?controls.step(-1):step(-1));
el.next.addEventListener('click',()=>controller?controller.next():controls.step?controls.step(1):step(1));
el.slider.addEventListener('input',()=>{
 const value=Number(el.slider.value), target=Math.abs(value-playbackDuration)<1e-7?playbackDuration:value;
 if(controller)controller.seek(target);else seek(target);
});
el.play.addEventListener('click',()=>controller?controller.toggle():controls.toggle?controls.toggle():toggle());
q('.rx-reset').addEventListener('click',()=>controller?controller.reset():controls.reset?controls.reset():restart());
if(staged)q('.rx-finish').addEventListener('click',()=>controller.finish());
// Pozwól przyciskom i suwakowi obsługiwać własne klawisze.
root.addEventListener('keydown',event=>{
 if(event.target.matches('input')||(['Enter',' '].includes(event.key)&&event.target.matches('button')))event.stopPropagation();
});
paint();
const api={subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},pause,play,playTo,playContinuously,toggle,step,finishStep,reset:restart,restart,seek,finish:()=>seek(playbackDuration),get isPlaying(){return running;},get time(){return Math.min(time,playbackDuration);},get duration(){return playbackDuration;},get snapshot(){return engine.snapshot(time);},get stops(){return engine.stops;},get state(){return running?'playing':time>=playbackDuration?'finished':time===0?'ready':'paused';},hideControls,toggleControls};
if(staged){controller=createStageController(api,{mode:scene.playback.entry,...controls.stageOptions});api.controller=controller;}
return api;
}
