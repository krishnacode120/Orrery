import {it,expect,vi,afterEach} from 'vitest';
import {startWorkerSession} from '../physics/workerSession.js';
import {workerRequest} from '../analysisWorker.js';
afterEach(()=>vi.useRealTimers());
it('a paused publication cannot acknowledge a step requested while its RPC is in flight',async()=>{
 vi.useFakeTimers();const pending=defer(),api={initialize:vi.fn().mockResolvedValue(null),advance:vi.fn().mockImplementationOnce(()=>pending.promise).mockResolvedValue(packet())},s=setup(api);
 s.onFrame.mockImplementation(frame=>{if(frame.stepped)s.store.stepRequest=false;});
 await vi.advanceTimersByTimeAsync(0);s.store.stepRequest=true;pending.resolve(packet());await vi.advanceTimersByTimeAsync(0);
 expect(s.onFrame.mock.calls[0][0].stepped).toBe(false);expect(s.store.stepRequest).toBe(true);
 await vi.advanceTimersByTimeAsync(33);expect(api.advance.mock.calls[1][0]).toBe(1);expect(s.store.stepRequest).toBe(false);s.stop();
});
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const state=()=>({revision:0,paused:true,stepRequest:false,scenario:{settings:{timeScale:1,stepSeconds:1},view:{selected:'earth'}}});
const packet=()=>({count:1,state:new Float64Array([1,2,3,4,5,6]).buffer,render:new Float32Array([1,2,3]).buffer});
function setup(api,options={}){
 const store=state(),onFrame=vi.fn(),onError=vi.fn(),terminate=vi.fn();let fault;
 const createRuntime=vi.fn(notify=>{fault=notify;return {api,terminate};});
 const stop=startWorkerSession({getState:()=>store,onFrame,onError,createRuntime,...options});
 return {store,onFrame,onError,terminate,createRuntime,stop,fault:()=>fault};
}
it('stale initialization never dispatches an advance for an edited scenario',async()=>{
 vi.useFakeTimers();const first=defer(),api={initialize:vi.fn().mockImplementationOnce(()=>first.promise).mockResolvedValue(null),advance:vi.fn().mockResolvedValue(packet())},s=setup(api);
 await vi.advanceTimersByTimeAsync(0);s.store.revision=1;first.resolve(null);await vi.advanceTimersByTimeAsync(0);await vi.advanceTimersByTimeAsync(1);
 expect(api.initialize).toHaveBeenCalledTimes(2);expect(api.advance).toHaveBeenCalledTimes(1);expect(s.onError).not.toHaveBeenCalled();s.stop();
});
it('an old RPC rejection cannot fail or poison the next edited revision',async()=>{
 vi.useFakeTimers();const pending=defer(),api={initialize:vi.fn().mockResolvedValue(null),advance:vi.fn().mockImplementationOnce(()=>pending.promise).mockResolvedValue(packet())},s=setup(api);
 await vi.advanceTimersByTimeAsync(0);s.store.revision=1;pending.reject(new Error('old error'));await vi.advanceTimersByTimeAsync(1);
 expect(s.onError).not.toHaveBeenCalled();expect(s.onFrame).toHaveBeenCalledTimes(1);expect(s.createRuntime).toHaveBeenCalledTimes(2);s.stop();
});
it('pause during initialization is read before evolution and stop cancels pending dispatch',async()=>{
 vi.useFakeTimers();const init=defer(),api={initialize:vi.fn().mockImplementation(()=>init.promise),advance:vi.fn().mockResolvedValue(packet())},s=setup(api);s.store.paused=false;
 await vi.advanceTimersByTimeAsync(0);s.store.paused=true;init.resolve(null);await vi.advanceTimersByTimeAsync(0);expect(api.advance.mock.calls[0][0]).toBe(0);s.stop();
 const next=defer(),other=setup({initialize:()=>next.promise,advance:api.advance});await vi.advanceTimersByTimeAsync(0);other.stop();next.resolve(null);await vi.advanceTimersByTimeAsync(100);expect(api.advance).toHaveBeenCalledTimes(1);
});
it('worker crash and timeout terminate the runtime and allow recovery after an edit',async()=>{
 vi.useFakeTimers();const api={initialize:vi.fn().mockResolvedValue(null),advance:vi.fn().mockImplementation(()=>new Promise(()=>{}))},s=setup(api,{timeoutMs:50});
 await vi.advanceTimersByTimeAsync(0);s.fault()(new Error('module failed'));await vi.advanceTimersByTimeAsync(0);expect(s.onError).toHaveBeenCalledTimes(1);expect(s.terminate).toHaveBeenCalledTimes(1);
 s.store.revision++;await vi.advanceTimersByTimeAsync(100);await vi.advanceTimersByTimeAsync(50);expect(s.onError).toHaveBeenCalledTimes(2);expect(s.onError.mock.calls[1][0]).toContain('timed out');s.stop();
});
it('completed shared frames are copied before the next dispatch and stale frames are discarded',async()=>{
 vi.useFakeTimers();const buffers={state:new SharedArrayBuffer(48),render:new SharedArrayBuffer(12)},pending=defer(),api={initialize:async()=>buffers,advance:vi.fn().mockImplementationOnce(()=>{new Float64Array(buffers.state).set([1,2,3,4,5,6]);return {count:1};}).mockImplementation(()=>pending.promise)},s=setup(api,{shared:true});
 await vi.advanceTimersByTimeAsync(0);new Float64Array(buffers.state)[0]=99;expect(s.onFrame.mock.calls[0][0].state[0]).toBe(1);
 await vi.advanceTimersByTimeAsync(33);s.store.revision++;pending.resolve({count:1});await vi.advanceTimersByTimeAsync(0);expect(s.onFrame).toHaveBeenCalledTimes(1);s.stop();
});
it('analysis failures, cancellation and stalled RPCs reject and terminate instead of hanging',async()=>{
 vi.useFakeTimers();class Worker extends EventTarget{terminate=vi.fn();}
 const w=new Worker(),pending=workerRequest(w,()=>new Promise(()=>{}));w.dispatchEvent(new Event('error'));await expect(pending).rejects.toThrow('failed');expect(w.terminate).toHaveBeenCalledTimes(1);
 const c=new AbortController(),cancelled=new Worker(),job=workerRequest(cancelled,()=>new Promise(()=>{}),{signal:c.signal});c.abort();await expect(job).rejects.toThrow('cancelled');
 const stalled=new Worker(),timeout=workerRequest(stalled,()=>new Promise(()=>{}),{timeoutMs:10});const check=expect(timeout).rejects.toThrow('timed out');await vi.advanceTimersByTimeAsync(10);await check;expect(stalled.terminate).toHaveBeenCalledTimes(1);
});

it("catalog navigation stops worker evolution and discards in-flight physics frames",async()=>{
 vi.useFakeTimers();const pending=defer(),api={initialize:vi.fn().mockResolvedValue(null),advance:vi.fn().mockImplementation(()=>pending.promise)},s=setup(api);
 await vi.advanceTimersByTimeAsync(0);s.store.catalogActive=true;s.store.revision++;pending.resolve(packet());await vi.advanceTimersByTimeAsync(100);expect(s.onFrame).not.toHaveBeenCalled();expect(api.advance).toHaveBeenCalledTimes(1);expect(s.onError).not.toHaveBeenCalled();s.stop();
});
