import {Engine} from './engine.js';
import {AU} from './units.js';
import {MAX_BODIES} from './limits.js';
import {GPUGravity,advanceWithGPU} from './gpuGravity.js';
// One RPC owns one publication; SAB readers only consume completed revisions.
export function createWorkerCore(){
 const engine=new Engine(),gpu=new GPUGravity();let state,render,shared=false,sentTopology=-1,sentEvents=-1,sentTelemetry=-1,probed=false,missionCredit=0,lastDirection=0;
 function publish(stats,selectedId){
  const bodies=engine.s.bodies,count=bodies.length,origin=bodies.find(b=>b.id==='sun')?.position??[0,0,0];
  bodies.forEach((b,i)=>{state.set(b.position,i*6);state.set(b.velocity,i*6+3);render.set([(b.position[0]-origin[0])/AU*4,(b.position[2]-origin[2])/AU*4,-(b.position[1]-origin[1])/AU*4],i*3);});
  const result={jd:engine.s.jd,stats,count,eventSerial:engine.s.eventSerial,topologyRevision:engine.topologyRevision,
   dynamic:bodies.filter(b=>b.rocket||b.spacecraft||b.id===selectedId).map(b=>({id:b.id,mass:b.mass,rocket:b.rocket,spacecraft:b.spacecraft,acceleration:b.acceleration,locked:b.locked,parentId:b.parentId,metadata:b.metadata})),
   maneuvers:engine.s.maneuvers,experimentEvents:engine.s.experimentEvents,settings:engine.s.settings};
  if(sentTelemetry!==engine.telemetryVersion){result.telemetry=engine.s.telemetry;sentTelemetry=engine.telemetryVersion;}
  if(sentTopology!==engine.topologyRevision){result.bodies=bodies.map(({position,velocity,...metadata})=>metadata);sentTopology=engine.topologyRevision;}
  if(sentEvents!==engine.s.eventSerial){result.events=structuredClone(engine.s.events);sentEvents=engine.s.eventSerial;}
  if(!shared){result.state=state.slice(0,count*6).buffer;result.render=render.slice(0,count*3).buffer;}return result;
 }
 return {
  initialize(scenario,useShared){engine.load(scenario);missionCredit=0;lastDirection=0;shared=useShared&&typeof SharedArrayBuffer!=='undefined';const Buffer=shared?SharedArrayBuffer:ArrayBuffer;
   state=new Float64Array(new Buffer(MAX_BODIES*6*8));render=new Float32Array(new Buffer(MAX_BODIES*3*4));sentTopology=-1;sentEvents=-1;sentTelemetry=-1;
   return shared?{state:state.buffer,render:render.buffer}:null;},
  advance(seconds,selectedId){if(selectedId!==undefined)engine.selectedId=selectedId;return publish(engine.advance(seconds),selectedId);},
  async advanceAsync(seconds,selectedId){
   if(selectedId!==undefined)engine.selectedId=selectedId;
   if(!probed&&engine.s.settings.computeMode!=='cpu'){probed=true;await gpu.initialize();}
   // Vehicle execution uses state-dependent logical quanta, never a render-sized remainder.
   if(engine.s.mode==='sandbox'&&engine.s.bodies.some(b=>b.rocket||b.spacecraft)&&seconds!==0){
    const direction=Math.sign(seconds);if(direction!==lastDirection){missionCredit=0;lastDirection=direction;}missionCredit+=Math.abs(seconds);
    const started=performance.now();let advanced=0,stats=null,quantum;
    do{const local=engine.s.bodies.some(b=>(b.rocket||b.spacecraft)&&b.parentId!=='sun'),powered=engine.s.bodies.some(b=>b.rocket?.engineOn||(b.rocket??b.spacecraft)?.rcs||(b.rocket??b.spacecraft)?.attitude?.mode==='rigid'||b.spacecraft?.aerodynamics);
     quantum=Math.min(engine.s.settings.stepSeconds,powered?.25:local?1:1800);
     if(missionCredit+1e-10<quantum)break;
     stats=engine.advance(direction*quantum,{deterministic:true,maxSteps:512});if(!stats.advanced)break;
     missionCredit=Math.max(0,missionCredit-Math.abs(stats.advanced));advanced+=stats.advanced;
    }while(performance.now()-started<12);
    stats??=engine.advance(0);return publish({...stats,advanced,limited:missionCredit>=quantum,logicalQuantum:quantum,backlogSeconds:missionCredit,computeMode:'Worker CPU · logical mission clock',computeMs:performance.now()-started},selectedId);
   }
   return publish(await advanceWithGPU(engine,seconds,gpu),selectedId);
  }
 };
}
