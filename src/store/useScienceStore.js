import {create} from 'zustand';
let worker=null,serial=0;
export const useScienceStore=create((set,get)=>({
 tab:'mission',busy:false,job:null,progress:null,error:null,result:null,replay:null,windows:null,benchmark:null,uncertainty:null,comparison:null,gpu:null,
 open(tab){set({tab});},
 cancel(){worker?.terminate();worker=null;serial++;set({busy:false,progress:null,job:null,error:'Analysis cancelled; current simulation unchanged.'});},
 run(job,payload){
  if(get().busy)throw new Error('An analysis is already running');
  const id=++serial;worker=new Worker(new URL('../physics/science.worker.js',import.meta.url),{type:'module'});
  set({busy:true,job,progress:{phase:'Starting worker'},error:null,[job==='reference'?'result':job]:null,...(job==='reference'?{replay:null,uncertainty:null}:{})});
  worker.onerror=e=>{if(id!==serial)return;worker?.terminate();worker=null;set({busy:false,error:e.message||'Analysis worker failed'});};
  worker.onmessage=({data})=>{if(data.id!==serial)return;if(data.progress){set({progress:data.progress});return;}
   worker?.terminate();worker=null;
   const key=job==='reference'?'result':job;
   set({busy:false,job:null,error:data.error??null,...(data.result?{[key]:data.result}:{})});
  };
  worker.postMessage({id,job,payload});
 },
 compare(result){set({comparison:result});}
}));
