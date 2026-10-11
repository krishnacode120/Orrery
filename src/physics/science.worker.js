import {benchmarkGPU} from './gpuBenchmark.js';
import {runReferenceMission} from './referenceMission.js';
import {replayMissionTape,compareReplay} from './deterministic.js';
import {porkchop,benchmarkScenario,missionUncertainty,stressScenario} from './scientific.js';
self.onmessage=async({data})=>{
 const {id,job,payload}=data,progress=value=>self.postMessage({id,progress:value});
 try{
  let result;
  if(job==='reference')result=await runReferenceMission({progress,yieldTask:()=>new Promise(resolve=>setTimeout(resolve,0))});
  else if(job==='replay'){const final=replayMissionTape(payload.tape);result=compareReplay(payload.final,final);}
  else if(job==='gpu')result=await benchmarkGPU(payload.count);
  else if(job==='windows')result=porkchop(payload);
  else if(job==='benchmark')result=benchmarkScenario(payload.scenario??stressScenario(payload.count),payload.options);
  else if(job==='uncertainty')result=missionUncertainty(payload.result,payload.options);
  else throw new Error('Unknown scientific job');
  self.postMessage({id,result});
 }catch(error){self.postMessage({id,error:error.message});}
};
