const test=require('node:test');
const assert=require('node:assert/strict');
const {playbackHarness}=require('./v2-harness.cjs');

async function create(){
 const h=await playbackHarness();
 const {player}=h.create({playback:{controller:undefined,entry:'manual',finish:'hold'}});
 return {...h,player};
}
test('skipping an active manual step lands on its checkpoint and cancels every RAF',async()=>{
 const h=await create();h.player.playTo(2);h.advance(500);
 assert.ok(h.player.time>0&&h.player.time<2);
 assert.equal(h.player.finishStep(),true);
 assert.equal(h.player.time,2);assert.equal(h.player.isPlaying,false);assert.equal(h.frames.size,0);
 const skipped=JSON.stringify(h.player.snapshot);h.player.seek(2);assert.equal(JSON.stringify(h.player.snapshot),skipped);
 h.advance(5000);assert.equal(h.player.time,2);
});
test('one extra forward finishes a paused step; the following forward can start the next step',async()=>{
 const h=await create();h.player.playTo(2);h.advance(400);h.player.pause();
 assert.equal(h.player.finishStep(),true);assert.equal(h.player.time,2);
 assert.equal(h.player.finishStep(),false);h.player.playTo(4);
 assert.equal(h.player.isPlaying,true);assert.equal(h.player.finishStep(),true);
 assert.equal(h.player.time,4);assert.equal(h.frames.size,0);
});
test('natural stops, reset, reversing and switching to AUTO do not retain stale manual targets',async()=>{
 const h=await create();h.player.playTo(2);h.advance(3000);
 assert.equal(h.player.time,2);assert.equal(h.player.finishStep(),false);
 h.player.playTo(4);h.player.seek(0);assert.equal(h.player.finishStep(),false);
 h.player.playTo(2);h.player.reset();assert.equal(h.player.finishStep(),false);h.player.pause();
 h.player.playTo(2);h.player.playContinuously();assert.equal(h.player.finishStep(),false);
 h.player.finish();assert.equal(h.player.state,'finished');assert.equal(h.frames.size,0);
});
