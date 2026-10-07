import { Engine } from './engine.js';
import { DAY } from './units.js';
// Bounded prediction: return the actually reached horizon, never fabricated paths.
export function predict(scenario,{duration=DAY*30,resolution=120,ids=[],maxMs=1800}={}) {
  const engine=new Engine();engine.load({...scenario,mode:'sandbox',telemetry:[]});
  const chosen=ids.length?ids:scenario.bodies.filter(b=>!b.massless).slice(0,12).map(b=>b.id);
  const paths=Object.fromEntries(chosen.map(id=>[id,[]]));
  const started=performance.now(),startJD=engine.s.jd,target=Math.max(1,duration);
  let advanced=0,next=0;
  while(advanced<target && performance.now()-started<maxMs) {
    if(advanced>=next) {
      for(const id of chosen){const b=engine.s.bodies.find(x=>x.id===id);if(b)paths[id].push({jd:engine.s.jd,position:[...b.position]});}
      next+=target/Math.max(8,Math.min(512,resolution));
    }
    const result=engine.advance(Math.min(target-advanced,Math.max(1,next-advanced)));
    advanced+=result.advanced;
    if(result.advanced<=0)break;
  }
  for(const id of chosen){const b=engine.s.bodies.find(x=>x.id===id);if(b)paths[id].push({jd:engine.s.jd,position:[...b.position]});}
  return {paths,startJD,advanced,requested:target,complete:advanced>=target-1e-3,
    events:engine.s.events.filter(e=>e.jd>=startJD),elapsedMs:performance.now()-started};
}
