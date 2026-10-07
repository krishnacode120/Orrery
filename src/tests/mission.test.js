import {it,expect} from 'vitest';
import {makePreset} from '../physics/catalog.js';
import {Engine} from '../physics/engine.js';
import {vehicleTelemetry,stationPosition,earthFixed,lineOfSight,rocketMass,burnVector} from '../physics/vehicles.js';
import {DAY,norm,sub} from '../physics/units.js';
it('ground station coordinate conversion and occultation are consistent',()=>{
 const s=makePreset('leo'),earth=s.bodies[0],station={latitude:40,longitude:-75,altitude:10},position=stationPosition(station,earth,s.jd),fixed=earthFixed(position,s.jd);
 expect(fixed.latitude).toBeCloseTo(40,8);expect(fixed.longitude).toBeCloseTo(-75,8);
 expect(lineOfSight([earth.radius*2,0,0],[-earth.radius*2,0,0],[earth])).toBe('blocked');
 expect(lineOfSight([earth.radius*2,0,0],[earth.radius*3,0,0],[earth],1)).toBe('out-of-range');
});
it('LEO and GEO survive propagation; maneuvers alter the orbit at their epoch',()=>{
 for(const id of ['leo','geo']){const engine=new Engine();engine.load(makePreset(id));const b=engine.s.bodies[1],initial=vehicleTelemetry(b,engine.s.bodies[0],engine.s.jd,engine.s.settings);let time=0;
 while(time<initial.elements.period){const d=engine.advance(Math.min(600,initial.elements.period-time));time+=d.advanced;}
 const final=vehicleTelemetry(engine.s.bodies[1],engine.s.bodies[0],engine.s.jd,engine.s.settings);
 expect(Math.abs(final.elements.a/initial.elements.a-1)).toBeLessThan(1e-5);
 }
 const engine=new Engine(),s=makePreset('leo');s.maneuvers.push({id:'m',bodyId:'sat-0',jd:s.jd+30/DAY,deltaV:100,direction:'prograde',vector:[0,0,0],executed:false});engine.load(s);
 for(let i=0;i<10;i++)engine.advance(10);expect(engine.s.maneuvers[0].executed).toBe(true);expect(engine.s.events.some(e=>e.kind==='burn')).toBe(true);
},30000);
it('two-stage launch uses fuel and staging to reach a bound orbit, then deploys payload',()=>{
 const s=makePreset('rocket');s.bodies[1].locked=false;s.bodies[1].rocket.phase='ignition';s.bodies[1].rocket.engineOn=true;
 const engine=new Engine();engine.load(s);let elapsed=0;while(elapsed<2000){const result=engine.advance(30);elapsed+=result.advanced;const r=engine.s.bodies.find(b=>b.rocket).rocket;if(['orbital insertion','crashed','fuel exhausted'].includes(r.phase))break;}
 const b=engine.s.bodies.find(b=>b.rocket),t=vehicleTelemetry(b,engine.s.bodies[0],engine.s.jd,engine.s.settings);
 console.log('Launch outcome',{phase:b.rocket.phase,met:b.rocket.met,altitude:t.altitude,periapsis:t.periapsis,apoapsis:t.apoapsis,fuel:t.propellant,stage:b.rocket.stage});
 expect(b.rocket.separations).toHaveLength(1);expect(t.propellant).toBeLessThan(487000);expect(b.mass).toBeCloseTo(rocketMass(b.rocket),5);
 expect(b.rocket.phase).toBe('orbital insertion');expect(t.periapsis).toBeGreaterThan(160000);expect(t.elements.e).toBeLessThan(.08);
 b.rocket.deployRequested=true;engine.advance(1);expect(engine.s.bodies.some(b=>b.type==='satellite')).toBe(true);expect(b.rocket.phase).toBe('complete');
},30000);
