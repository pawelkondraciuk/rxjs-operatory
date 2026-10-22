// Jedna stała lista na cały slajd, także w druku. Wariant wybieramy po klonowaniu
// sekcji; fragmenty sterują wyłącznie animacją i nigdy nie zawierają aside.notes.
export function prepareSlideNotes(slide) {
  const template=slide.querySelector(`template[data-slide-notes="${slide.id}"]`);
  if(!template)return false;
  slide.querySelector('aside.notes').innerHTML=template.innerHTML;
  return true;
}

// Ramka podglądu w standardowym oknie Notes (current-slide / upcoming-slide).
export function isNotesPreview(view=window) {
  try{return ['current-slide','upcoming-slide'].includes(view.frameElement?.parentElement?.id);}catch{return false;}
}

// Podgląd Notes dostaje setState przez postMessage. Jego fragmenty nie są
// kliknięciami pilota: seek odtwarza kadr, bez startu animacji i zwrotnego cofania
// głównej prezentacji. Dotyczy scen z markerami etapów, niezależnie od notatek.
// Główne okno ignoruje setState z okna Notes: podgląd tylko odzwierciedla główną prezentację,
// a jego własne zmiany fragmentów (debounce 500 ms w pluginie) cofałyby albo przeskakiwały animację.
// Sterowanie z okna Notes idzie klawiszami (installNotesKeyBridge), jak z pilota.
export function installCheckpointNotesReceiver(deck,stages,{getPlayer,view=window}={}) {
  const receiver=isNotesPreview(view);
  if(!receiver&&view.parent!==view)return;
  view.addEventListener('message',event=>{
    if(event.origin!==view.location.origin)return;
    try{
      if(receiver?event.source!==view.parent:event.source?.opener!==view)return;
    }catch{return;}
    let data;
    try{data=typeof event.data==='string'?JSON.parse(event.data):event.data;}catch{return;}
    const state=data?.method==='setState'?data.args?.[0]:null;
    if(!state||!Number.isInteger(state.indexh))return;
    if(!receiver){event.stopImmediatePropagation();return;}
    const slide=deck.getSlide(state.indexh,state.indexv||0);
    if(!slide?.querySelector('.rx-fragment-steps'))return;
    event.stopImmediatePropagation();
    stages.restore(()=>{
      deck.setState(state);
      const player=getPlayer(slide),marker=slide.querySelectorAll('.rx-step')[state.indexf];
      const handoff=marker?.dataset.handoff==='true',time=Number(marker?.dataset.time||0);
      // seekCheckpoint odtwarza też etap sceny na żywo z akcjami (Subject + interval).
      if(player?.controller?.seekCheckpoint)player.controller.seekCheckpoint(time,handoff);
      else if(player?.controller)player.controller.seek(handoff?player.duration:time);
    });
  },true);
}

// Kadr ramki podglądu Notes, bez odtwarzania: checkpoint ostatniego widocznego znacznika rx-step (handoff — wynik),
// bez widocznego znacznika — READY; scena bez postojów pokazuje wynik (statyczna zostaje bez zmian).
export function showNotesPreviewFrame(slide,player,{still=false}={}) {
  if(!player)return;
  if(player.stillTime!==undefined){player.finish();return;}
  const markers=[...slide.querySelectorAll('.rx-step')],marker=markers[slide.querySelectorAll('.rx-step.visible').length-1];
  const handoff=marker?.dataset.handoff==='true',time=Number(marker?.dataset.time||0);
  if(player.controller){if(marker)player.controller.seekCheckpoint(time,handoff);else player.controller.reset();}
  else if(markers.length)player.seek(handoff?player.duration:time);
  else if(!still)player.finish();
}

// Lustro kadru dla ramki current-slide okna Notes: główne okno po każdym odmalowaniu odtwarzacza udostępnia gotowy
// kadr (kod, diagram, podpis, liczniki), a ramka kopiuje go do swojego odtwarzacza tego samego slajdu. Animacja
// w podglądzie jest więc identyczna z główną, bez drugiego silnika, RAF i zwrotnych komend. Ramka upcoming zostaje
// przy nieruchomym kadrze (showNotesPreviewFrame).
const mirroredParts=['.rx-code','.rx-stage','.rx-caption','.rx-metrics'];
export function installNotesMirror(deck,{view=window,getRoot=slide=>slide?.querySelector('.rx-player')}={}) {
  if(!isNotesPreview(view)) {
    if(view.parent!==view)return {notify(){}};
    const listeners=new Set();
    view.rxNotesMirror={
      subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
      current(){const slide=deck.getCurrentSlide();return slide?{id:slide.id,root:getRoot(slide)}:null;},
    };
    return {notify(slide){
      if(!listeners.size||slide!==deck.getCurrentSlide())return;
      const root=getRoot(slide);
      for(const listener of [...listeners]){try{listener(slide.id,root);}catch{listeners.delete(listener);}}
    }};
  }
  if(view.frameElement.parentElement.id!=='current-slide')return {pull:()=>false};
  let source=null;
  try{source=view.parent.opener?.rxNotesMirror||null;}catch{}
  const last=new Map();
  function copy(id,mainRoot) {
    const slide=deck.getCurrentSlide(),root=getRoot(slide);
    if(!root||!mainRoot||slide.id!==id)return false;
    for(const selector of mirroredParts) {
      const from=mainRoot.querySelector(selector),to=root.querySelector(selector);
      if(!from||!to)continue;
      const html=from.innerHTML;
      if(last.get(to)!==html){to.innerHTML=html;last.set(to,html);}
    }
    return true;
  }
  const unsubscribe=source?.subscribe(copy);
  view.addEventListener('pagehide',()=>unsubscribe?.());
  // Na zmianę slajdu/fragmentu w ramce: kadr głównego okna, o ile pokazuje ten sam slajd.
  // Ramka mogła odmalować własny kadr, więc pull kopiuje bez porównania z poprzednią kopią.
  return {pull(){const current=source?.current?.();last.clear();return current?copy(current.id,current.root):false;}};
}

// Klawisze naciśnięte w oknie Notes (przekazywane przez plugin do ramki current-slide jako triggerKey albo
// wciśnięte z fokusem w ramce) trafiają do głównego okna i działają jak pilot; ramka sama nie nawiguje.
// W głównym oknie przyjmujemy je wyłącznie od ramki podglądu okna Notes otwartego z tej prezentacji.
const forwardedKeys=new Set([32,33,34,35,36,37,38,39,40,65,70,72,74,75,76,77,78,80,82,85,219,221]);
export function installNotesKeyBridge(deck,view=window) {
  if(isNotesPreview(view)) {
    if(view.frameElement.parentElement.id!=='current-slide')return;
    const forward=keyCode=>{try{view.parent.opener?.postMessage(JSON.stringify({namespace:'rx-notes',type:'key',keyCode}),view.location.origin);}catch{}};
    view.addEventListener('message',event=>{
      if(event.source!==view.parent||event.origin!==view.location.origin)return;
      let data;
      try{data=typeof event.data==='string'?JSON.parse(event.data):event.data;}catch{return;}
      if(data?.method!=='triggerKey')return;
      event.stopImmediatePropagation();
      if(forwardedKeys.has(data.args?.[0]))forward(data.args[0]);
    },true);
    view.document.addEventListener('keydown',event=>{
      if(event.ctrlKey||event.metaKey||event.altKey)return;
      event.preventDefault();event.stopImmediatePropagation();
      if(forwardedKeys.has(event.keyCode))forward(event.keyCode);
    },true);
    return;
  }
  if(view.parent!==view)return;
  view.addEventListener('message',event=>{
    if(event.origin!==view.location.origin)return;
    try{if(event.source?.parent?.opener!==view||!isNotesPreview(event.source))return;}catch{return;}
    let data;
    try{data=typeof event.data==='string'?JSON.parse(event.data):event.data;}catch{return;}
    if(data?.namespace==='rx-notes'&&data.type==='key'&&forwardedKeys.has(data.keyCode))deck.triggerKey(data.keyCode);
  });
}
