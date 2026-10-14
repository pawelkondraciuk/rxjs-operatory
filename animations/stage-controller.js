// Jawne etapy dydaktyczne; jedyny zegar pozostaje w playerze.
export function createStageController(player,options={}) {
  const epsilon=1e-7;
  // Liczone na bieżąco: scena na żywo (player.live) zmienia długość po unsubscribe i przy przesuwaniu okna.
  const checkpoints=()=>[0,...player.stops.map(s=>s.time),player.duration]
    .filter((time,index,times)=>index===0||time>times[index-1]+epsilon);
  let mode=options.mode==='auto'?'auto':'manual',target=null,resumeIntent=false;
  const suspensions=new Set(),listeners=new Set();
  function nextCheckpoint(){return checkpoints().find(time=>time>player.time+epsilon)??player.duration;}
  function reachedIndex(){return checkpoints().findLastIndex(time=>time<=player.time+epsilon);}
  function state(){return {mode,state:player.state,time:player.time,target,checkpointIndex:reachedIndex(),checkpoints:checkpoints(),suspended:suspensions.size>0};}
  function changed(){
    if(player.isPlaying&&mode==='auto')target=nextCheckpoint();
    else if(target!==null&&player.time>=target-epsilon)target=null;
    const current=state();options.onChange?.(current);listeners.forEach(listener=>listener(current));
  }
  player.subscribe?.(changed);
  function cancelResume(){resumeIntent=false;}
  function start(){
    if(suspensions.size||player.state==='finished')return;
    target=nextCheckpoint();
    const lastQuestion=player.stops.at(-1)?.time??0;
    if(mode==='manual'&&player.time>=lastQuestion-epsilon)mode='auto';
    if(mode==='auto')player.playContinuously();else player.playTo(target);
    changed();
  }
  // Scena na żywo: READY → dalej: subscribe i emisje bez końca → dalej: unsubscribe → dalej: następny slajd.
  // Żaden checkpoint ani tryb AUTO nie wywołuje unsubscribe samoczynnie.
  function nextLive(live){
    if(live.state==='closed')player.finish(); // dokończ rozpoczęte unsubscribe
    else if(live.state==='running'){live.close();player.playContinuously();}
    else if(player.isPlaying){player.seek(live.start);player.playContinuously();} // dokończ subscribe, emisje trwają
    else player.playContinuously();
    target=null;changed();
  }
  function next(){
    cancelResume();if(suspensions.size)return;
    if(player.state==='finished'){options.onNavigate?.(1);return;}
    if(player.live){nextLive(player.live);return;}
    if(player.isPlaying){const end=target??nextCheckpoint();player.seek(end);target=null;changed();}else start();
  }
  function previous(){
    cancelResume();if(suspensions.size)return;
    const live=player.live;
    if(live&&live.state==='closed'){live.reopen();player.seek(live.start);player.playContinuously();target=null;changed();return;}
    if(player.time<=epsilon){options.onNavigate?.(-1);return;}
    if(live){live.reopen();player.seek(0);target=null;changed();return;}
    const previous=[...checkpoints()].reverse().find(time=>time<player.time-epsilon)??0;
    target=null;player.seek(previous);changed();
  }
  function toggle(){
    cancelResume();if(suspensions.size||player.state==='finished')return;
    if(player.isPlaying)player.pause();
    else if(player.live)player.playContinuously();
    else if(mode==='manual'&&target!==null&&target>player.time+epsilon)player.playTo(target);
    else start();changed();
  }
  function setMode(value){
    if(!['manual','auto'].includes(value)||value===mode)return;
    cancelResume();mode=value;
    if(player.live){if(value==='auto'&&!suspensions.size&&player.state!=='finished'&&!player.isPlaying)player.playContinuously();}
    else if(value==='manual'){target=null;player.seek(checkpoints()[Math.max(0,reachedIndex())]);}
    else if(!suspensions.size&&player.state!=='finished'){target=nextCheckpoint();player.playContinuously();}
    changed();
  }
  function seek(time){cancelResume();target=null;player.seek(time);changed();}
  function reset(){player.live?.reopen();seek(0);}
  function finish(){cancelResume();target=null;player.finish();changed();}
  function suspend(reason='external'){
    if(suspensions.has(reason))return;
    if(!suspensions.size)resumeIntent=player.isPlaying;
    suspensions.add(reason);player.pause();changed();
  }
  function resume(reason='external'){
    if(!suspensions.delete(reason)||suspensions.size)return;
    const shouldResume=resumeIntent;resumeIntent=false;
    if(shouldResume&&player.state!=='finished'){
      if(player.live)player.playContinuously();
      else if(mode==='manual'&&target!==null&&target>player.time+epsilon)player.playTo(target);else start();
    }
    changed();
  }
  return {next,previous,toggle,setMode,reset,finish,seek,suspend,resume,
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    get mode(){return mode;},get state(){return state();}};
}
