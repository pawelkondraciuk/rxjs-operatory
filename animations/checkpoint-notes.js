// Reveal Notes odczytuje aside.notes bieżącego fragmentu. Kontroler stages już
// synchronizuje fragmenty z checkpointami, również w AUTO i po seek/reset.
// Szablon dotyczy końcowego ID wariantu; pozostałe warianty zachowują swoje notes.
export function prepareCheckpointNotes(slide,{printMode=false}={}) {
  const template=slide.querySelector(`template[data-checkpoint-notes="${slide.id}"]`);
  if(!template)return false;
  const notes=new Map([...template.content.querySelectorAll('[data-checkpoint]')]
    .map(note=>[note.dataset.checkpoint,note.innerHTML]));
  const noteFor=id=>{
    if(!notes.has(id))throw new Error(`${slide.id}: brak notatki checkpointu ${id}`);
    return notes.get(id);
  };
  slide.querySelector('aside.notes').innerHTML=noteFor(printMode?'finished':'ready');
  for(const marker of slide.querySelectorAll('.rx-step')) {
    const id=marker.dataset.handoff==='true'?'finished':marker.dataset.stop;
    const note=slide.ownerDocument.createElement('aside');
    note.className='notes';
    note.innerHTML=noteFor(id);
    marker.append(note);
  }
  return true;
}

// Podgląd Notes dostaje setState przez postMessage. Jego fragmenty nie są
// kliknięciami pilota: seek odtwarza kadr, bez startu animacji i zwrotnego cofania
// głównej prezentacji. Opt-in: tylko wariant z szablonem notatek checkpointów.
export function installCheckpointNotesReceiver(deck,stages,{getPlayer,view=window}={}) {
  const receiver=['current-slide','upcoming-slide'].includes(view.frameElement?.parentElement?.id);
  if(!receiver&&view.parent!==view)return;
  const connected=new WeakSet();
  view.addEventListener('message',event=>{
    if(event.origin!==view.location.origin)return;
    try{
      if(receiver?event.source!==view.parent:event.source?.opener!==view)return;
    }catch{return;}
    let data;
    try{data=typeof event.data==='string'?JSON.parse(event.data):event.data;}catch{return;}
    if(!receiver&&data?.namespace==='reveal-notes'&&data.type==='connected')connected.add(event.source);
    const state=data?.method==='setState'?data.args?.[0]:null;
    if(!state||!Number.isInteger(state.indexh))return;
    const slide=deck.getSlide(state.indexh,state.indexv||0);
    if(!slide?.querySelector(`template[data-checkpoint-notes="${slide.id}"]`))return;
    event.stopImmediatePropagation();
    // Iframe startuje bez fragmentu i przed handshake wysyła indexf:-1.
    // To inicjalizacja podglądu, nie polecenie cofnięcia głównej prezentacji.
    if(!receiver&&!connected.has(event.source))return;
    stages.restore(()=>{
      deck.setState(state);
      const player=getPlayer(slide),marker=slide.querySelectorAll('.rx-step')[state.indexf];
      if(player?.controller)player.controller.seek(marker?.dataset.handoff==='true'?player.duration:Number(marker?.dataset.time||0));
    });
  },true);
}
