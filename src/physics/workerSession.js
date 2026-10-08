import {MAX_BODIES} from './limits.js';

// One RPC owns the buffers until it resolves. Errors belong to the revision
// that dispatched the request, never whichever scenario the user edited next.
export function startWorkerSession({createRuntime,getState,onFrame,onError,shared=false,timeoutMs=20000,
 now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}){
 let stopped=false,timer,runtime=null,token=null,revision=-1,failedRevision=null,buffers=null,last=now(),pending=null;
 const dispose=()=>{runtime?.terminate();runtime=null;token=null;revision=-1;buffers=null;};
 const fault=error=>{
  if(pending){pending.reject(error);return;}
  const owner=revision;dispose();
  if(!stopped&&getState().revision===owner&&!getState().replayActive){failedRevision=owner;onError(error.message);}
 };
 const request=async(method,args)=>{
  let rejectRequest,deadline;
  const failure=new Promise((_,reject)=>{rejectRequest=reject;});
  pending={reject:rejectRequest};
  deadline=schedule(()=>rejectRequest(new Error('Physics worker timed out')),timeoutMs);
  try{return await Promise.race([Promise.resolve().then(()=>runtime.api[method](...args)),failure]);}
  finally{cancel(deadline);pending=null;}
 };
 async function tick(){
  if(stopped)return;
  let owner=getState().revision,nextDelay=33;
  try{
   let current=getState();
   if(current.replayActive||failedRevision===owner){last=now();nextDelay=100;return;}
   if(!runtime){
    const identity={};token=identity;
    runtime=createRuntime(error=>{if(token===identity)fault(error instanceof Error?error:new Error(String(error)));});
   }
   if(revision!==owner){
    const initialized=await request('initialize',[current.scenario,shared]);
    if(stopped)return;
    buffers=initialized;revision=owner;last=now();
   }
   current=getState();
   if(current.replayActive||current.revision!==owner){nextDelay=0;return;}
   const time=now(),seconds=current.stepRequest?Math.sign(current.scenario.settings.timeScale)*current.scenario.settings.stepSeconds:
    current.paused?0:Math.min((time-last)/1000,.1)*current.scenario.settings.timeScale;
   last=time;
   const result=await request('advance',[seconds,current.scenario.view?.selected]);
   const fresh=getState();
   if(stopped||fresh.replayActive||fresh.revision!==owner)return;
   const count=result.count;
   if(!Number.isInteger(count)||count<0||count>MAX_BODIES)throw new Error('Invalid worker body count');
   const state=new Float64Array(buffers?.state??result.state),render=new Float32Array(buffers?.render??result.render);
   if(state.length<count*6||render.length<count*3)throw new Error('Incomplete worker buffers');
   onFrame({...result,state:state.slice(0,count*6),render:render.slice(0,count*3),transport:shared?'Shared memory':'Transferable messages'});
  }catch(error){
   dispose();
   if(!stopped&&getState().revision===owner&&!getState().replayActive){
    failedRevision=owner;onError(error.message+'. Edit a parameter or return to Reality to retry.');
    nextDelay=100;
   }else nextDelay=0;
  }finally{if(!stopped)timer=schedule(tick,nextDelay);}
 }
 timer=schedule(tick,0);
 return ()=>{stopped=true;cancel(timer);pending?.reject(new Error('Worker session stopped'));dispose();};
}
