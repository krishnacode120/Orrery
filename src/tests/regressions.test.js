import {it,expect,afterEach,vi} from 'vitest';
import {body} from '../physics/body.js';
import {MAX_MASSIVE} from '../physics/limits.js';
import {makeDebris,debrisCapacity,source} from '../physics/debris.js';
import {godAction,mouthPair} from '../store/actions.js';
import {predict} from '../physics/prediction.js';
import {disruptTides} from '../physics/roche.js';
import {extremeEvents} from '../physics/exotic.js';
import {Engine} from '../physics/engine.js';
import {makePreset} from '../physics/catalog.js';
import {DAY,norm} from '../physics/units.js';
import {validateScenario} from '../physics/scenario.js';
import {RenderInterpolator} from '../rendering/interpolation.js';
import {api,scenarioLibrary,localExperiment} from '../persistence.js';
import {useSimStore} from '../store/useSimStore.js';
import {useWhatIfStore} from '../store/useWhatIfStore.js';
import {checkpointHistory,restoreHistory} from '../store/history.js';
afterEach(()=>vi.unstubAllGlobals());
it('fragmented test particles retain non-sourcing behavior at the massive body cap',()=>{
 const s=makePreset('empty');s.bodies=Array.from({length:MAX_MASSIVE},(_,i)=>body({id:'massive-'+i,mass:1e10,radius:1,position:[i*1e6,0,0]}));
 const tracer=body({id:'probe',mass:800,radius:2,massless:true,velocity:[1,2,3]});s.bodies.push(tracer);
 expect(debrisCapacity(s.bodies,[tracer])).toBe(64);
 const debris=makeDebris(tracer,8,[1,0,0],10,1,s.bodies);expect(debris.every(b=>b.massless&&!source(b))).toBe(true);
 expect(debris.reduce((m,b)=>m+b.mass,0)).toBeCloseTo(tracer.mass,10);s.bodies=s.bodies.filter(b=>b!==tracer).concat(debris);expect(()=>validateScenario(s)).not.toThrow();
});
it('disabling gravity disables tidal disruption and zero-radius horizon absorption',()=>{
 const s=makePreset('empty');s.settings.gMultiplier=0;s.settings.roche=true;
 const primary=body({id:'primary',mass:1e20,radius:1000,position:[0,0,0]}),small=body({id:'small',mass:1e10,radius:100,position:[2000,0,0]});
 const bodies=[primary,small],emit=vi.fn();expect(disruptTides(bodies,s.settings,emit)).toBe(bodies);
 const hole=body({id:'hole',type:'blackHole',mass:1e20,radius:1}),probe=body({id:'probe',massless:true,mass:800,radius:1});const pair=[hole,probe];
 expect(extremeEvents(pair,s.settings,new Map(),1,s.jd,emit)).toBe(pair);expect(emit).not.toHaveBeenCalled();expect(hole.radius).toBe(1);
});
it('deleting a wormhole mouth safely unlinks its pair and removes dependent mission records',()=>{
 const s=makePreset('empty');mouthPair(s,[0,0,0]);const [a,b]=s.bodies;
 s.stations=[{id:'station',name:'Station',bodyId:a.id,latitude:0,longitude:0,altitude:0,range:1e6}];godAction(s,a.id,'delete');
 expect(s.bodies).toHaveLength(1);expect(s.bodies[0].id).toBe(b.id);expect(s.bodies[0].wormhole).toBeNull();expect(s.stations).toHaveLength(0);expect(()=>validateScenario(s)).not.toThrow();
});
it('prediction rejects invalid horizons and work budgets without fabricating a one-second forecast',()=>{
 const s=makePreset('empty');for(const duration of [-1,0,NaN,Infinity])expect(()=>predict(s,{duration})).toThrow('duration');
 for(const maxMs of [-1,NaN,13000])expect(()=>predict(s,{maxMs})).toThrow('budget');
 expect(()=>predict(s,{resolution:1})).toThrow('resolution');expect(()=>predict(s,{ids:Array(33).fill('b')})).toThrow('32');
});
it('burns execute at the exact final boundary and reject invalid targets once',()=>{
 const s=makePreset('leo');s.settings.gMultiplier=0;s.settings.collisionMode='none';s.settings.roche=false;const b=s.bodies.find(b=>b.spacecraft),vx=b.velocity[0];s.maneuvers=[{id:'end',bodyId:b.id,jd:s.jd+1/DAY,deltaV:999,direction:'vector',vector:[3,0,0],executed:false}];
 const e=new Engine();e.load(s);e.advance(1);expect(e.s.maneuvers[0].executed).toBe(true);expect(e.s.maneuvers[0].actualDeltaV).toBe(3);expect(e.s.bodies.find(x=>x.id===b.id).velocity[0]).toBeCloseTo(vx+3,9);expect(e.s.events.filter(x=>x.kind==='burn')).toHaveLength(1);e.advance(1);expect(e.s.events.filter(x=>x.kind==='burn')).toHaveLength(1);
 s.maneuvers[0].bodyId='removed';s.maneuvers[0].jd=s.jd;const bad=new Engine();bad.load(s);bad.advance(1);bad.advance(1);expect(bad.s.maneuvers[0].failed).toContain('no longer exists');expect(bad.s.events.filter(x=>x.kind==='mission')).toHaveLength(1);
});
it('pause/resume cannot interpolate backwards to a pre-pause pose',()=>{
 const a={jd:2451545,bodies:[{id:'b',position:[0,0,0]}]},b={jd:2451545+1/DAY,bodies:[{id:'b',position:[100,0,0]}]},i=new RenderInterpolator();
 i.publish(a,1,0);i.publish(b,1,.1);expect(i.sample(b,{revision:1,now:.12,paused:true})).toBe(b);expect(i.sample(b,{revision:1,now:.121}).bodies[0].position[0]).toBe(100);
});
it('malformed imported views/trails and duplicate mission IDs fail before reaching rendering',()=>{
 for(const view of [{savedCameras:42},{keyframes:[null]},{trailHistory:{earth:[{jd:2451545,position:[1,2]}]}},{trailHistory:{earth:'broken'}}]){
  const s=makePreset('empty');s.view={...s.view,...view};expect(()=>validateScenario(s)).toThrow();
 }
 const s=makePreset('leo'),b=s.bodies.find(x=>x.spacecraft),n={id:'repeat',bodyId:b.id,jd:s.jd,deltaV:1,direction:'vector',vector:[1,0,0],executed:false};s.maneuvers=[n,n];expect(()=>validateScenario(s)).toThrow('Duplicate maneuver');
});
it('HTTP client supports 204 responses, non-JSON errors and explicit cancellation signals',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(new Response(null,{status:204})).mockResolvedValueOnce(new Response('<html>unavailable</html>',{status:503})).mockResolvedValueOnce(new Response('{"ok":true}',{status:200}));vi.stubGlobal('fetch',fetch);
 expect(await api('/scenarios/a',{method:'DELETE'})).toBeNull();await expect(api('/health')).rejects.toThrow('503');const c=new AbortController();expect(await api('/health',{signal:c.signal})).toEqual({ok:true});expect(fetch.mock.calls[2][1].signal).toBe(c.signal);
});
function memoryDB(){
 const data=new Map();let abort=false;
 vi.stubGlobal('indexedDB',{open:()=>{
  const request={};queueMicrotask(()=>{request.result={close(){},transaction(){
   const tx={pending:0,error:null};const operation=fn=>{const r={};tx.pending++;queueMicrotask(()=>{r.result=fn();r.onsuccess?.();tx.pending--;if(!tx.pending)queueMicrotask(()=>{if(abort){abort=false;tx.onabort?.();}else tx.oncomplete?.();});});return r;};
   tx.objectStore=()=>({put:(value,key)=>operation(()=>{data.set(key,structuredClone(value));return key;}),get:key=>operation(()=>data.get(key)),getAll:()=>operation(()=>[...data.values()]),getAllKeys:()=>operation(()=>[...data.keys()]),delete:key=>operation(()=>data.delete(key))});return tx;
  }};request.onsuccess();});return request;
 }});
 return {data,abort:()=>abort=true};
}
it('saved scenario IDs match storage keys, deletion works for legacy records, and aborts reject',async()=>{
 const db=memoryDB(),s=makePreset('empty'),id=await scenarioLibrary('save',s);expect(db.data.has('saved:'+id)).toBe(true);expect((await scenarioLibrary())[0].id).toBe(id);await scenarioLibrary('delete',null,id);expect(await scenarioLibrary()).toHaveLength(0);
 db.data.set('saved:Old name',{id:'legacy',updatedAt:new Date().toISOString(),scenario:s});await scenarioLibrary('delete',null,'legacy');expect(await scenarioLibrary()).toHaveLength(0);
 db.abort();await expect(scenarioLibrary('save',s)).rejects.toThrow('aborted');
});
it('experiment reset clears stale chaos plans and recovery preserves original pause state',async()=>{
 const db=memoryDB(),sim=useSimStore.getState(),experiment=useWhatIfStore.getState(),history=checkpointHistory();
 try{
  useSimStore.setState({scenario:makePreset('solar-now'),experimentActive:false,replayActive:false,paused:false});useWhatIfStore.getState().begin();useWhatIfStore.getState().planRandom(true);useWhatIfStore.getState().reset();expect(useWhatIfStore.getState().chaos).toHaveLength(0);
  const state=useWhatIfStore.getState();await localExperiment({baseline:state.baseline,original:state.original.scenario,experiment:useSimStore.getState().scenario,originalPaused:false});
  await expect(state.recover()).rejects.toThrow('current experiment');state.exit(false);await useWhatIfStore.getState().recover();useWhatIfStore.getState().exit(false);expect(useSimStore.getState().paused).toBe(false);
  db.data.set('whatif-session',{original:{}});await expect(useWhatIfStore.getState().recover()).rejects.toThrow();expect(useWhatIfStore.getState().active).toBe(false);
 }finally{useSimStore.setState(sim,true);useWhatIfStore.setState(experiment,true);restoreHistory(history);}
});
