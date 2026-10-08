import { Engine } from './engine.js';
import { DAY } from './units.js';
// Bounded prediction: return the actually reached horizon, never fabricated paths.
export function predict(scenario,{duration=DAY*30,resolution=120,ids=[],maxMs=1800,targetId=scenario.view?.targetId}={}) {
  if(!Number.isFinite(duration)||duration<=0||duration>DAY*365.25*1000)throw new Error('Prediction duration must be positive and at most 1,000 years');
  if(!Number.isFinite(resolution)||resolution<8||resolution>512)throw new Error('Prediction resolution must be between 8 and 512');
  if(!Number.isFinite(maxMs)||maxMs<=0||maxMs>12000)throw new Error('Prediction budget must be positive and at most 12 seconds');
  if(!Array.isArray(ids)||ids.length>32||ids.some(id=>typeof id!=='string'))throw new Error('Prediction supports at most 32 body IDs');
  const engine=new Engine();engine.load({...scenario,mode:'sandbox',telemetry:[]});
  if(targetId&&ids[0]&&targetId!==ids[0]&&scenario.bodies.some(b=>b.id===targetId))engine.encounterPair=[ids[0],targetId];
  const chosen=ids.length?ids:scenario.bodies.filter(b=>!b.massless).slice(0,12).map(b=>b.id);
  const paths=Object.fromEntries(chosen.map(id=>[id,[]]));
  const started=performance.now(),startJD=engine.s.jd,target=duration;
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
    closestApproach:engine.encounter,events:engine.s.events.filter(e=>e.jd>=startJD),elapsedMs:performance.now()-started};
}
