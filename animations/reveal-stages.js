// Adapter do klawiatury i fragmentów Reveal, bez własnego handlera strzałek.
export function installRevealStages(deck,{getController,isEnabled=()=>true}={}) {
  let controller,slide,unsubscribe,syncing=false,lastIndex;
  const bindings=[
    [39,'→','Następny etap / koniec bieżącego',c=>c.next()],
    [34,'Page Down','Następny etap / koniec bieżącego',c=>c.next()],
    [37,'←','Poprzedni stabilny kadr',c=>c.previous()],
    [33,'Page Up','Poprzedni stabilny kadr',c=>c.previous()],
    [32,'Spacja','Pauza / kontynuuj etap',c=>c.toggle()],
    [70,'F','Pokaż nieruchomy wynik',c=>c.finish()],
  ];
  function unbind(){bindings.forEach(([keyCode])=>deck.removeKeyBinding(keyCode));}
  function sync(force=false){
    if(!controller||!slide||deck.getCurrentSlide()!==slide)return;
    const state=controller.state,count=slide.querySelectorAll('.rx-step').length;
    const index=state.state==='finished'?count-1:Math.min(count-1,state.checkpointIndex-1);
    if(!force&&index===lastIndex)return;
    lastIndex=index;syncing=true;
    try{deck.navigateFragment(index);}finally{syncing=false;}
  }
  function refresh(){
    unsubscribe?.();unsubscribe=null;unbind();slide=deck.getCurrentSlide();
    controller=isEnabled()?getController(slide):null;lastIndex=undefined;
    if(!controller)return;
    unsubscribe=controller.subscribe(()=>sync());sync(true);
    if(deck.isOverview()||deck.isPaused())return;
    bindings.forEach(([keyCode,key,description,action])=>deck.addKeyBinding({keyCode,key,description},()=>{
      if(!deck.isOverview()&&!deck.isPaused())action(controller);
    }));
  }
  function fragment(event,direction){
    if(syncing||!controller||deck.isOverview()||deck.isPaused())return;
    const marker=event.fragment;
    if(!marker.closest('.rx-fragment-steps')||marker.closest('section')!==slide)return;
    if(direction>0)controller.next();else controller.previous();
    sync(true);
  }
  const shown=event=>fragment(event,1),hidden=event=>fragment(event,-1);
  deck.on('fragmentshown',shown);deck.on('fragmenthidden',hidden);
  const events=['slidechanged','overviewshown','overviewhidden','paused','resumed'];
  events.forEach(event=>deck.on(event,refresh));
  return {refresh,sync,get syncing(){return syncing;},destroy(){
    unsubscribe?.();unbind();deck.off?.('fragmentshown',shown);deck.off?.('fragmenthidden',hidden);
    events.forEach(event=>deck.off?.(event,refresh));
  }};
}
