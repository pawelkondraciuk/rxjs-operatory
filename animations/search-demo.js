// Gotowy komponent UI: wejścia i odpowiedzi mają wspólną, deterministyczną oś czasu.
// Nie uruchamiamy HTTP ani potoku RxJS; 300 ms ciszy jest częścią modelu pokazu.
export const searchExamples = [
  {query:'rea',results:['React','Preact','React Native','React Router','React Query']},
  {query:'ang',results:['Angular','Angular Universal','Angular Material','Angular Signals','RxAngular']},
  {query:'vue',results:['Vue','Vue Router','VueUse','Petite Vue','BootstrapVue']},
  {query:'sve',results:['Svelte','SvelteKit','Svelte Material UI','Svelte Motion','Svelte Headless UI']},
];
export const searchTiming = {type:.18,erase:.15,debounce:.3,emptyHold:.7,resultHold:2,fade:.18};
export const searchCaption = 'Pokaz działania gotowej wyszukiwarki: fraza zmienia się automatycznie, a lista wyników reaguje i pogrubia dopasowania.';
const round = time => Math.round(time*1e6)/1e6;

export function searchDemoTimeline() {
  const inputs=[];
  let time=0;
  searchExamples.forEach(({query})=>{
    for(let length=1;length<=query.length;length++) {
      time=round(time+searchTiming.type);
      inputs.push({at:time,query:query.slice(0,length),deleting:false});
    }
    const receivedAt=round(time+searchTiming.debounce);
    time=round(receivedAt+searchTiming.resultHold);
    for(let length=query.length-1;length>=0;length--) {
      time=round(time+searchTiming.erase);
      inputs.push({at:time,query:query.slice(0,length),deleting:true});
    }
    time=round(time+searchTiming.emptyHold);
  });
  const responses=inputs.flatMap((input,index)=>{
    const at=round(input.at+searchTiming.debounce),next=inputs[index+1];
    if(!input.query||(next&&next.at<at))return [];
    return [{at,query:input.query,results:searchExamples.flatMap(example=>example.results)
      .filter(label=>label.toLowerCase().includes(input.query.toLowerCase()))}];
  });
  return {inputs,responses,duration:time};
}

export function searchPanelState(timeline,time) {
  time%=timeline.duration;
  const input=timeline.inputs.findLast(input=>input.at<=time);
  const response=timeline.responses.findLast(response=>response.at<=time);
  const query=input?.query||'';
  const cleared=response&&timeline.inputs.findLast(input=>!input.query&&input.at>response.at&&input.at<=time);
  const dropdownOpacity=!response?0:cleared?Math.max(0,1-(time-cleared.at)/searchTiming.fade):
    Math.min(1,(time-response.at)/searchTiming.fade);
  return {query,dropdownOpacity,results:(response?.results||[]).map(label=>{
    const start=query?label.toLowerCase().indexOf(query.toLowerCase()):-1;
    return {label,matches:start<0?[]:[{start,end:start+query.length}]};
  })};
}

export function searchDemoVariant(scene,{from=0,to=32}={}) {
  const timeline=searchDemoTimeline();
  const height=scene.format==='4:3'?612:550;
  const events=[...timeline.inputs.map(input=>({at:input.at,type:'search-input',value:input.query,deleting:input.deleting})),
    ...timeline.responses.map(response=>({at:response.at,type:'search-results',value:response.query}))];
  const cycles=Array.from({length:Math.ceil(to/timeline.duration)-Math.floor(from/timeline.duration)+1},
    (_,index)=>Math.floor(from/timeline.duration)+index);
  return {...scene,duration:to,graph:{layout:'fixed',formatAware:true,width:1240,height,nodes:[],edges:[],trays:[],
    searchPanels:[{id:'framework-search',x:60,y:0,w:1120,h:516,
      label:'Search JS frameworks',placeholder:'Search frameworks…',
      state:time=>searchPanelState(timeline,time)}],
    timeline:cycles.flatMap(cycle=>events.map(event=>({...event,at:round(event.at+cycle*timeline.duration)})))
      .filter(event=>event.at>=from&&event.at<=to),
  }};
}

export function configureSearchDemo(scene) {
  const timeline=searchDemoTimeline();
  Object.assign(scene,{
    title:'Zaprojektujmy wyszukiwarkę',code:'',codeSyntax:false,rows:[],metrics:[],
    duration:32,captions:[[0,searchCaption]],
    playerLayout:'expanded',playerClass:'rx-search-demo',
    playback:{controller:'stages',entry:'manual',navigation:'slide',resetOnExit:true,stops:[],
      stillTime:round(timeline.responses.at(-1).at+searchTiming.fade+.1)},
    live:{start:0,window:32,keep:8,margin:3,autoplay:true,variant:searchDemoVariant},
  });
  scene.graph=searchDemoVariant(scene).graph;
}
