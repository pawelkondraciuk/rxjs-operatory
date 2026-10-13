const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
async function modules(names,globals={}) {
 const context=vm.createContext(globals),cache=new Map(),result={};
 async function load(file) {
  const absolute=path.resolve(file);if(cache.has(absolute))return cache.get(absolute);
  const m=new vm.SourceTextModule(fs.readFileSync(absolute,'utf8'),{context,identifier:absolute});cache.set(absolute,m);
  await m.link((s,p)=>load(path.resolve(path.dirname(p.identifier),s)));return m;
 }
 for(const name of names){const m=await load('animations/'+name+'.js');await m.evaluate();result[name]=m.namespace;}
 return result;
}
const next=(at,value,execution)=>({at,value,...(execution?{execution}:{})});
const terminal=(at,kind='complete')=>({at,kind});
const values=frame=>Array.from(frame.histories[0].values,e=>e.value);
function scenario({cancelB=false,empty=false,noCatch=false,concat=false}={}) {
 const jobs=concat?[{id:'A',start:1,end:2.5},{id:'B',start:2.5,end:4},{id:'C',start:4,end:5.5}]:
  [{id:'A',start:1,end:1.4,kind:'unsubscribe'},{id:'B',start:1.4,end:cancelB?2:noCatch?2.7:3,kind:cancelB?'unsubscribe':noCatch?'error':'complete'},...(!noCatch?[{id:'C',start:4,end:5.5}]:[])];
 const input=concat?[next(1,'A'),next(1.4,'B'),next(1.8,'C')]:[next(1,'A'),next(1.4,'B'),...(!noCatch?[next(4,'C')]:[])];
 const nodes=[{id:'source',x:100,y:50,ready:true},{id:'op',x:500,y:50,ready:true},{id:'receiver',x:1050,y:50,ready:true}];
 const edges=[{id:'source-op',from:'source',to:'op',events:input,logicalStart:.1,logicalEnd:terminal(noCatch?2.7:5.5,noCatch?'unsubscribe':'complete')}],emitted=[];
 for(const job of jobs) {
  nodes.push({id:job.id,x:500,y:180,inner:true});
  const events=concat?[next(job.end-.3,job.id,job.id)]:job.id==='B'?(empty||noCatch?[]:[next(2.9,'fallback B','B')]):[next(job.id==='A'?2.3:5.3,job.id,job.id)];
  emitted.push(...events);
  edges.push({id:job.id+'-op',from:job.id,to:'op',events,logicalStart:job.start,logicalEnd:terminal(job.end,job.kind),gateWork:true,internal:true});
 }
 if(concat)for(const [id,at,start] of [['B',1.4,2.5],['C',1.8,4]])nodes.push({id:'queue-'+id,panel:'jobs',x:500,y:240,instant:true,workRow:true,label:id+' (wartość)',detail:'w kolejce',createdBy:{edge:'source-op',value:id},until:start});
 edges.push({id:'op-receiver',from:'op',to:'receiver',events:emitted.sort((a,b)=>a.at-b.at),logicalStart:.1,logicalEnd:terminal(noCatch?2.7:5.5,noCatch?'error':'complete')});
 const timeline=concat?[]:[{at:2.7,type:'http-error',execution:'B'},...(!noCatch?[{at:2.75,type:'catch-handle',execution:'B'},{at:2.75,type:'execution-focus',execution:'B'},...(!empty?[{at:2.9,type:'fallback-next',execution:'B',value:'fallback B'}]:[]),{at:3.2,type:'execution-focus',execution:null}]:[])];
 return {id:'model-v2',title:'Model v2',duration:7,rows:[],timing:{},metrics:[{label:'uruchomione',count:'started'},{label:'aktywne',count:'active'}],graph:{
  layout:'fixed',width:1240,height:340,nodes,edges,timeline,
  executions:jobs.map(j=>({id:j.id,node:j.id,edge:j.id+'-op',panel:'jobs',value:j.id,label:j.id+'$',duration:1.5})),
  trays:[{anchor:'receiver',x:1050,y:80,w:240}],panels:[{id:'jobs',x:300,y:110,w:600,h:229}],
 }};
}
async function playbackHarness({reducedMotion=false}={}) {
 const frames=new Map();let sequence=0,now=0;
 const m=await modules(['player','reveal-stages'],{
  document:{activeElement:null},matchMedia:()=>({matches:reducedMotion}),
  requestAnimationFrame:fn=>{frames.set(++sequence,fn);return sequence;},cancelAnimationFrame:id=>frames.delete(id),
 });
 const baseline={id:'playback-fixture',title:'Etapy',code:'',duration:6,rows:[],captions:[],graph:{nodes:[],edges:[],trays:[]},playback:{}};
 function create(options={}) {
  const scene=options.scene||{...baseline,playback:{...baseline.playback,controller:'stages',entry:'manual',finish:'loop',stops:[{id:'one',time:2},{id:'two',time:4}],...options.playback}};
  const elements=new Map(),root={isConnected:true,contains:()=>false,addEventListener(){},querySelector(s){
   if(!elements.has(s))elements.set(s,{hidden:true,listeners:{},setAttribute(){},addEventListener(type,fn){this.listeners[type]=fn;}});
   return elements.get(s);
  }};
  const player=m.player.createPlayer(root,scene,options.controls||{});
  return {player,controller:player.controller,root,elements};
 }
 function advance(milliseconds){
  const end=now+milliseconds;
  while(now<end){now=Math.min(now+50,end);const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));}
 }
 return {create,advance,frames,install:m['reveal-stages'].installRevealStages};
}
function revealMock(){
 const listeners=new Map(),bindings=new Map(),ordinary={querySelectorAll:()=>[]};
 const stage={markers:[],querySelectorAll(){return this.markers;}};
 stage.markers=Array.from({length:3},(_,index)=>({index,visible:false,closest(s){return s==='section'?stage:s==='.rx-fragment-steps'?stage.markers:null;}}));
 const deck={current:stage,overview:false,paused:false,navigation:[],fragmentIndex:-1,
  on(t,fn){if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(fn);},off(t,fn){listeners.get(t)?.delete(fn);},
  emit(t,e={}){[...(listeners.get(t)||[])].forEach(fn=>fn(e));},getCurrentSlide(){return this.current;},
  isOverview(){return this.overview;},isPaused(){return this.paused;},
  addKeyBinding(b,fn){bindings.set(b.keyCode,fn);},removeKeyBinding(k){bindings.delete(k);},
  navigateFragment(index){for(const marker of this.current.markers||[]){const visible=marker.index<=index;if(marker.visible!==visible){marker.visible=visible;this.emit(visible?'fragmentshown':'fragmenthidden',{fragment:marker});}}this.fragmentIndex=index;},
  press(k){const fn=bindings.get(k);if(fn)fn();else this.navigation.push('native:'+k);},
  show(s){this.current=s;this.emit('slidechanged',{currentSlide:s});},
 };
 return {deck,stage,ordinary,bindings};
}
module.exports={modules,next,terminal,values,scenario,playbackHarness,revealMock};
