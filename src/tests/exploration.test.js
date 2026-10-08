import {it,expect} from 'vitest';
import {makePreset,PRESETS,MOONS} from '../physics/catalog.js';
import {viewSpace,displayRadius,scalePreset} from '../components/viewSpace.js';
import {hohmann,lambert,hyperbolicDeparture,transferPlan,sphereOfInfluence,measure} from '../physics/transfers.js';
import {deltaVBudget,applyFuelBurn,flightEvents} from '../physics/flight.js';
import {rocketMass} from '../physics/vehicles.js';
import {validateScenario} from '../physics/scenario.js';
import {G,AU,DAY,SOLAR_MASS,norm,sub,add,scale} from '../physics/units.js';
import {verlet} from '../physics/integrators.js';
import {body,DEFAULT_SETTINGS} from '../physics/body.js';
import {godAction} from '../store/actions.js';
import {Engine} from '../physics/engine.js';
it('scientific scale preserves physical radii including spacecraft without minimum-size cheating',()=>{
 const s=makePreset('leo');s.view={...s.view,...scalePreset('scientific'),scale:'system'};
 const space=viewSpace(s);for(const b of s.bodies)expect(displayRadius(b,s,space)*space.unit).toBeCloseTo(b.radius,6);
 const earth=s.bodies[0];earth.position=[30*AU,2*AU,0];s.view.scale='vehicle';s.view.selected='earth';
 const local=viewSpace(s),p=add(earth.position,[1,2,3]);expect(local.inverse(local.transform(p))).toEqual(p);
});
it('educational coordinates are reversible and never edit the physical state',()=>{
 const s=makePreset('solar-now'),before=structuredClone(s.bodies);s.view={...s.view,...scalePreset('educational')};const sp=viewSpace(s);
 for(const b of s.bodies)expect(norm(sub(sp.inverse(sp.transform(b.position)),b.position))/Math.max(norm(b.position),1)).toBeLessThan(1e-12);
 expect(s.bodies).toEqual(before);
});
it('Hohmann Earth to Mars gives approximately 259 days',()=>{
 const h=hohmann(AU,1.523679*AU,G*SOLAR_MASS);expect(h.duration/DAY).toBeCloseTo(258.86,0);expect(h.departure).toBeGreaterThan(2900);expect(h.departure).toBeLessThan(3000);
});
it('Lambert solution reproduces a quarter circular orbit and reaches its target under gravity',()=>{
 const r=1e8,mu=G*5.9722e24,t=Math.PI/2*Math.sqrt(r**3/mu),v=Math.sqrt(mu/r),solution=lambert([r,0,0],[0,r,0],t,mu);
 expect(solution.departure[0]).toBeCloseTo(0,6);expect(solution.departure[1]).toBeCloseTo(v,6);
 const bodies=[body({id:'primary',mass:5.9722e24,radius:1,locked:true}),body({id:'probe',mass:0,massless:true,radius:1,position:[r,0,0],velocity:solution.departure})];
 for(let i=0;i<4000;i++)verlet(bodies,t/4000,{...DEFAULT_SETTINGS,softening:1});
 expect(norm(sub(bodies[1].position,[0,r,0]))/r).toBeLessThan(1e-6);
 expect(Math.abs(solution.timeError)).toBeLessThan(.00001);
});
it('rocket equation burns debit fuel exactly and reject impossible maneuvers atomically',()=>{
 const b=makePreset('rocket').bodies[1],mass=b.mass,fuel=b.rocket.stages[0].fuel;
 const used=applyFuelBurn(b,[100,0,0]);expect(b.mass).toBeCloseTo(mass-used,6);expect(b.rocket.stages[0].fuel).toBeCloseTo(fuel-used,6);
 expect(b.mass).toBe(rocketMass(b.rocket));expect(deltaVBudget(b.rocket).total).toBeGreaterThan(0);
 const saved=structuredClone(b);expect(()=>applyFuelBurn(b,[1e7,0,0])).toThrow('Insufficient');expect(b).toEqual(saved);
});
it('SOI transitions update reference primary without teleporting a spacecraft',()=>{
 const s=makePreset('solar-now');s.mode='sandbox';const earth=s.bodies.find(b=>b.id==='earth'),sun=s.bodies[0],soi=sphereOfInfluence(earth,s.bodies);
 const probe=body({id:'probe',type:'spacecraft',mass:10,radius:1,massless:true,parentId:'sun',position:add(earth.position,[soi*.5,0,0]),velocity:[...earth.velocity],spacecraft:{orientation:[1,0,0]}});
 s.bodies.push(probe);const p=[...probe.position],v=[...probe.velocity],events=[];flightEvents(s,1,(...x)=>events.push(x));
 expect(probe.parentId).toBe('earth');expect(probe.position).toEqual(p);expect(probe.velocity).toEqual(v);expect(events.some(e=>e[0]==='soi')).toBe(true);
});
it('measurements use relative vectors and explicitly handle undefined angular separation',()=>{
 const a={position:[0,0,0],velocity:[1,0,0]},b={position:[3,4,0],velocity:[1,0,12]},m=measure(a,b,a,5);
 expect(m.distance).toBe(5);expect(m.relativeSpeed).toBe(12);expect(m.lightTime).toBe(1);expect(m.angle).toBe(null);
});
it('all upgraded presets and major moon systems serialize with the original scenario contract',()=>{
 for(const id of ['moon','phobos','deimos','io','europa','ganymede','callisto','titan','rhea','iapetus','enceladus','dione','titania','oberon','ariel','umbriel','miranda','triton'])expect(MOONS.some(m=>m[0]===id)).toBe(true);
 for(const p of PRESETS){const s=validateScenario(makePreset(p.id));expect(validateScenario(JSON.parse(JSON.stringify(s)))).toEqual(s);}
},30000);
it('reverse-orbit god tool changes primary-relative velocity instead of heliocentric motion',()=>{
 const s=makePreset('solar-now');s.mode='sandbox';const b=s.bodies.find(x=>x.id==='moon'),p=s.bodies.find(x=>x.id==='earth'),v=sub(b.velocity,p.velocity);godAction(s,b.id,'reverse-orbit');expect(norm(add(sub(b.velocity,p.velocity),v))).toBeLessThan(1e-8);
});
it('scheduled fuel-aware burns are applied once and report actual propellant',()=>{
 const s=makePreset('rocket'),b=s.bodies[1];b.locked=false;b.rocket.phase='coasting';b.rocket.engineOn=false;
 s.maneuvers.push({id:'burn',bodyId:b.id,jd:s.jd,deltaV:10,direction:'vector',vector:[10,0,0],executed:false,fuelAware:true});
 const e=new Engine();e.load(s);e.advance(.1);expect(e.s.maneuvers[0].executed).toBe(true);expect(e.s.maneuvers[0].propellantUsed).toBeGreaterThan(0);
 const fuel=e.s.bodies.find(x=>x.id===b.id).rocket.stages[0].fuel;e.advance(.1);expect(e.s.bodies.find(x=>x.id===b.id).rocket.stages[0].fuel).toBe(fuel);
});

it('patched-conic departure has the specified excess energy',()=>{
 const mu=G*5.9722e24,r=7e6,vinf=[0,3000,0],escape=hyperbolicDeparture([r,0,0],vinf,mu);
 expect(norm(escape.velocity)**2/2-mu/r).toBeCloseTo(norm(vinf)**2/2,4);
 expect(escape.eccentricity).toBeGreaterThan(1);expect(escape.periapsis).toBeGreaterThan(0);
});
it('a prelaunch constraint follows a moving planet in the full solar system',()=>{
 const solar=makePreset('solar-now'),launch=makePreset('rocket').bodies[1],earth=solar.bodies.find(b=>b.id==='earth');
 launch.position=add(earth.position,launch.position);launch.velocity=add(earth.velocity,launch.velocity);solar.bodies.push(launch);solar.mode='sandbox';solar.settings.stepSeconds=.25;solar.settings.roche=false;solar.settings.collisionMode='none';
 const e=new Engine();e.load(solar);const start=norm(sub(launch.position,earth.position));e.advance(1);
 const b=e.s.bodies.find(x=>x.id===launch.id),p=e.s.bodies.find(x=>x.id==='earth');expect(norm(sub(b.position,p.position))).toBeCloseTo(start,2);
});

it('invalid display multipliers cannot enter a saved scenario',()=>{
 const s=makePreset('solar-now');for(const value of [0,-1,1e7]){s.view.distanceScale=value;expect(()=>validateScenario(s)).toThrow('Invalid display scale');}
});
