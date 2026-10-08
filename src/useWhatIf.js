import {useEffect} from 'react';
import {wrap} from 'comlink';
import {workerRequest} from './analysisWorker.js';
import {useSimStore} from './store/useSimStore.js';
import {useWhatIfStore} from './store/useWhatIfStore.js';
export function useWhatIf(){
 const active=useWhatIfStore(s=>s.active),serial=useWhatIfStore(s=>s.serial),auto=useWhatIfStore(s=>s.autoCompare),duration=useWhatIfStore(s=>s.options.duration),resolution=useWhatIfStore(s=>s.options.resolution),budget=useWhatIfStore(s=>s.options.maxMs),target=useSimStore(s=>s.scenario.view.targetId),revision=useSimStore(s=>s.revision),selected=useSimStore(s=>s.scenario.view.selected);
 useEffect(()=>{
  if(!active)return;const experiment=useWhatIfStore.getState();
  if(experiment.resultRevision!==revision)useWhatIfStore.setState({result:null});if(!auto&&!experiment.job){useWhatIfStore.setState({busy:false});return;}
  let worker,cancelled=false;const controller=new AbortController(),branchId=experiment.branchId;
  const timer=setTimeout(async()=>{
   try{const s=useWhatIfStore.getState(),sim=useSimStore.getState(),snapshot=structuredClone(sim.scenario),baseline=structuredClone(s.baseline),job=s.job??{type:'compare',parameters:{}};
   useWhatIfStore.setState({busy:true,error:null});
    worker=new Worker(new URL('./physics/worker.js',import.meta.url),{type:'module'});const rpc=wrap(worker),parameters={...s.options,ids:[...new Set([selected,...snapshot.bodies.filter(b=>!b.massless&&!b.disrupted).slice(0,31).map(b=>b.id)])],targetId:snapshot.view.targetId,...job.parameters};
    const result=await workerRequest(worker,()=>job.type==='sensitivity'?rpc.sensitivity(snapshot,parameters):rpc.compareExperiments(baseline,snapshot,parameters),{signal:controller.signal});
    if(!cancelled&&useWhatIfStore.getState().active&&useWhatIfStore.getState().branchId===branchId&&useSimStore.getState().revision===revision)useWhatIfStore.setState({[job.type==='sensitivity'?'sweep':'result']:result,resultRevision:revision,busy:false,job:null});
   }catch(e){if(!cancelled)useWhatIfStore.setState({busy:false,error:e.message,job:null});}finally{worker?.terminate();}
  },600);
  return()=>{cancelled=true;clearTimeout(timer);controller.abort();worker?.terminate();};
 },[active,serial,auto,duration,resolution,budget,target,revision,selected]);
}
