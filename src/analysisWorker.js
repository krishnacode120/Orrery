// Reject failed/stalled worker RPCs instead of leaving prediction UI busy forever.
// The caller owns creation; this helper owns cancellation and final termination.
export async function workerRequest(worker,invoke,{signal,timeoutMs=20000}={}){
 let deadline,abort;
 const fail=event=>abort(new Error(event?.message||'Analysis worker failed to load or decode a message'));
 const cancelled=()=>abort(new Error('Analysis cancelled'));
 const failure=new Promise((_,reject)=>{abort=reject;});
 worker.addEventListener('error',fail);worker.addEventListener('messageerror',fail);
 signal?.addEventListener('abort',cancelled,{once:true});
 deadline=setTimeout(()=>abort(new Error('Analysis worker timed out')),timeoutMs);
 if(signal?.aborted)cancelled();
 try{return await Promise.race([Promise.resolve().then(invoke),failure]);}
 finally{clearTimeout(deadline);signal?.removeEventListener('abort',cancelled);worker.removeEventListener('error',fail);worker.removeEventListener('messageerror',fail);worker.terminate();}
}
