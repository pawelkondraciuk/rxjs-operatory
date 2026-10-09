import { compileScene } from './engine.js';
import { renderScene } from './renderer.js';
import { esc, clamp } from './primitives.js';

// Jedyny zegar animacji. Semantyka i geometria nie zależą od RAF ani od DOM.
export function createPlayer(root, scene, controls = {}) {
const engine=compileScene(scene), playbackDuration=engine.duration;
let time=0, running=false, previous=null, lastPaint=-Infinity, animationFrame=null, stopAt=null;
root.innerHTML=`<div class="rx-code"></div><div class="rx-stage"></div>
<div class="rx-summary"><div class="rx-caption"></div><div class="rx-metrics"></div></div>
<div class="rx-toolbar" hidden aria-label="Sterowanie animacją">
<button class="rx-play" type="button" title="Odtwórz / pauza (A)">Odtwórz</button>
<button class="rx-back" type="button" title="Poprzedni krok ([)">← Krok</button>
<button class="rx-next" type="button" title="Następny krok (])">Krok →</button>
<button class="rx-reset" type="button" title="Od początku (R)">↺</button>
<label class="rx-scrub"><span class="rx-clock"></span><input type="range" min="0" max="${scene.duration}" step="0.1" value="0" aria-label="Czas animacji"></label>
<button class="rx-hide" type="button" title="Ukryj sterowanie (U)">Ukryj · U</button></div>`;
const q=s=>root.querySelector(s);
const el={code:q('.rx-code'),stage:q('.rx-stage'),metrics:q('.rx-metrics'),caption:q('.rx-caption'),back:q('.rx-back'),play:q('.rx-play'),next:q('.rx-next'),clock:q('.rx-clock'),slider:q('input'),toolbar:q('.rx-toolbar')};

el.slider.max=String(playbackDuration);
function paint(){
 const snapshot=engine.snapshot(Math.min(time,playbackDuration));
 el.code.textContent=scene.code;
 el.stage.innerHTML=renderScene(snapshot);
 el.caption.textContent=snapshot.caption;
 el.metrics.innerHTML=snapshot.metrics.map(m=>'<div class="rx-metric"><span>'+esc(m.label)+'</span><b>'+esc(m.value)+'</b></div>').join('');
 el.play.textContent=running?'Pauza':time>=playbackDuration?'Powtórz':time>0?'Kontynuuj':'Odtwórz';
 el.back.disabled=time<=0; el.next.disabled=time>=playbackDuration;
 el.clock.textContent=Math.min(time,playbackDuration).toFixed(1).replace('.',',')+' / '+playbackDuration.toFixed(1).replace('.',',')+' s';
 el.slider.value=String(Math.min(time,playbackDuration));
 el.slider.setAttribute('aria-valuetext',Math.min(time,playbackDuration).toFixed(1)+' sekund');
}
function pause(){
 running=false;previous=null;
 if(animationFrame!==null)cancelAnimationFrame(animationFrame);
 animationFrame=null;paint();
}
function seek(target){pause();stopAt=null;time=clamp(target,0,playbackDuration);paint();}
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
 if(time>=playbackDuration && scene.playback?.finish !== 'loop'){time=playbackDuration;pause();controls.onFinish?.();return;}
 if(time>=playbackDuration+2){time=0;}
 if(now-lastPaint>=33){paint();lastPaint=now;}
 animationFrame=requestAnimationFrame(frame);
}
q('.rx-hide').addEventListener('click',hideControls);
el.back.addEventListener('click',()=>controls.step?controls.step(-1):step(-1));
el.next.addEventListener('click',()=>controls.step?controls.step(1):step(1));
el.slider.addEventListener('input',()=>seek(Number(el.slider.value)));
el.play.addEventListener('click',()=>controls.toggle?controls.toggle():toggle());
q('.rx-reset').addEventListener('click',()=>controls.reset?controls.reset():restart());
// Pozwól przyciskom i suwakowi obsługiwać własne klawisze.
root.addEventListener('keydown',event=>{
 if(event.target.matches('input')||(['Enter',' '].includes(event.key)&&event.target.matches('button')))event.stopPropagation();
});
paint();
return {pause,play,playTo,playContinuously,toggle,step,reset:restart,restart,seek,finish:()=>seek(playbackDuration),get isPlaying(){return running;},get time(){return Math.min(time,playbackDuration);},get duration(){return playbackDuration;},get snapshot(){return engine.snapshot(time);},get stops(){return engine.stops;},get state(){return running?'playing':time>=playbackDuration?'finished':time===0?'ready':'paused';},hideControls,toggleControls};
}
