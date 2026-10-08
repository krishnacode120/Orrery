import {wrap} from 'comlink';
import {startWorkerSession} from './workerSession.js';

export function connectWorker(getState,onFrame,onError){
 const shared=globalThis.crossOriginIsolated&&typeof SharedArrayBuffer!=='undefined'
  &&!new URLSearchParams(location.search).has('fallback');
 return startWorkerSession({getState,onFrame,onError,shared,createRuntime:onFault=>{
  const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
  worker.onerror=event=>onFault(new Error(event.message||'Physics worker failed'));
  worker.onmessageerror=()=>onFault(new Error('Physics worker message could not be decoded'));
  return {api:wrap(worker),terminate:()=>worker.terminate()};
 }});
}
