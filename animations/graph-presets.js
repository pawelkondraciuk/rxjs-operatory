// Adapter danych rows do wspólnego grafu. Nie renderuje ani nie steruje czasem.
export function catalogGraph(s) {
 const W=1240,H=(s.rendererId||s.id)==='13-limit'?420:360,nodes=[],edges=[],trays=[];
 const row=i=>s.rows[i]||{events:[],spans:[],label:""};
 const values=i=>row(i).events.filter(e=>e.kind!=="ignored"&&e.kind!=="error"&&!/^(sub|subscribe|utwórz|A\+|B\+|[+−]$)/i.test(String(e.value)));
 const node=(id,x,y,label,color="op",ri=null,extra={})=>{const n={id,x,y,w:190,h:70,label,color,ri,...extra};nodes.push(n);return n;};
 const edge=(a,b,events=[],extra={})=>edges.push({a,b,events,...extra});
 const tray=(ri,x,y,w=400,label="")=>trays.push({ri,x,y,w,label});
 const caseId=s.rendererId||s.id;
 if(s.diagram==="late")return executionComparison(s);
 if(s.diagram==="subscriptions"||s.diagram==="coldhot"){
  const shared=s.comparisonMode==="shared",coldhot=s.diagram==="coldhot",simultaneous=s.diagram==="subscriptions";
  const source=node("observable",550,70,coldhot?(shared?"jeden producent":"timer$"):(simultaneous?"jeden user$":"jeden data$"),"source",null,{w:300});
  source.label=coldhot?(shared?"jeden producent":"timer$"):source.label;
  const jobs=[];
  [0,1].forEach(j=>{
   if(shared&&j===1)return;
   const x=shared?550:j?825:275,ri=j;
   const birth=coldhot?(j?6:0):j?(simultaneous?1:3):1;
   jobs.push(node("work"+j,x,235,coldhot?(shared?"wspólny timer":"timer "+["A","B"][j]):shared?"wspólne HTTP":"HTTP "+["A","B"][j],shared?"http":j?"b":"a",ri,{w:230,work:true,born:birth}));
   edge(source,jobs[j],[],{born:birth});
  });
  const hub=shared?node("hub",550,370,coldhot?"Subject":"share()","op",null,{w:240}):null;
  if(hub&&jobs[0])edge(jobs[0],hub,values(0));
  [2,3].forEach((ri,j)=>{
   const x=j?825:275,start=coldhot?(j?6:0):j?(simultaneous?1:3):1;
   const sink=node("receiver"+j,x,510,"Odbiorca "+["A","B"][j],j?"b":"a",ri,{w:250,born:start});
   const target=shared?hub:jobs[j];
   // Wspólny producent: odbiorcy dostają tę samą wartość w kolorze producenta.
   const colour=e=>values(0).find(v=>v.value===e.value)?.color??e.color;
   edge(target,sink,shared?values(ri).map(e=>({...e,color:colour(e)})):values(ri),{born:start});
   const targetX=target.x+(j?target.w/2:-target.w/2);
   const side=j?1015:85;
   edge(sink,target,[{at:start,value:"sub",color:j?"b":"a"}],{dashed:true,born:start,label:"subscribe",points:[[x+(j?125:-125),510],[side,510],[side,target.y],[targetX,target.y]]});
   tray(ri,x,615,420,"");
  });
 }else if(s.diagram==="expensive"){
  const shared=s.comparisonMode==="shared";
  const source=node("source",550,75,"Subject.next","source",0,{w:280});
  const maps=[];
  [0,1].forEach(j=>{
   if(shared&&j)return;
   const n=node("map"+j,shared?550:j?825:275,240,"map(expensive)","op",j+1,{w:280,work:true});
   // Subskrypcja przez map(expensive) od razu; pasek kosztu dopiero przy emisjach.
   maps.push(n);edge(source,n,values(0),{logicalStart:0});
  });
  const hub=shared?node("hub",550,385,"share()","op",null,{w:220}):null;
  if(hub)edge(maps[0],hub,values(1),{logicalStart:0});
  [3,4].forEach((ri,j)=>{
   const sink=node("receiver"+j,j?825:275,515,"Odbiorca "+["A","B"][j],j?"b":"a",ri,{w:240});
   edge(shared?hub:maps[j],sink,values(ri),{logicalStart:0});tray(ri,j?825:275,615,420,"");
  });
 }else if(s.diagram==="refcount"){
  const ref=s.comparisonMode==="shared";
  const src=node("timer",550,100,"interval","source",0,{w:260,work:true,born:1,detail:t=>t>=10?(ref?"zatrzymany":"nadal emituje!"):undefined});
  const op=node("hub",550,295,"shareReplay(1)","op",null,{w:300,detail:"refCount: "+(ref?"true":"false")});
  edge(src,op,values(0),{born:1,until:ref?10:undefined});
  [1,2].forEach((ri,j)=>{
   const x=j?825:275,start=j?2:1,end=j?10:7;
   const sink=node("view"+j,x,480,"Widok "+["A","B"][j],j?"b":"a",ri,{w:250,born:start,disabled:t=>t>=end,detail:t=>t>=end?"zniszczony · unsubscribe":undefined});
   edge(op,sink,values(ri),{born:start,until:end});
   tray(ri,x,575,400,"");
  });
 }else if(caseId==="15-debounce-audit"||caseId==="16-czas-cztery"){
  const source=node("source",550,65,"zdarzenia$","source",0);
  const indices=s.seriesIndices||s.rows.slice(1).map((_,i)=>i+1),space=1040/indices.length;
  for(const [j,i] of indices.entries()){
   const x=30+space*(j+.5),r=row(i);
   const op=node("op"+i,x,280,r.label,"op",i,{w:Math.min(240,space-20),timer:true,
    detail:r.label==='sampleTime'?t=>'takt za '+(3.5-(t%3.5)).toFixed(1)+' s':r.label==='debounceTime'?t=>{
     const latest=values(0).filter(e=>e.at<=t).at(-1);
     return latest&&t<latest.at+3.5?'cisza: '+(latest.at+3.5-t).toFixed(1)+' s':undefined;
    }:undefined});
   edge(source,op,values(0));
   const sink=node("sink"+i,x,465,"Odbiorca","http",null,{w:Math.min(190,space-26)});
   edge(op,sink,values(i));tray(i,x,575,space-22,"Wynik");
  }
  if(indices.length>2){
   // Cztery porównania: historia mieści się w odbiorcy, status pod operatorem.
   Object.assign(source,{x:150,y:170,w:240,h:70,ready:true});
   indices.forEach((i,j)=>{
    const y=35+j*86;
    Object.assign(nodes.find(n=>n.id==='op'+i),{x:510,y,w:280,h:50,ready:true});
    Object.assign(nodes.find(n=>n.id==='sink'+i),{x:990,y:y+10,w:420,h:86,labelOffset:-26,ready:true});
    Object.assign(trays[j],{anchor:'sink'+i,x:990,y:y+28,w:370,label:''});
   });
   return {nodes,edges,trays,width:W,height:H,layout:'fixed'};
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
 }else if(caseId==="23-angular-alias"){
  const http=node("http",180,280,"HTTP","source",0,{work:true});
  const op=node("async",520,280,"async · alias user","op",null,{w:260});
  edge(http,op,values(0));
  [1,2,3].forEach((ri,j)=>{
   const n=node("ui"+j,885,100+j*210,"UI · "+["A","B","C"][j],"http",ri);
   // async subskrybuje HTTP od razu przy subskrypcji widoku (1 s): cały łańcuch startuje razem.
   edge(op,n,values(ri),{logicalStart:1});
  });
 }else if(caseId==="24-signals"){
  const http=node("http",160,265,"HTTP","source",1,{work:true});
  const op=node("signal",545,265,"toSignal","op",2,{w:260});
  const ui=node("ui",930,265,"user()","http",3,{w:170});
  // toSignal subskrybuje przy utworzeniu (1 s); odczyty user() korzystają z tego samego połączenia.
  edge(http,op,values(1));edge(op,ui,values(3),{logicalStart:1});
  tray(3,550,520,700,"Odczytana wartość");
 }else if(caseId==="06-subskrypcja"){
  // Definicja HTTP jest od początku (bez requestu); odbiorca pojawia się przy subscribe w 6 s, jak w 05-zrodla-2.
  const http=node('http',200,200,'HTTP','source',1,{work:true,ready:true,detail:t=>t<6?'bez requestu':undefined});
  const sink=node('sink',900,200,'Odbiorca','http',2,{born:6,ready:false});
  edge(http,sink,values(2),{born:6});tray(2,900,300,400);
 }else if(caseId==="05-zrodla"){
  const i=s.sourceExample??0,ri=i===2?3:i;
  const source=node('source',200,220,['timer','HTTP','Subject'][i],'source',i,{work:i===1});
  const sink=node('sink',850,220,'Odbiorca','http',ri,{born:i===2?8:0});
  edge(source,sink,values(ri));tray(ri,850,340,500);
 }else if((caseId==="21-share-miejsce"||s.diagram==="placement")){
  const source=node('source',100,250,'Subject','source',0);
  const hub=node('share',550,250,'share()','op');
  // Odbiorcy subskrybują od razu; map(expensive) jest ogniwem tej samej subskrypcji, a nie czeka na pierwszy koszt.
  const at0={logicalStart:0};
  if(s.mapAfterShare){
   edge(source,hub,values(0),at0);
   [2,3].forEach((ri,j)=>{
    const map=node('map'+j,800,100+j*230,'map(expensive)','op',ri,{work:true});
    const sink=node('sink'+j,1000,100+j*230,'Odbiorca '+['A','B'][j],'http');
    edge(hub,map,values(0),at0);edge(map,sink,values(ri),at0);tray(ri,1000,210+j*230,260);
   });
  }else{
   const map=node('map',300,250,'map(expensive)','op',1,{work:true});
   edge(source,map,values(0),at0);edge(map,hub,values(1),at0);
   [0,1].forEach(j=>{const sink=node('sink'+j,1000,100+j*230,'Odbiorca '+['A','B'][j],'http');edge(hub,sink,values(1),at0);tray(1,1000,210+j*230,260);});
  }
 }else if(caseId==="b01-defer"){
  const token=node("token",550,65,"token","source",0,{detail:t=>t<9?"A":"B"});
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
 }else if(caseId==='b03-buffertime'){
  const source=node('source',100,200,'zdarzenia','source',0);
  const buffer=node('buffer',380,200,'bufferTime','op',1,{timer:true});
  const http=node('http',700,200,'HTTP · paczka','http',2,{work:true});
  const sink=node('sink',1000,200,'Odbiorca','http');
  edge(source,buffer,values(0));edge(buffer,http,values(1));
  // Odbiorca subskrybuje od początku: łańcuch odbiorca → HTTP → bufferTime → zdarzenia, prace HTTP dopiero przy paczkach.
  edge(http,sink,values(2),{logicalStart:0});tray(2,1000,300,260);
 }else if(["b06-forkjoin","b07-zip","b08-merge"].includes(caseId)){
  const srcCount=s.rows.length-1;
  const outIndex=s.rows.length-1;
  const op=node("op",550,320,{ "b06-forkjoin":"forkJoin","b07-zip":"zip","b08-merge":"merge"}[caseId],"op",null,{w:280});
  for(let i=0;i<srcCount;i++){
   const n=node("src"+i,110+(i+.5)*880/srcCount,90,row(i).label,["a","b","c"][i%3],i,{w:Math.min(260,800/srcCount),work:row(i).spans.length>0});
   edge(n,op,values(i));
  }
  const sink=node("sink",550,475,"Odbiorca","http",null,{w:260});
  // forkJoin subskrybuje wszystkie źródła od razu przy własnej subskrypcji (start żądań).
  const firstWork=Math.min(...s.rows.slice(0,srcCount).flatMap(r=>r.spans.map(p=>p.start)),Infinity);
  edge(op,sink,values(outIndex),Number.isFinite(firstWork)?{logicalStart:firstWork}:{});tray(outIndex,550,585,880);
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
 // READY pokazuje uczestników potoku; wykonania zimnych źródeł pojawiają się przy subscribe.
 // Jawne ready:false (np. odbiorca tworzony przez subscribe) ma pierwszeństwo.
 nodes.forEach(n=>{if(!n.work&&!n.inner&&n.ready!==false)n.ready=true;});
 return {nodes, edges:edges.filter(e=>e.a!==definition&&e.b!==definition), trays, width:W, height:H};

}


// Definicja jest w kodzie; diagram pokazuje wykonania i odbiorców.
// Używa wspólnego modelu rows, planFlow i licznika faktycznych subskrypcji.
function executionComparison(scene) {
 const large=scene.format==='4:3',height=large?612:460;
 const shared=scene.comparisonMode==='shared',late=scene.diagram==='late',cold=scene.diagram==='coldhot';
 const independent=cold||!shared&&!late;
 const rowY=large?[80,390]:[50,280],nodes=[],edges=[],panels=[],trays=[],executions=[];
 const values=i=>scene.rows[i].events.filter(e=>e.kind==='value');
 const tile=(id,x,y,w,label,ri,extra={})=>{const n={id,x,y,w,h:large?120:80,label,ri,statusInside:true,...extra};nodes.push(n);return n;};
 const link=(from,to,events,extra={})=>edges.push({id:from+'-'+to,from,to,events,...extra});
 const history=(sink,edgeId)=>{
  const box={x:sink.x-sink.w/2,y:sink.y+sink.h/2+20,w:sink.w,h:large?140:104,
    from:{x:sink.x,y:sink.y+sink.h/2},showOn:{type:'deliver-next',edge:edgeId,value:scene.rows[sink.ri].events[0].value}};
  panels.push(box);trays.push({anchor:sink.id,x:sink.x,y:box.y+(cold?(large?35:27):box.h/2),w:sink.w-16,
   lines:cold?2:1,...(cold?{lineStep:large?70:50}:{})});
 };
 const job=(id,x,y,w,ri,start,label,out)=>{
  const n=tile(id,x,y,w,label,ri,{work:true,born:start,color:'http'});
  const span=scene.rows[ri].spans.find(p=>p.kind==='work');
  executions.push({id: 'execution-'+id,node:id,edge:out,duration:span.end-span.start,label});
  return n;
 };
 if(independent){
  for(const i of [0,1]){
   const start=cold?(i?6:0):i?2:0;
   job('work'+i,270,rowY[i],440,i,start,cold?'timer$':'data$','work'+i+'-receiver'+i);
   const sink=tile('receiver'+i,960,rowY[i],440,cold?'timer$.subscribe()':'data$.subscribe()',i+2,{born:start,color:'http'});
   link('work'+i,sink.id,values(i+2),{logicalStart:start});history(sink,'work'+i+'-'+sink.id);
  }
 } else {
  const hub=tile('hub',620,(rowY[0]+rowY[1])/2,300,late?(shared?'shareReplay(1)':'share()'):'share()',null,{ready:late,color:'op'});
  const ids=late?['http1','http2']:['work0'];
  for(const [i,id] of ids.entries()){
   if(late&&shared&&i===1)continue;
   const start=late?(i?10:1):0;
   job(id,175,late?rowY[i]:hub.y,330,i,start,late?'HTTP #'+(i+1):'data$',id+'-hub');
   link(id,hub.id,values(i),{logicalStart:start});
  }
  // Hub przekazuje tę samą wartość: odbiorca dostaje kolor odpowiedzi, z której pochodzi (także z bufora),
  // a nie własny. Różne kolory sugerowałyby dwie różne odpowiedzi.
  const inputs=ids.flatMap((id,i)=>late&&shared&&i===1?[]:values(i));
  const forwarded=events=>events.map(e=>({...e,color:inputs.filter(v=>v.value===e.value&&v.at<=e.at).at(-1)?.color??e.color}));
  for(const i of [0,1]){
   const start=late?(i?10:1):(i?2:0);
   const sink=tile('receiver'+i,1040,rowY[i],360,'Odbiorca '+['A','B'][i],i+2,{born:start,color:'http'});
   // Późny odbiorca po resecie share subskrybuje nowe wykonanie.
   link(hub.id,sink.id,forwarded(values(i+2)),{logicalStart:start});history(sink,hub.id+'-'+sink.id);
  }
  if(late&&shared){
   const y=hub.y+hub.h/2+(large?60:25);
   panels.push({x:hub.x-hub.w/2,y,w:hub.w,h:large?120:90,label:'bufor ReplaySubject',
    from:{x:hub.x,y:hub.y+hub.h/2},showOn:{type:'deliver-next',edge:'http1-hub',value:'dane'}});
   trays.push({anchor:hub.id,x:hub.x,y:y+(large?75:62),w:hub.w-24,lines:1});
  }
 }
 return {layout:'fixed',formatAware:true,width:1240,height,nodes,edges,panels,trays,executions,
  ...(late?{timeline:[{type:'comparison-result',event:{type:'disconnected',edge:'hub-receiver1'},offset:.1,
   caption:shared?'B dostał zapamiętaną odpowiedź. Nadal jeden request.':'B dostał nową odpowiedź. Dwa requesty.'}]}:{}),
  ...(large?{textScale:1.5,labelScale:1.75}:{})};
}
