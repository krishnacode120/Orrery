import { Engine } from './engine.js';
import { AU } from './units.js';
import { MAX_BODIES } from './limits.js';

// Pure/headless-testable publisher. Buffer capacity stays fixed across topology
// changes; count and ordered metadata belong to the same completed frame.
export function createWorkerCore() {
  const engine=new Engine();let state,render,shared=false,sentTopology=-1,sentEvents=-1,sentTelemetry=-1;
  return {
    initialize(scenario,useShared) {
      engine.load(scenario);shared=useShared && typeof SharedArrayBuffer!=='undefined';
      const Buffer=shared?SharedArrayBuffer:ArrayBuffer;
      state=new Float64Array(new Buffer(MAX_BODIES*6*8));render=new Float32Array(new Buffer(MAX_BODIES*3*4));
      sentTopology=-1;sentEvents=-1;sentTelemetry=-1;
      return shared?{state:state.buffer,render:render.buffer}:null;
    },
    advance(seconds,selectedId) {
      if(selectedId!==undefined)engine.selectedId=selectedId;
      const stats=engine.advance(seconds),bodies=engine.s.bodies,count=bodies.length;
      const origin=bodies.find(b=>b.id==='sun')?.position??[0,0,0];
      bodies.forEach((b,i)=>{
        state.set(b.position,i*6);state.set(b.velocity,i*6+3);
        render.set([(b.position[0]-origin[0])/AU*4,(b.position[2]-origin[2])/AU*4,-(b.position[1]-origin[1])/AU*4],i*3);
      });
      const result={jd:engine.s.jd,stats,count,eventSerial:engine.s.eventSerial,topologyRevision:engine.topologyRevision,
        dynamic:bodies.filter(b=>b.rocket||b.spacecraft||b.id===selectedId).map(b=>({id:b.id,mass:b.mass,rocket:b.rocket,spacecraft:b.spacecraft,acceleration:b.acceleration,locked:b.locked,parentId:b.parentId,metadata:b.metadata})),
        maneuvers:engine.s.maneuvers,experimentEvents:engine.s.experimentEvents,settings:engine.s.settings};
      if(sentTelemetry!==engine.telemetryVersion){result.telemetry=engine.s.telemetry;sentTelemetry=engine.telemetryVersion;}
      if(sentTopology!==engine.topologyRevision) {
        result.bodies=bodies.map(({position,velocity,...metadata})=>metadata);
        sentTopology=engine.topologyRevision;
      }
      if(sentEvents!==engine.s.eventSerial) {result.events=structuredClone(engine.s.events);sentEvents=engine.s.eventSerial;}
      if(!shared){result.state=state.slice(0,count*6).buffer;result.render=render.slice(0,count*3).buffer;}
      return result;
    },
  };
}
