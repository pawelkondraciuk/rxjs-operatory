// Rysowanie pochodzi z dostarczonego player.js; cykl życia obsługuje Reveal.js.
import { renderOperator } from './operator.js';
import { palette, terminal, connectionState, transitionDuration, layoutDiagram } from './lifecycle.js';
import { fadeDuration, planFlow } from './flow.js';
export function createPlayer(root, scene) {
const colors={a:"#ffc15c",b:"#72d8a2",c:"#83cafa",source:palette.source,op:"#e7b5f1",http:palette.observer,muted:"#e7ecef",error:"#f3a3a3"};
const ink="#16232b";
const esc=value=>String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let time=0, running=false, previous=null, lastPaint=-Infinity, animationFrame=null;
let flowPlan, playbackDuration=scene.duration, modelTime=0;
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
function text(x,y,value,size=24,attrs=""){return '<text x="'+x+'" y="'+y+'" font-size="'+size+'" dominant-baseline="middle" '+attrs+'>'+esc(value)+'</text>';}
function wrapLabel(value,max=19){
 const words=String(value).split(" "),lines=[];let current="";
 words.forEach(word=>{if((current+" "+word).trim().length>max&&current){lines.push(current);current=word;}else current=(current+" "+word).trim();});
 if(current)lines.push(current);return lines;
}
function getCaption(s,t){let caption="";for(const item of s.captions)if(item[0]<=t)caption=item[1];return caption;}
function rowStatus(row,t){
 const active=row.spans.filter(span=>span.start<=t&&span.end>t);
 if(active.some(span=>span.kind==="queue"))return "w kolejce";
 if(active.some(span=>span.kind==="subscription"))return "subskrypcja";
 if(active.some(span=>span.kind==="state"))return "aktualny stan";
 if(active.some(span=>span.kind==="window"))return "okno otwarte";
 if(active.length)return "praca trwa";
 const last=row.spans.filter(span=>span.end<=t).slice(-1)[0];
 if(last&&last.kind==="cancel")return "odsubskrybowano";
 if(last&&last.kind==="error")return "błąd";
 if(row.completeAt!==undefined&&t>=row.completeAt)return "complete";
 return "";
}
function renderCards(s,t){
 const width=1100,height=430,gap=24,boxW=470,boxH=118;
 let out='<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+esc(s.title)+'">';
 s.items.forEach((item,i)=>{
  const x=68+(i%2)*(boxW+gap),y=64+Math.floor(i/2)*(boxH+gap);
  const opacity=clamp((t-item.at)/.6,0,1);
  const scale=.94+.06*opacity;
  out+='<g opacity="'+opacity.toFixed(3)+'" transform="translate('+x+','+y+') translate('+boxW/2+','+boxH/2+') scale('+scale.toFixed(3)+') translate('+(-boxW/2)+','+(-boxH/2)+')"><rect width="'+boxW+'" height="'+boxH+'" rx="3" fill="'+colors[item.color]+'"/>';
  const lines=wrapLabel(item.label,25);
  lines.forEach((line,j)=>out+=text(boxW/2,boxH/2+(j-(lines.length-1)/2)*36,line,30,'text-anchor="middle"'));
  out+='</g>';
 });
 return out+'</svg>';
}
function renderTimeline(s,t){
 if((s.rendererId||s.id)==="04-operator")return renderOperator(s,t);
 const elapsed=t;
 if(flowPlan)t=flowPlan.logicalTime(elapsed);
 const W=1240,H=(s.rendererId||s.id)==='13-limit'?520:460,nodes=[],edges=[],trays=[];
 const row=i=>s.rows[i]||{events:[],spans:[],label:""};
 const values=i=>row(i).events.filter(e=>e.kind!=="ignored"&&e.kind!=="error"&&!/^(sub|subscribe|utwórz|A\+|B\+|[+−]$)/i.test(String(e.value)));
 const node=(id,x,y,label,color="op",ri=null,extra={})=>{const n={id,x,y,w:190,h:70,label,color,ri,...extra};nodes.push(n);return n;};
 const edge=(a,b,events=[],extra={})=>edges.push({a,b,events,...extra});
 const tray=(ri,x,y,w=400,label="")=>trays.push({ri,x,y,w,label});
 const output=(id,x,y,ri,w=300,label="Odbiorca")=>{const n=node(id,x,y,label,"http",ri,{w:190,output:true});tray(ri,x+w/2-95,y+115,w);return n;};
 const empty={events:[],spans:[]};
 const caseId=s.rendererId||s.id;
 if(s.jobs||caseId==="08-map-strumienie"){
  const source=node("source",90,292,"source$","source",0,{w:160,detail:s.outerCompleteAt!==undefined&&t>=s.outerCompleteAt?"complete":undefined});
  const op=node("op",535,292,s.jobs?(s.operatorName||s.title.split(" —")[0]):"concatAll()","op",null,{w:230});
  edge(source,op,row(0).events);
  if(!s.jobs){
   const projection=node("projection",292,292,"map → A$, B$","op",1,{w:195});
   edges.pop();edge(source,projection,row(0).events);edge(projection,op,row(1).events);
  }
  const indices=s.jobs?s.jobs.map((_,i)=>i+1):[2,3];
  indices.forEach((ri,i)=>{
   const x=indices.length===2?430+i*220:325+i*235;
   const job=s.jobs?s.jobs[i]:null;
   const birth=job?job.at:row(0).events[i].at;
   if(job&&job.ignored){
    if(t>=job.at&&t<job.at+2)node("ignored"+i,x,100,job.value+" · pominięte","muted",null,{w:220,detail:"inner nie powstaje"});
    return;
   }
   const queuedProjection=job&&t<job.start;
   const label=queuedProjection?job.value+" · kolejka":row(ri).label.replace(" · subskrypcja","");
   const inner=node("inner"+i,x,100,label,queuedProjection?"muted":["a","b","c"][i],ri,{w:190,inner:true,born:birth});
   edge(inner,op,values(ri),{workRow:ri,gateWork:true});
  });
  const last=s.rows.length-1;
  const sink=output("observer",535,450,last,760);
  if(s.outerCompleteAt!==undefined&&t>=s.outerCompleteAt&&row(last).completeAt>t)sink.detail="czeka na inner";
  trays[0].x=550;
  edge(op,sink,values(last));
 }else if(s.diagram==="async"||caseId==="07-hot-cold"||s.diagram==="coldhot"){
  const shared=s.comparisonMode==="shared",coldhot=s.diagram==="coldhot",angular=s.diagram==="async";
  const source=node("observable",550,70,coldhot?(shared?"jeden producent":"timer$"):(angular?"jeden user$":"jeden data$"),"source",null,{w:300});
  source.label=coldhot?(shared?"jeden producent":"timer$"):source.label;
  const jobs=[];
  [0,1].forEach(j=>{
   if(shared&&j===1)return;
   const x=shared?550:j?825:275,ri=j;
   const birth=coldhot?(j?6:0):j?(angular?1:3):1;
   jobs.push(node("work"+j,x,235,coldhot?(shared?"wspólny timer":"timer "+["A","B"][j]):shared?"wspólne HTTP":"HTTP "+["A","B"][j],shared?"http":j?"b":"a",ri,{w:230,work:true,born:birth}));
   edge(source,jobs[j],[],{born:birth});
  });
  const hub=shared?node("hub",550,370,coldhot?"Subject":"share()","op",null,{w:240}):null;
  if(hub&&jobs[0])edge(jobs[0],hub,values(0));
  [2,3].forEach((ri,j)=>{
   const x=j?825:275,start=coldhot?(j?6:0):j?(angular?1:3):1;
   const sink=node("receiver"+j,x,510,angular?["imię | async","avatar | async"][j]:"Odbiorca "+["A","B"][j],j?"b":"a",ri,{w:250,born:start});
   const target=shared?hub:jobs[j];
   edge(target,sink,values(ri),{born:start});
   const targetX=target.x+(j?target.w/2:-target.w/2);
   const side=j?1015:85;
   edge(sink,target,[{at:start,value:"sub",color:j?"b":"a"}],{dashed:true,born:start,label:"subscribe",points:[[x+(j?125:-125),510],[side,510],[side,target.y],[targetX,target.y]]});
   tray(ri,x,615,420,"");
  });
 }else if(s.diagram==="late"){
  const replay=s.comparisonMode==="shared";
  const src=node("observable",550,65,"HTTP Observable","source",null,{w:300});
  const first=node("http1",300,235,"HTTP #1","http",0,{w:240,work:true,born:1});
  edge(src,first,[],{born:1});
  let second=null;
  if(!replay){second=node("http2",800,235,"HTTP #2","http",1,{w:240,work:true,born:10});edge(src,second,[],{born:10});}
  const hub=node("hub",550,385,replay?"shareReplay(1)":"share()","op",null,{w:285,detail:replay&&t>=6?"bufor: dane":t>=6&&t<10?"brak bufora":undefined});
  edge(first,hub,values(0));
  if(second)edge(second,hub,values(1));
  [2,3].forEach((ri,j)=>{
   const start=j?10:1,x=j?850:250;
   const sink=node("receiver"+j,x,510,"Widok "+["A","B"][j],j?"b":"a",ri,{w:230,born:start,disabled:!j&&t>=8,detail:!j&&t>=8?"widok zniknął":undefined});
   edge(hub,sink,values(ri),{born:start,disabled:!j&&t>=8});
   edge(sink,hub,[{at:start,value:"sub",color:j?"b":"a"}],{born:start,dashed:true,until:j?16:8,label:j?"B dołącza":"subscribe",points:[[x+(j?115:-115),510],[j?1040:60,510],[j?1040:60,385],[550+(j?142:-142),385]]});
   tray(ri,x,615,410,"");
  });
 }else if(s.diagram==="expensive"){
  const shared=s.comparisonMode==="shared";
  const source=node("source",550,75,"Subject.next","source",0,{w:280});
  const maps=[];
  [0,1].forEach(j=>{
   if(shared&&j)return;
   const n=node("map"+j,shared?550:j?825:275,240,"map(expensive)","op",j+1,{w:280,work:true});
   maps.push(n);edge(source,n,values(0));
  });
  const hub=shared?node("hub",550,385,"share()","op",null,{w:220}):null;
  if(hub)edge(maps[0],hub,values(1));
  [3,4].forEach((ri,j)=>{
   const sink=node("receiver"+j,j?825:275,515,"Odbiorca "+["A","B"][j],j?"b":"a",ri,{w:240});
   edge(shared?hub:maps[j],sink,values(ri));tray(ri,j?825:275,615,420,"");
  });
 }else if(s.diagram==="refcount"){
  const ref=s.comparisonMode==="shared",gone=t>=10;
  const src=node("timer",550,100,"interval","source",0,{w:260,work:true,born:1,detail:gone?(ref?"zatrzymany":"nadal emituje!"):undefined});
  const op=node("hub",550,295,"shareReplay(1)","op",null,{w:300,detail:"refCount: "+(ref?"true":"false")});
  edge(src,op,values(0),{born:1,disabled:ref&&gone});
  [1,2].forEach((ri,j)=>{
   const x=j?825:275,start=j?2:1,end=j?10:7;
   const sink=node("view"+j,x,480,"Widok "+["A","B"][j],j?"b":"a",ri,{w:250,born:start,disabled:t>=end,detail:t>=end?"zniszczony · unsubscribe":undefined});
   edge(op,sink,values(ri),{born:start,until:end});
   tray(ri,x,575,400,"");
  });
  if(gone)node("warning",550,645,ref?"0 odbiorców → źródło odłączone":"0 odbiorców → zasoby nadal zajęte",ref?"b":"error",null,{w:720,h:42});
 }else if(caseId==="14-distinct"){
  const source=node("source",550,70,"id$","source",0);
  const plain=node("plain",260,235,"bez filtra","muted",null,{w:240});
  const distinct=node("distinct",835,235,"distinctUntilChanged","op",2,{w:300});
  edge(source,plain,values(0));edge(source,distinct,values(0));
  const a=node("http-a",260,410,"HTTP","http",1,{work:true,w:220});
  const b=node("http-b",835,410,"HTTP","http",3,{work:true,w:220});
  edge(plain,a,row(1).spans.map(p=>({at:p.start,value:p.label.replace("GET ",""),color:"a"})));
  edge(distinct,b,row(3).spans.map(p=>({at:p.start,value:p.label.replace("GET ",""),color:"b"})));
  tray(1,260,555,450,"Odpowiedzi · bez filtra");tray(3,835,555,450,"Odpowiedzi · z filtrem");
 }else if(caseId==="15-debounce-audit"||caseId==="16-czas-cztery"){
  const source=node("source",550,65,"zdarzenia$","source",0);
  const indices=s.seriesIndices||s.rows.slice(1).map((_,i)=>i+1),space=1040/indices.length;
  for(const [j,i] of indices.entries()){
   const x=30+space*(j+.5),r=row(i);
   const op=node("op"+i,x,280,r.label,"op",i,{w:Math.min(240,space-20),timer:true});
   edge(source,op,values(0));
   const sink=node("sink"+i,x,465,"Odbiorca","http",null,{w:Math.min(190,space-26)});
   edge(op,sink,values(i));tray(i,x,575,space-22,"Wynik");
  }
 }else if(caseId==="17-latest"){
  const filters=node("filters",260,65,"filtry$","b",0);
  const clicks=node("clicks",835,65,"klik$","source",1);
  [2,3].forEach((ri,j)=>{
   const x=j?835:260,op=node("op"+j,x,290,row(ri).label,"op",ri,{w:290});
   edge(filters,op,values(0));edge(clicks,op,values(1));
   const sink=node("sink"+j,x,465,"Odbiorca","http");
   edge(op,sink,values(ri));tray(ri,x,575,470);
  });
 }else if(caseId==="13-limit"){
  const op=node("op",125,300,"mergeMap","op",null,{w:195,detail:"limit: 3"});
  s.rows.forEach((r,i)=>{
   const n=node("job"+i,390+i*150,130,r.label,["a","b","c","a","b"][i],i,{w:115,inner:true,born:Math.min(...r.spans.map(p=>p.start))});
   edge(n,op,values(i),{workRow:i,gateWork:true});
  });
  const sink=node("sink",550,470,"Odbiorca","http");
  edge(op,sink,s.rows.flatMap(r=>r.events));tray(s.rows.map((_,i)=>i),550,585,860);
 }else if(caseId==="19-share"){
  const http=node("http",195,280,"HTTP","source",2,{work:true});
  const op=node("share",550,280,"share()","op");
  const a=node("a",875,160,"Odbiorca A","a",0),b=node("b",875,410,"Odbiorca B","b",1);
  edge(http,op,values(2));edge(op,a,values(0));edge(op,b,values(1));
  tray(0,875,280,270,"A odebrał");tray(1,875,530,270,"B odebrał");
 }else if(caseId==="20-sharereplay"){
  [0,1].forEach(j=>{
   const x=j?815:275,hr=j?3:1,orr=j?4:2;
   const http=node("http"+j,x,85,"HTTP","source",hr,{work:true});
   const op=node("op"+j,x,295,j?"shareReplay(1)":"share()","op",null,{w:275,detail:j&&t>=6?"bufor: dane":""});
   const b=node("b"+j,x,465,"Odbiorca B","b",null,{detail:t>=10?"subskrybuje":"dołącza w 10 s"});
   edge(http,op,values(hr));edge(op,b,values(orr));tray(orr,x,575,450);
  });
 }else if(caseId==="18-async"){
  s.rows.forEach((r,i)=>{
   const x=i?815:275;
   const http=node("http"+i,x,175,"HTTP #"+(i+1),"source",i,{work:true});
   const sink=node("sink"+i,x,410,r.label,"http");
   edge(http,sink,values(i));tray(i,x,550,450);
  });
 }else if(caseId==="23-angular-alias"){
  const http=node("http",180,280,"HTTP","source",0,{work:true});
  const op=node("async",520,280,"async · alias user","op",null,{w:260});
  edge(http,op,values(0));
  [1,2,3].forEach((ri,j)=>{
   const n=node("ui"+j,885,100+j*210,"UI · "+["A","B","C"][j],"http",ri);
   edge(op,n,values(ri));
  });
 }else if(caseId==="24-signals"){
  const http=node("http",160,265,"HTTP","source",1,{work:true});
  const op=node("signal",545,265,"toSignal","op",2,{w:260});
  const ui=node("ui",930,265,"user()","http",3,{w:170});
  edge(http,op,values(1));edge(op,ui,values(3));
  tray(3,550,520,700,"Odczytana wartość");
 }else if(caseId==="06-subskrypcja"){
  const sub=node("sub",190,120,"subscribe()","b",null,{detail:t>=6?"subskrybuje":"jeszcze nie słucha"});
  const http=node("http",550,280,"HTTP","source",1,{work:true,w:230});
  const sink=node("sink",900,460,"Odbiorca","http");
  edge(sub,http,row(0).events.filter(e=>e.value==="subscribe"),{dashed:true});
  edge(http,sink,values(2));tray(2,600,590,650);
 }else if(caseId==="05-zrodla"){
  const i=s.sourceExample??0,ri=i===2?3:i;
  const source=node('source',200,220,['timer','HTTP','Subject'][i],'source',i,{work:i===1});
  const sink=node('sink',850,220,'Odbiorca','http',ri,{born:i===2?8:0});
  edge(source,sink,values(ri));tray(ri,850,340,500);
 }else if(caseId==="07-hot-cold"){
  const shared=s.comparisonMode==="shared";
  node("observable",550,118,"data$ · HTTP","source",null,{w:300,detail:"ten sam Observable dla A i B"});
  if(shared){
   const work=node("work",550,250,"1 request","http",0,{w:245,work:true});
   edge(nodes[0],work,[]);
   const hub=node("hub",550,382,"share()","op",null,{w:240});
   edge(work,hub,values(0));
   [2,3].forEach((ri,j)=>{
    const sink=node("receiver"+j,j?835:265,520,"Odbiorca "+["A","B"][j],j?"b":"a",ri,{w:220});
    edge(hub,sink,values(ri));tray(ri,j?835:265,615,360,"");
   });
  }else{
   const left=node("workA",265,250,"request A","a",0,{w:245,work:true});
   const right=node("workB",835,250,"request B","b",1,{w:245,work:true});
   edge(nodes[0],left,[]);edge(nodes[0],right,[]);
   [2,3].forEach((ri,j)=>{
    const sink=node("receiver"+j,j?835:265,520,"Odbiorca "+["A","B"][j],j?"b":"a",ri,{w:220});
    edge(j?right:left,sink,values(ri));tray(ri,j?835:265,615,360,"");
   });
  }
 }else if((caseId==="21-share-miejsce"||s.diagram==="placement")){
  const source=node('source',100,250,'Subject','source',0);
  const hub=node('share',550,250,'share()','op');
  if(s.mapAfterShare){
   edge(source,hub,values(0));
   [2,3].forEach((ri,j)=>{
    const map=node('map'+j,800,100+j*230,'map(expensive)','op',ri,{work:true});
    const sink=node('sink'+j,1000,100+j*230,'Odbiorca '+['A','B'][j],'http');
    edge(hub,map,values(0));edge(map,sink,values(ri));tray(ri,1000,210+j*230,260);
   });
  }else{
   const map=node('map',300,250,'map(expensive)','op',1,{work:true});
   edge(source,map,values(0));edge(map,hub,values(1));
   [0,1].forEach(j=>{const sink=node('sink'+j,1000,100+j*230,'Odbiorca '+['A','B'][j],'http');edge(hub,sink,values(1));tray(1,1000,210+j*230,260);});
  }
 }else if(caseId==='b04-catcherror'){
  const source=node('queries',150,230,'klik$','source',0);
  const op=node('catch',550,230,s.catchInside?'switchMap + catch wewnątrz':'switchMap + catch za nim','op');
  const ri=s.catchInside?2:1;
  const sink=node('sink',1000,230,'Odbiorca','http',ri);
  edge(source,op,values(0).filter(e=>s.catchInside||e.at<5),{until:s.catchInside?undefined:5});
  edge(op,sink,values(ri));tray(ri,1000,350,420);
  row(ri).spans.forEach((span,i)=>{
   const failed=span.kind==='error';
   const requestRow={events:failed?[{at:span.end,kind:'error',value:'error'}]:[],spans:[span],completeAt:failed?undefined:span.end};
   const http=node('request'+i,220,80+i*125,span.label,'http',null,{work:true,born:span.start,lifecycleRow:requestRow});
   edge(http,op,failed?[]:[{at:span.end,value:span.label.replace('HTTP ','')}]);
  });
 }else if(caseId==="22-refcount"){
  [0,1].forEach(j=>{
   const x=j?815:275,ri=j?3:2;
   const source=node("source"+j,x,120,"źródło","source",ri,{work:true});
   const op=node("op"+j,x,315,"refCount: "+(j?"false":"true"),"op",null,{w:300});
   edge(source,op,values(ri));
   node("sub"+j,x,505,"Odbiorcy A + B","http",null,{w:300,detail:t<1?"0 odbiorców":t<2?"1 odbiorca":t<6?"2 odbiorców":t<10?"1 odbiorca":"0 odbiorców"});
   edge(op,nodes[nodes.length-1],values(ri).filter(e=>e.at<10),{disabled:t>=10});
  });
 }else if(caseId==="b01-defer"){
  const token=node("token",550,65,"token","source",0,{detail:t<9?"A":"B"});
  [3,4].forEach((ri,j)=>{
   const x=j?815:275;
   const op=node("op"+j,x,285,j?"defer(() => of(token))":"of(token)","op",ri,{w:350});
   edge(token,op,[],{dashed:true});
   const sink=node("sink"+j,x,460,"Odbiorca","http");
   edge(op,sink,values(ri));tray(ri,x,575,450);
  });
 }else if(caseId==="b09-pairwise"){
  const source=node("position",170,230,"pozycja$","source",0);
  const pair=node("pair",530,230,"pairwise()","op",1,{w:240});
  const delta=node("delta",900,230,"map · różnica","op",2,{w:240});
  edge(source,pair,values(0));edge(pair,delta,values(1));
  tray(1,330,485,470,"Kolejne pary");tray(2,830,485,470,"Różnica");
 }else if(["b06-forkjoin","b07-zip","b08-merge","b03-buffertime"].includes(caseId)){
  const isMulti=["b06-forkjoin","b07-zip","b08-merge"].includes(caseId);
  const srcCount=isMulti?s.rows.length-1:1;
  const outIndex=s.rows.length-1;
  const op=node("op",550,320,{ "b06-forkjoin":"forkJoin","b07-zip":"zip","b08-merge":"merge","b09-pairwise":"pairwise()","b03-buffertime":"bufferTime()"}[caseId],"op",isMulti?null:1,{w:280});
  for(let i=0;i<srcCount;i++){
   const n=node("src"+i,110+(i+.5)*880/srcCount,90,row(i).label,["a","b","c"][i%3],i,{w:Math.min(260,800/srcCount),work:row(i).spans.length>0});
   edge(n,op,values(i));
  }
  const sink=node("sink",550,475,caseId==="b03-buffertime"?"HTTP · paczka":"Odbiorca","http",null,{w:260});
  edge(op,sink,values(outIndex));tray(outIndex,550,585,880);
 }else{
  // Independent examples retain their own producer; no invented dependency between rows.
  const columns=s.rows.length>4?3:2,spacing=1040/columns,rows=Math.ceil(s.rows.length/columns);
  s.rows.forEach((r,i)=>{
   const x=30+spacing*(i%columns+.5),y=85+Math.floor(i/columns)*(510/rows);
   const n=node("case"+i,x,y,caseId==='b05-finalize'?'HTTP':r.label,/HTTP/.test(r.label)?"http":i===0?"source":"op",i,{w:Math.min(spacing-30,330),work:r.spans.some(p=>!['subscription','state','queue'].includes(p.kind))});
   const sink=node("sink"+i,x,y+115,"Odbiorca","muted",null,{w:150,h:50});
   edge(n,sink,values(i));tray(i,x,y+188,spacing-35,"");
  });
 }
 // Deklaracja Observable jest w kodzie nad diagramem; klocki pokazują wykonanie.
 const definition=nodes.find(n=>n.id==='observable');
 if(definition)nodes.splice(nodes.indexOf(definition),1);
 const links=layoutDiagram(nodes,edges.filter(e=>e.a!==definition&&e.b!==definition),trays,W,H);
 if(!flowPlan){
  links.forEach(e=>{
   e.id=e.a.id+'-'+e.b.id;
   const sourceRow=e.a.lifecycleRow||(e.workRow!==undefined?row(e.workRow):e.a.ri!==null?row(e.a.ri):null);
   const targetRow=e.b.ri!==null?row(e.b.ri):null;
   const work=sourceRow?.spans.filter(p=>!['queue','state','window','subscription'].includes(p.kind))||[];
   const subscription=targetRow?.spans.find(p=>p.kind==='subscription');
   e.logicalStart=Math.max(e.born||0,e.a.born||0,e.b.born||0,subscription?.start||0,
     (e.gateWork||e.a.work)&&work.length?work[0].start:0);
   let end=terminal(sourceRow);
   if(!sourceRow&&targetRow)end=terminal(targetRow);
   if(subscription){const targetEnd=terminal(targetRow);if(targetEnd&&(!end||targetEnd.at<end.at))end=targetEnd;}
   if(e.until!==undefined&&(!end||e.until<end.at))end={at:e.until,kind:'unsubscribe'};
   e.logicalEnd=end;
  });
  // Pierwszy odbiorca rozpoczyna łączenie całej gałęzi w stronę źródła.
  for(let i=0;i<links.length;i++)links.forEach(e=>{
   const downstream=links.filter(next=>next.a===e.b);
   if(downstream.length)e.logicalStart=Math.max(e.logicalStart,Math.min(...downstream.map(next=>next.logicalStart)));
  });
  links.forEach(e=>{e.events=e.events.filter(v=>v.at>=e.logicalStart&&!(e.logicalEnd?.kind==='unsubscribe'&&v.at>=e.logicalEnd.at));});
  flowPlan=planFlow(nodes,links,s.duration);
  playbackDuration=flowPlan.duration;
  el.slider.max=String(playbackDuration);
  t=flowPlan.logicalTime(elapsed);
 }
 modelTime=t;
 let svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(s.title+": "+getCaption(s,t))+'">';
 const paths=[], incoming=new Map();
 const born=n=>flowPlan.births.get(n.id)??flowPlan.timeOf(n.born||0);
 const visible=n=>elapsed>=born(n)&&(n.until===undefined||t<n.until);
 function geometry(a,b){
  const sx=a.x+a.w/2,ex=b.x-b.w/2,mid=(sx+ex)/2;
  return [[sx,a.y],[mid,a.y],[mid,b.y],[ex,b.y]];
 }
 links.forEach(e=>{
  const record=flowPlan.records.get(e.a.id+'-'+e.b.id);
  const {start,end,events}=record;
  const state=connectionState(elapsed,start,end,events);
  incoming.set(e.b,[...(incoming.get(e.b)||[]),{...state,end,start}]);
  if(!visible(e.a)||!visible(e.b)||state.done||elapsed<start)return;
  const pts=geometry(e.a,e.b),d=pts.map((p,i)=>(i?'L':'M')+p.join(' ')).join('');
  svg+='<path data-connection="'+esc(e.a.id+'-'+e.b.id)+'" data-phase="'+state.phase+'" d="'+d+'" fill="none" stroke="'+state.color+'" stroke-width="6" pathLength="1" stroke-dasharray="1" stroke-dashoffset="'+state.offset+'"/>';
  if(!e.disabled)paths.push({e,pts,end,start,events});
 });
 function nodeTime(n){
  const related=[...flowPlan.records.values()];
  const emitted=related.filter(e=>e.a.id===n.id).flatMap(e=>[
   ...e.events.filter(v=>v.at<=elapsed).map(v=>v.logicalAt),
   ...(e.end&&e.end.at<=elapsed?[e.end.logicalAt]:[]),
  ]);
  const received=related.filter(e=>e.b.id===n.id).flatMap(e=>e.events.filter(v=>v.arrival<=elapsed).map(v=>v.logicalAt));
  return Math.max(t,...emitted,...received);
 }
 function status(n){
  const t=nodeTime(n);
  if(n.detail!==undefined)return n.detail;
  if(n.ri===null&&!n.lifecycleRow)return "";
  const r=n.lifecycleRow||row(n.ri),spans=r.spans||[];
  const error=r.events.find(e=>e.kind==="error"&&e.at<=t);
  if(error)return String(error.value);
  const active=spans.filter(p=>p.start<=t&&p.end>t);
  if(active.some(p=>p.kind==="queue"))return "czeka w kolejce";
  if(active.some(p=>p.kind==="state"))return active.find(p=>p.kind==="state").label;
  if(active.some(p=>p.kind==="subscription"))return "subskrybuje";
  if(active.length)return n.timer?"okno otwarte":"praca trwa";
  if(r.completeAt!==undefined&&t>=r.completeAt)return "complete";
  const last=spans.filter(p=>p.end<=t).slice(-1)[0];
  if(last&&last.kind==="cancel")return "odsubskrybowano";
  if(last&&last.kind==="error")return "błąd";
  if(r.events.some(e=>e.kind==="ignored"&&e.at<=t))return "pominięte";
  if(n.timer){
   if(n.label==="debounceTime"){
    const latest=values(0).filter(e=>e.at<=t).slice(-1)[0];
    if(latest&&t<latest.at+3.5)return "cisza: "+(latest.at+3.5-t).toFixed(1)+" s";
   }
   if(n.label==="sampleTime")return "takt za "+(3.5-(t%3.5)).toFixed(1)+" s";
  }
  if(n.work||n.inner)return spans.some(p=>p.start>t)?"czeka":last?"zakończone":"czeka";
  const v=values(n.ri).filter(e=>flowPlan.receivedAt(n.id,e)<=elapsed).slice(-1)[0];
  return v?"ostatnia: "+v.value:"";
 }
 nodes.forEach(n=>{
  if(!visible(n))return;
  const t=nodeTime(n);
  const r=n.lifecycleRow||(n.ri!==null?row(n.ri):empty),active=r.spans.some(p=>p.start<=t&&p.end>t&&p.kind!=="queue"),labelLines=wrapLabel(n.label,Math.floor(n.w/15));
  const cancelled=r.spans.some(p=>p.kind==="cancel"&&t>=p.end);
  const stroke=active?"#26343d":"none";
  const notifications=(incoming.get(n)||[]).filter(p=>p.done&&['complete','error'].includes(p.phase));
  const ownTerminal=terminal(r);
  const latest=notifications.at(-1);
  const isReceiver=incoming.has(n)&&!links.some(e=>e.a===n);
  const notification=latest&&(isReceiver||ownTerminal&&latest.end?.logicalAt===ownTerminal.at)?latest:null;
  const fill=notification?notification.color:n.work||n.inner?palette.work:isReceiver?palette.observer:!incoming.has(n)?palette.source:(colors[n.color]||colors.op);
  const opacity=(n.disabled?.42:cancelled?.6:1)*clamp((elapsed-born(n))/fadeDuration,0,1);
  svg+='<g data-node="'+esc(n.id)+'" opacity="'+opacity+'"><rect x="'+(n.x-n.w/2)+'" y="'+(n.y-n.h/2)+'" width="'+n.w+'" height="'+n.h+'" rx="2" fill="'+fill+'" stroke="'+stroke+'" stroke-width="3"/>';
  labelLines.forEach((line,i)=>svg+=text(n.x,n.y+(i-(labelLines.length-1)/2)*27,line,28,'text-anchor="middle"'+(notification?' style="fill:#fff"':'')));
  const st=notification?(notification.phase==='complete'?'✓ complete':'× error'):status(n);
  if(st)svg+=text(n.x,n.y+n.h/2+22,st,22,'text-anchor="middle"');

  if(active&&(n.work||n.inner||n.timer)){
   const span=r.spans.find(p=>p.start<=t&&p.end>t&&p.kind!=="queue"),p=clamp((t-span.start)/(span.end-span.start),0,1);
   svg+='<rect x="'+(n.x-n.w/2)+'" y="'+(n.y+n.h/2-12)+'" width="'+(n.w*p)+'" height="12" fill="#132f42"/>';
  }
  svg+='</g>';
 });
 function pointAt(pts,progress){
  const lengths=pts.slice(1).map((p,i)=>Math.hypot(p[0]-pts[i][0],p[1]-pts[i][1]));
  let distance=lengths.reduce((a,b)=>a+b,0)*progress;
  for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const u=lengths[i]?distance/lengths[i]:0;return [pts[i][0]+(pts[i+1][0]-pts[i][0])*u,pts[i][1]+(pts[i+1][1]-pts[i][1])*u];}distance-=lengths[i];}
  return pts[pts.length-1];
 }
 paths.forEach(({e,pts,end,start,events})=>{
  events.forEach(event=>{
   const age=elapsed-event.at;if(age<0||age>=transitionDuration||event.at<start||end&&event.at>=end.at&&end.kind==='unsubscribe')return;
   const [x,y]=pointAt(pts,clamp(age/transitionDuration,0,1)),v=String(event.value),w=Math.max(40,Math.min(145,v.length*13+20));
   svg+='<g data-value-on="'+esc(e.a.id+'-'+e.b.id)+'"><rect x="'+(x-w/2)+'" y="'+(y-22)+'" width="'+w+'" height="44" rx="22" fill="'+(colors[event.color]||colors.a)+'" stroke="#fff" stroke-width="3"/>'+text(x,y+1,v,23,'text-anchor="middle"')+'</g>';
  });
 });
 trays.forEach(q=>{
  const indices=Array.isArray(q.ri)?q.ri:[q.ri];
  const events=indices.flatMap(values).filter(e=>flowPlan.receivedAt(q.anchor,e)<=elapsed).sort((a,b)=>a.at-b.at);
  const slots=Math.max(2,Math.floor(q.w/90)),visible=events.slice(-slots),gap=Math.min(100,q.w/Math.max(slots,1));
  if(q.label)svg+=text(q.x,q.y-40,q.label,20,'text-anchor="middle"');
  const total=visible.length,start=q.x-(total-1)*gap/2;
  for(let i=0;i<total;i++){
   const e=visible[i],cx=start+i*gap;
   const v=e?String(e.value):'',tokenWidth=Math.min(gap-8,Math.max(50,v.length*13+14));
   const fill=e?(colors[e.color]||colors.a):"#edf0f2";
   if(v.length>3)svg+='<rect x="'+(cx-tokenWidth/2)+'" y="'+(q.y-25)+'" width="'+tokenWidth+'" height="50" rx="20" fill="'+fill+'"/>';
   else svg+='<circle cx="'+cx+'" cy="'+q.y+'" r="25" fill="'+fill+'"/>';
   if(e)svg+=text(cx,q.y+1,v,Math.min(23,(tokenWidth-12)/Math.max(3,v.length)*1.6),'text-anchor="middle"');
  }
  if(events.length>slots)svg+=text(q.x-q.w/2,q.y,"…",24,'text-anchor="start"');
 });
 return svg+"</svg>";
}

function paint(){
 const shown=scene;
 modelTime=Math.min(time,scene.duration);
 el.code.textContent=shown.code;
 el.stage.innerHTML=shown.kind==="cards"?renderCards(shown,Math.min(time,playbackDuration)):renderTimeline(shown,Math.min(time,playbackDuration));
 const caption=getCaption(shown,modelTime);
 if(el.caption.textContent!==caption)el.caption.textContent=caption;
 el.metrics.innerHTML=(shown.metrics||[]).map(m=>'<div class="rx-metric"><span>'+esc(m.label)+'</span><b>'+esc(m.value(modelTime))+'</b></div>').join("");
 el.play.textContent=running?"Pauza":time>=playbackDuration?"Powtórz":time>0?"Kontynuuj":"Odtwórz";
 el.back.disabled=time<=0;
 el.next.disabled=time>=playbackDuration;
 el.clock.textContent=Math.min(time,playbackDuration).toFixed(1).replace(".",",")+" / "+playbackDuration.toFixed(1).replace(".",",")+" s";
 el.slider.value=String(Math.min(time,playbackDuration));
 el.slider.setAttribute("aria-valuetext",Math.min(time,playbackDuration).toFixed(1)+" sekund");
}

function pause(){
 running=false;previous=null;
 if(animationFrame!==null)cancelAnimationFrame(animationFrame);
 animationFrame=null;paint();
}
function seek(target){pause();time=clamp(target,0,playbackDuration);paint();}
function step(direction){
const shown=scene;
 const logicalPoints=[...new Set([0,scene.duration,...scene.checkpoints,
  ...shown.captions.map(c=>c[0]),...shown.rows.flatMap(r=>[
   ...r.events.map(e=>e.at),...r.spans.flatMap(p=>[p.start,p.end]),
   ...(r.completeAt===undefined?[]:[r.completeAt])
  ]),...(shown.jobs||[]).map(j=>j.at)
 ])].filter(x=>Number.isFinite(x)&&x>=0&&x<=scene.duration).sort((a,b)=>a-b);
 const points=flowPlan?[...new Set([0,playbackDuration,...logicalPoints.map(flowPlan.timeOf),
  ...[...flowPlan.records.values()].flatMap(e=>[e.start,e.start+transitionDuration,
   ...e.events.flatMap(v=>[v.at,v.arrival]),...(e.end?[e.end.at,e.end.at+transitionDuration]:[])])
 ])].filter(Number.isFinite).sort((a,b)=>a-b):logicalPoints;
 const target=direction>0?points.find(v=>v>time+.05):[...points].reverse().find(v=>v<time-.05);
 seek(target===undefined?(direction>0?playbackDuration:0):target);
}

function play(){
 if(running)return;
 if(time>=playbackDuration)time=0;
 running=true;previous=null;paint();animationFrame=requestAnimationFrame(frame);
}
function toggle(){if(running)pause();else play();}
function restart(){pause();time=0;play();}
function hideControls(){el.toolbar.hidden=true;if(root.contains(document.activeElement))document.activeElement.blur();}
function toggleControls(){if(el.toolbar.hidden)el.toolbar.hidden=false;else hideControls();}
function frame(now){
 animationFrame=null;
 if(!running||!root.isConnected)return;
 if(previous!==null)time+=Math.min((now-previous)/1000,.25);
 previous=now;
 if(time>=playbackDuration+2){time=0;}
 if(now-lastPaint>=33){paint();lastPaint=now;}
 animationFrame=requestAnimationFrame(frame);
}
q('.rx-hide').addEventListener('click',hideControls);
el.back.addEventListener('click',()=>step(-1));
el.next.addEventListener('click',()=>step(1));
el.slider.addEventListener('input',()=>seek(Number(el.slider.value)));
el.play.addEventListener('click',toggle);
q('.rx-reset').addEventListener('click',restart);
// Pozwól przyciskom i suwakowi obsługiwać własne klawisze.
root.addEventListener('keydown',event=>{
 if(event.target.matches('input')||(['Enter',' '].includes(event.key)&&event.target.matches('button')))event.stopPropagation();
});
paint();
return {pause,play,toggle,step,reset:restart,restart,seek,finish:()=>seek(playbackDuration),get duration(){return playbackDuration;},hideControls,toggleControls};
}
