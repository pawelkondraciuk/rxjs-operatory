const {test}=require('node:test'),assert=require('node:assert/strict');
const {playbackHarness:harness,revealMock}=require('./v2-harness.cjs');
test('rapid next ends a manual stage; last question hands off to AUTO and holds FINISHED',async()=>{
 const h=await harness(),{player,controller}=h.create();assert.equal(controller.mode,'manual');
 controller.next();assert.equal(player.state,'playing');assert.equal(h.frames.size,1);
 h.advance(550);assert.ok(player.time>0&&player.time<2);controller.next();
 assert.equal(player.time,2);assert.equal(player.state,'paused');assert.equal(h.frames.size,0);
 controller.next();controller.next();assert.equal(player.time,4);assert.equal(player.state,'paused');
 controller.next();assert.equal(controller.mode,'auto');assert.equal(player.time,4);
 h.advance(50000);assert.equal(player.state,'finished');assert.equal(h.frames.size,0);controller.toggle();assert.equal(player.state,'finished');
});
test('AUTO next ends the current teaching stage, while M preserves time or restores a checkpoint',async()=>{
 const h=await harness(),{player,controller}=h.create();controller.next();h.advance(550);const midway=player.time;
 controller.setMode('auto');assert.equal(player.time,midway);assert.equal(controller.mode,'auto');
 controller.next();assert.equal(player.time,2);assert.equal(player.state,'paused');assert.equal(h.frames.size,0);
 controller.toggle();h.advance(600);assert.ok(player.time>2&&player.time<4);
 controller.setMode('manual');assert.equal(player.time,2);assert.equal(player.state,'paused');controller.previous();assert.equal(player.time,0);
});
test('space resumes the same stage; previous, R and F cancel every RAF',async()=>{
 const h=await harness(),{player,controller}=h.create();controller.toggle();h.advance(700);controller.toggle();
 const midway=player.time,snapshot=JSON.stringify(player.snapshot);h.advance(2000);assert.equal(player.time,midway);assert.equal(JSON.stringify(player.snapshot),snapshot);
 controller.toggle();h.advance(2000);assert.equal(player.time,2);assert.equal(player.state,'paused');
 controller.next();h.advance(500);controller.previous();assert.equal(player.time,2);assert.equal(h.frames.size,0);
 controller.setMode('auto');controller.reset();assert.equal(controller.mode,'auto');assert.equal(player.state,'ready');assert.equal(h.frames.size,0);
 controller.next();controller.finish();assert.equal(player.state,'finished');assert.equal(h.frames.size,0);controller.reset();assert.equal(player.state,'ready');
});
test('suspension restores only active playback; manual pause and FINISHED persist and detached DOM stops',async()=>{
 const h=await harness(),{player,controller,root}=h.create();controller.next();h.advance(450);
 controller.suspend('overview');controller.suspend('visibility');h.advance(3000);
 controller.resume('overview');assert.equal(player.isPlaying,false);assert.equal(h.frames.size,0);
 controller.resume('visibility');assert.equal(player.isPlaying,true);assert.equal(h.frames.size,1);
 controller.toggle();controller.suspend('slide');controller.resume('slide');assert.equal(player.isPlaying,false);
 controller.finish();controller.suspend('overview');controller.resume('overview');assert.equal(player.state,'finished');
 controller.reset();controller.next();root.isConnected=false;h.advance(50);assert.equal(player.isPlaying,false);assert.equal(h.frames.size,0);
});
test('playback, direct seek, backward seek and restart yield identical stable snapshots',async()=>{
 const h=await harness(),first=h.create(),direct=h.create();first.controller.next();h.advance(3000);direct.controller.seek(2);
 assert.equal(JSON.stringify(first.player.snapshot),JSON.stringify(direct.player.snapshot));
 first.controller.finish();first.controller.previous();first.controller.seek(2);assert.equal(JSON.stringify(first.player.snapshot),JSON.stringify(direct.player.snapshot));
 first.controller.reset();first.controller.next();h.advance(3000);assert.equal(JSON.stringify(first.player.snapshot),JSON.stringify(direct.player.snapshot));
});
test('toolbar actions use the shared controller, including READY/FINISHED navigation boundaries',async()=>{
 const h=await harness(),navigation=[],{player,controller,elements}=h.create({controls:{stageOptions:{onNavigate:d=>navigation.push(d)}}});
 elements.get('.rx-back').listeners.click();assert.deepEqual(navigation,[-1]);
 elements.get('.rx-next').listeners.click();elements.get('.rx-next').listeners.click();assert.equal(player.time,2);
 elements.get('.rx-play').listeners.click();assert.equal(player.isPlaying,true);
 elements.get('.rx-reset').listeners.click();assert.equal(player.state,'ready');assert.equal(h.frames.size,0);
 elements.get('.rx-finish').listeners.click();assert.equal(player.state,'finished');assert.equal(elements.get('.rx-play').disabled,true);assert.equal(elements.get('.rx-next').disabled,false);
 elements.get('.rx-next').listeners.click();assert.deepEqual(navigation,[-1,1]);assert.equal(controller.mode,'manual');
});
test('Reveal keys and fragments share stages in both modes and restore native navigation on ordinary slides',async()=>{
 const h=await harness(),{deck,stage,ordinary,bindings}=revealMock(),{player,controller}=h.create({controls:{stageOptions:{onNavigate:d=>deck.navigation.push(d)}}});
 const adapter=h.install(deck,{getController:s=>s===stage?controller:null});adapter.refresh();assert.equal(bindings.has(36),false);
 deck.press(39);h.advance(500);deck.press(34);assert.equal(player.time,2);assert.equal(deck.fragmentIndex,0);
 controller.setMode('auto');deck.press(39);assert.equal(player.time,4);assert.equal(player.state,'paused');
 deck.navigateFragment(2);assert.equal(player.isPlaying,true);deck.press(39);assert.equal(player.state,'finished');assert.equal(deck.fragmentIndex,2);
 deck.press(39);assert.deepEqual(deck.navigation,[1]);deck.press(37);assert.equal(player.time,4);assert.equal(h.frames.size,0);
 deck.press(70);assert.equal(player.state,'finished');
 controller.seek(1);deck.current=ordinary;deck.fragmentIndex=-1;controller.finish();assert.equal(deck.fragmentIndex,-1);
 controller.suspend('slide');deck.show(ordinary);assert.equal(bindings.size,0);deck.press(39);assert.deepEqual(deck.navigation,[1,'native:39']);
 deck.show(stage);controller.resume('slide');assert.equal(player.state,'finished');assert.equal(deck.fragmentIndex,2);adapter.destroy();assert.equal(bindings.size,0);
});
test('overview and Reveal pause preserve manual pause; fragment synchronization never starts a second RAF',async()=>{
 const h=await harness(),{deck,stage,bindings}=revealMock(),{player,controller}=h.create(),adapter=h.install(deck,{getController:s=>s===stage?controller:null});adapter.refresh();
 deck.press(32);h.advance(500);deck.press(32);const midway=player.time;
 deck.overview=true;controller.suspend('overview');deck.emit('overviewshown');assert.equal(bindings.size,0);
 deck.overview=false;controller.resume('overview');deck.emit('overviewhidden');assert.equal(player.time,midway);assert.equal(player.isPlaying,false);
 deck.paused=true;controller.suspend('paused');deck.emit('paused');assert.equal(bindings.size,0);
 deck.paused=false;controller.resume('paused');deck.emit('resumed');assert.equal(player.isPlaying,false);deck.press(32);assert.equal(player.isPlaying,true);
 deck.navigateFragment(0);assert.equal(player.time,2);assert.equal(player.isPlaying,false);
 deck.navigateFragment(-1);assert.equal(player.time,0);assert.equal(h.frames.size,0);adapter.destroy();
});
test('reduced motion retains READY, stage times and checkpoint progression',async()=>{
 const normal=await harness(),reduced=await harness({reducedMotion:true}),a=normal.create(),b=reduced.create();
 a.controller.next();b.controller.next();normal.advance(1000);reduced.advance(1000);assert.equal(a.player.time,b.player.time);assert.equal(a.controller.state.target,b.controller.state.target);
 normal.advance(3000);reduced.advance(3000);assert.equal(a.player.time,2);assert.equal(b.player.time,2);assert.equal(a.player.isPlaying,false);assert.equal(b.player.isPlaying,false);
});
test('Space pauses legacy AUTO without replacing native arrows and keeps FINISHED frozen',async()=>{
 const h=await harness(),{deck,stage,ordinary,bindings}=revealMock();
 const {player}=h.create({playback:{controller:undefined,entry:'auto',finish:'hold'}});
 const adapter=h.install(deck,{getController:()=>null,getPlayer:s=>s===stage?player:null});adapter.refresh();
 assert.deepEqual([...bindings.keys()],[32]);player.play();h.advance(500);deck.press(32);
 const paused=player.time;assert.equal(player.isPlaying,false);assert.equal(h.frames.size,0);
 h.advance(1000);assert.equal(player.time,paused);deck.press(32);assert.equal(player.isPlaying,true);
 player.finish();deck.press(32);assert.equal(player.state,'finished');assert.equal(h.frames.size,0);
 deck.press(39);assert.deepEqual(deck.navigation,['native:39']);
 deck.show(ordinary);assert.equal(bindings.size,0);deck.press(32);assert.equal(deck.navigation.at(-1),'native:32');adapter.destroy();
});
test('Space on a legacy MANUAL scene resumes its target, then delegates the next checkpoint to Reveal',async()=>{
 const h=await harness(),{deck,stage,bindings}=revealMock();
 const {player}=h.create({playback:{controller:undefined,entry:'manual',finish:'hold'}});
 let target=0,steps=0;deck.next=()=>{steps++;target+=2;player.playTo(target);};
 const adapter=h.install(deck,{getController:()=>null,getPlayer:()=>player,getManualTarget:()=>target});adapter.refresh();
 deck.press(32);assert.equal(steps,1);h.advance(500);deck.press(32);
 assert.ok(player.time>0&&player.time<2);assert.equal(player.isPlaying,false);
 deck.press(32);assert.equal(steps,1);h.advance(3000);
 assert.equal(player.time,2);assert.equal(player.isPlaying,false);assert.equal(h.frames.size,0);
 deck.press(32);assert.equal(steps,2);assert.equal(player.isPlaying,true);h.advance(3000);
 assert.equal(player.time,4);assert.equal(bindings.size,1);adapter.destroy();
});
test('Space binding follows stage/legacy transitions and is absent in overview, pause and print',async()=>{
 const h=await harness(),{deck,stage,ordinary,bindings}=revealMock(),staged=h.create();
 const legacy=h.create({playback:{controller:undefined,entry:'auto',finish:'hold'}});
 let enabled=true;
 const adapter=h.install(deck,{getController:s=>s===stage?staged.controller:null,getPlayer:s=>s===ordinary?legacy.player:null,isEnabled:()=>enabled});
 adapter.refresh();assert.equal(bindings.has(39),true);deck.press(32);assert.equal(staged.player.isPlaying,true);
 staged.controller.suspend('slide');deck.show(ordinary);assert.deepEqual([...bindings.keys()],[32]);
 deck.press(32);assert.equal(legacy.player.isPlaying,true);legacy.player.pause();
 for(const [flag,shown,hidden] of [['overview','overviewshown','overviewhidden'],['paused','paused','resumed']]){
  deck[flag]=true;deck.emit(shown);assert.equal(bindings.size,0);
  deck[flag]=false;deck.emit(hidden);assert.deepEqual([...bindings.keys()],[32]);assert.equal(legacy.player.isPlaying,false);
 }
 enabled=false;adapter.refresh();assert.equal(bindings.size,0);deck.show(stage);assert.equal(bindings.size,0);
 enabled=true;adapter.refresh();assert.equal(bindings.has(39),true);adapter.destroy();assert.equal(bindings.size,0);
});
