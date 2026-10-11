import {it,expect} from 'vitest';
import {Engine} from '../physics/engine.js';
import {landingScenario,reentryScenario} from '../physics/flightScenarios.js';
import {validateScenario} from '../physics/scenario.js';
it.each(['moon','mars'])('%s thrust landing reaches a bounded touchdown without velocity teleportation',target=>{
 const e=new Engine();e.load(landingScenario(target));const b=e.s.bodies.find(x=>x.rocket),initialFuel=b.rocket.stages[0].fuel;
 let time=0;while(time<1600&&!b.locked){const stats=e.advance(30,{deterministic:true,maxSteps:120});time+=stats.advanced;}
 console.log(target,{phase:b.rocket.phase,fuel:b.rocket.stages[0].fuel,event:e.s.events.at(-1)});
 expect(b.rocket.phase).toBe('landed');expect(b.rocket.stages[0].fuel).toBeLessThan(initialFuel);expect(b.rocket.stages[0].fuel).toBeGreaterThan(0);expect(e.s.events.some(x=>x.kind==='landing')).toBe(true);
},30000);
it('entry records atmosphere, drag and heating from actual velocity',()=>{
 const e=new Engine();e.load(reentryScenario());const b=e.s.bodies[1];for(let i=0;i<20;i++)e.advance(1,{deterministic:true});
 expect(b.spacecraft.atmosphericFlight.q).toBeGreaterThan(0);expect(b.spacecraft.atmosphericFlight.heatingProxy).toBeGreaterThan(0);expect(b.spacecraft.atmosphericFlight.deceleration).toBeGreaterThan(0);
});
it('schema migration rejects negative new engine parameters and invalid attitude',()=>{
 const s=landingScenario();s.version=1;delete s.schemaVersion;expect(validateScenario(s).schemaVersion).toBe(2);
 s.bodies[1].rocket.stages[0].seaLevelIsp=-1;expect(()=>validateScenario(s)).toThrow(/engine/);delete s.bodies[1].rocket.stages[0].seaLevelIsp;
 s.bodies[1].rocket.attitude={mode:'rigid',quaternion:[0,0,0,0]};expect(()=>validateScenario(s)).toThrow(/quaternion/);
});
