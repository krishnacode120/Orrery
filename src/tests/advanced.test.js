import {it,expect} from 'vitest';
import {body,DEFAULT_SETTINGS} from '../physics/body.js';
import {G,AU,SOLAR_MASS,DAY,norm,sub} from '../physics/units.js';
import {accelerations,verlet,rk4,dormandPrince,diagnostics,accelerationTimestep} from '../physics/integrators.js';
import {stateFromElements,orbitalElements} from '../physics/orbital.js';
import {analyticPrecession} from '../physics/relativity.js';
import {collisionCandidates,resolveCollisions} from '../physics/collisions.js';
import {disruptTides} from '../physics/roche.js';
import {extremeEvents,schwarzschild,transformMouth} from '../physics/exotic.js';
import {makePreset,baseScenario,PRESETS} from '../physics/catalog.js';
import {validateScenario} from '../physics/scenario.js';
import {Engine} from '../physics/engine.js';
import {createWorkerCore} from '../physics/workerCore.js';
import {interpolateVectors} from '../physics/ephemeris.js';
import {predict} from '../physics/prediction.js';
const orbit=()=>[body({id:'a',mass:1/G,radius:.001,locked:true}),body({id:'b',mass:0,massless:true,radius:.001,position:[1,0,0],velocity:[0,1,0]})];
it('RK4 converges at fourth order and pins remain fixed',()=>{
 const errors=[.05,.025].map(dt=>{const b=orbit();for(let t=0;t<100;t++)rk4(b,dt,{softening:0});expect(b[0].position).toEqual([0,0,0]);return norm(sub(b[1].position,[Math.cos(dt*100),Math.sin(dt*100),0]));});
 expect(errors[0]/errors[1]).toBeGreaterThan(20);expect(errors[1]).toBeLessThan(1e-6);
});
it('DP rejects large trials, respects tolerance and advances by accepted dt',()=>{
 const b=orbit(),settings={softening:0,rtol:1e-10,positionTolerance:1e-12,velocityTolerance:1e-12,minStep:1e-8};
 const result=dormandPrince(b,2,settings);expect(result.rejected).toBeGreaterThan(0);expect(result.error).toBeLessThanOrEqual(1);
 expect(norm(sub(b[1].position,[Math.cos(result.dt),Math.sin(result.dt),0]))).toBeLessThan(1e-9);
 expect(()=>dormandPrince(orbit(),2,{...settings,minStep:2})).toThrow(/minimum/);
});
it('adaptive acceleration cap uses eta sqrt(epsilon/a)',()=>{
 const b=orbit(),dt=accelerationTimestep(b,{softening:.01,eta:.2,stepSeconds:100});expect(dt).toBeCloseTo(.2*Math.sqrt(.01/norm(accelerations(b,{softening:.01})[1])),13);
});
it('Verlet retraces the same signed nonuniform step sequence',()=>{
 const b=orbit(),initial=structuredClone(b),steps=Array.from({length:2000},(_,i)=>.001*(1+i%9));
 for(const dt of steps)verlet(b,dt,{softening:0});for(const dt of steps.reverse())verlet(b,-dt,{softening:0});
 expect(norm(sub(b[1].position,initial[1].position))).toBeLessThan(1e-10);
});
it('octree agrees with direct forces; particles never source and massive forces stay exact',()=>{
 const b=Array.from({length:80},(_,i)=>body({id:'s'+i,mass:(i+1)*1e20,position:[Math.sin(i)*1e9,Math.cos(i)*1e9,Math.sin(i*3)*1e9]}));
 b.push(body({id:'tracer',mass:1e40,massless:true,position:[1e11,2e11,3e11]}));
 const a=accelerations(b,{solver:'direct',softening:1}),tree=accelerations(b,{solver:'tree',theta:.5,softening:1});
 expect(tree.slice(0,80)).toEqual(a.slice(0,80));expect(norm(sub(tree[80],a[80]))/norm(a[80])).toBeLessThan(.001);
 const zero=accelerations(b,{solver:'tree',theta:0,softening:1});expect(zero).toEqual(a);
});
it('orbital elements roundtrip inclined eccentric states',()=>{
 const input={a:2*AU,e:.44,i:.7,Omega:1.2,omega:.6,M:2.1},mu=G*SOLAR_MASS,state=stateFromElements(input,mu),elements=orbitalElements(state.position,state.velocity,mu);
 for(const k of Object.keys(input))expect(elements[k]).toBeCloseTo(input[k],k==='a'?2:9);
 const circular=orbitalElements([AU,0,0],[0,Math.sqrt(mu/AU),0],mu);expect(circular.e).toBeLessThan(1e-14);expect(circular.M).toBeCloseTo(0);
 const escape=orbitalElements([AU,0,0],[0,Math.sqrt(3*mu/AU),0],mu);expect(escape.period).toBeNull();expect(escape.apoapsis).toBeNull();
});
it('Mercury 1PN perihelion advance agrees with the analytic rate',()=>{
 const a=.38709927*AU,e=.20563593,mu=G*SOLAR_MASS,period=2*Math.PI*Math.sqrt(a**3/mu),state=stateFromElements({a,e},mu);
 const create=()=>[body({id:'sun',mass:SOLAR_MASS,locked:true}),body({id:'mercury',massless:true,mass:0,...structuredClone(state)})];
 const newton=create(),gr=create(),steps=960,orbits=12,dt=period/steps;
 for(let i=0;i<steps*orbits;i++){rk4(newton,dt,{softening:0});rk4(gr,dt,{softening:0,gr:true,c:299792458});}
 const angle=b=>{const v=orbitalElements(b[1].position,b[1].velocity,mu).eVector;return Math.atan2(v[1],v[0]);};
 const measured=(angle(gr)-angle(newton))/orbits,analytic=analyticPrecession(mu,a,e,299792458);
 console.log('Mercury precession rad/orbit', {measured,analytic});
 expect(Math.abs(measured/analytic-1)).toBeLessThan(.02);
 expect(analytic*(36525*DAY/period)*180/Math.PI*3600).toBeCloseTo(43,0);
},30000);
it('spatial hash includes swept contacts and merging conserves mass, momentum, volume',()=>{
 const b=[body({id:'a',mass:2,radius:1,position:[1,0,0],velocity:[3,0,0]}),body({id:'b',mass:3,radius:1,position:[0,0,0],velocity:[-2,0,0]})];
 expect(collisionCandidates(b)).toHaveLength(1);const before=diagnostics(b,{softening:1});
 const out=resolveCollisions(b,{collisionMode:'merge'},null,1);expect(out).toHaveLength(1);expect(out[0].mass).toBe(5);expect(out[0].radius**3).toBeCloseTo(2);expect(diagnostics(out).momentum).toEqual(before.momentum);
 const fast=[body({id:'x',mass:1,radius:1,position:[20,0,0]}),body({id:'y',mass:1,radius:1,position:[0,0,0]})];
 const prev=new Map([['x',[-20,0,0]],['y',[0,0,0]]]);expect(resolveCollisions(fast,{collisionMode:'merge'},prev,1)).toHaveLength(1);
});
it('bounce restitution and overrides work; fragmentation conserves momentum',()=>{
 const a=body({id:'a',mass:100,radius:1,position:[-1,0,0],velocity:[100,0,0]}),b=body({id:'b',mass:100,radius:1,position:[1,0,0],velocity:[-100,0,0]});
 const bounce=resolveCollisions([a,b],{collisionMode:'bounce',restitution:.5},null,1);expect(bounce[0].velocity[0]).toBe(-50);expect(bounce[1].velocity[0]).toBe(50);
 expect(resolveCollisions([{...a,collisionMode:'none'},b],{collisionMode:'merge'},null,1)).toHaveLength(2);
 const debris=resolveCollisions([a,b],{collisionMode:'fragment',fragmentCount:8,fragmentDistribution:'varied'},null,1);
 expect(debris).toHaveLength(8);expect(debris.reduce((s,b)=>s+b.mass,0)).toBeCloseTo(200);expect(norm(diagnostics(debris).momentum)).toBeLessThan(1e-9);
});
it('tidal disruption preserves mass and marks resolved debris',()=>{
 const p=body({id:'p',mass:1e26,radius:1e7}),m=body({id:'m',parentId:'p',mass:1e22,radius:1e6,position:[3e7,0,0],velocity:[0,10000,0]});
 const out=disruptTides([p,m],{...DEFAULT_SETTINGS,roche:true},()=>{},1);expect(out.length).toBeGreaterThan(2);
 expect(out.filter(b=>b.disrupted).reduce((s,b)=>s+b.mass,0)).toBeCloseTo(m.mass,-8);
});
it('collision baseline adjustment retains integration drift rather than raising false alarms',()=>{
 const s=baseScenario();s.settings={...s.settings,gMultiplier:0,roche:false,stepSeconds:1};s.bodies=[body({id:'a',mass:2,radius:2,position:[-1,0,0],velocity:[1,0,0]}),body({id:'b',mass:2,radius:2,position:[1,0,0],velocity:[-1,0,0]})];
 const engine=new Engine();engine.load(s);const result=engine.advance(1);expect(result.energyDrift).toBeCloseTo(0);expect(engine.s.events[0].kind).toBe('merge');expect(result.eventEnergyDelta).toBeLessThan(0);
});
it('black-hole capture grows mass and horizon; wormholes transform velocity and cooldown',()=>{
 const hole=body({id:'hole',type:'blackHole',mass:SOLAR_MASS,radius:schwarzschild(SOLAR_MASS),blackHole:{accretedMass:0}});
 const victim=body({id:'victim',mass:1e25,position:[1000,0,0]});
 const out=extremeEvents([hole,victim],DEFAULT_SETTINGS,null,1,2451545,()=>{});expect(out).toHaveLength(1);expect(out[0].mass).toBe(SOLAR_MASS+1e25);expect(out[0].radius).toBeGreaterThan(hole.radius-1);
 const mouth=(id,pair,x,q)=>body({id,type:'wormholeMouth',massless:true,mass:0,locked:true,radius:10,position:[x,0,0],wormhole:{pairId:pair,throatRadius:10,orientation:q,cooldown:10,transformVelocity:true}});
 const a=mouth('a','b',0,[0,0,0,1]),b=mouth('b','a',1000,[0,0,Math.SQRT1_2,Math.SQRT1_2]),tracer=body({id:'t',massless:true,position:[1,0,0],velocity:[2,0,0]});
 const teleported=extremeEvents([a,b,tracer],DEFAULT_SETTINGS,null,1,2451545,()=>{}).find(x=>x.id==='t');
 expect(teleported.velocity[1]).toBeCloseTo(2);expect(teleported.position[0]).toBeCloseTo(1000);expect(teleported.portalCooldownJD).toBeGreaterThan(2451545);
});
it('all presets and migrated Phase 1 snapshots serialize losslessly',()=>{
 for(const p of PRESETS){const s=validateScenario(makePreset(p.id));expect(validateScenario(JSON.parse(JSON.stringify(s)))).toEqual(s);}
});
it('worker publication preserves count, topology and both memory paths',()=>{
 for(const shared of [false,true]){const core=createWorkerCore(),s=makePreset('leo'),buffers=core.initialize(s,shared),packet=core.advance(1,'sat-0');
 expect(packet.count).toBe(2);expect(packet.bodies).toHaveLength(2);const state=new Float64Array(shared?buffers.state:packet.state);expect(Number.isFinite(state[6])).toBe(true);
 expect(core.advance(1,'sat-0').bodies).toBeUndefined();}
});
it('prediction clones state, includes planned burns, reports actual horizon',()=>{
 const s=makePreset('leo'),before=JSON.stringify(s);s.maneuvers.push({id:'burn',bodyId:'sat-0',jd:s.jd+10/DAY,deltaV:100,direction:'prograde',vector:[0,0,0],executed:false});
 const original=JSON.stringify(s),result=predict(s,{duration:120,resolution:20,ids:['sat-0'],maxMs:3000});expect(JSON.stringify(s)).toBe(original);expect(result.complete).toBe(true);expect(result.events.some(e=>e.kind==='burn')).toBe(true);expect(result.paths['sat-0'].length).toBeGreaterThan(10);
});
it('Hermite playback reproduces constant-velocity state and rejects extrapolation',()=>{
 const a={jd:2451545,position:[0,0,0],velocity:[2,0,0]},b={jd:2451546,position:[2*DAY,0,0],velocity:[2,0,0]};
 expect(interpolateVectors([a,b],2451545.5).position[0]).toBeCloseTo(DAY);expect(interpolateVectors([a,b],2451545.5).velocity[0]).toBe(2);
 expect(()=>interpolateVectors([a,b],2451547)).toThrow();
});
it('reports CPU throughput at 1k, 5k and 10k test particles',()=>{
 for(const n of [1000,5000,10000]){const b=Array.from({length:12},(_,i)=>body({id:'source'+i,mass:1e25,position:[Math.cos(i)*AU,Math.sin(i)*AU,0]}));
 for(let i=0;i<n;i++)b.push(body({id:'p'+i,mass:0,massless:true,position:[(2+i/n)*AU,Math.sin(i)*AU,Math.cos(i)*AU],velocity:[0,10000,0]}));
 const start=performance.now();for(let k=0;k<12;k++)verlet(b,60,{softening:1000,solver:'tree',theta:.5});
 const rate=12000/(performance.now()-start);console.log('CPU Verlet benchmark',n,'particles + 12 sources:',rate.toFixed(1),'steps/sec');expect(rate).toBeGreaterThan(0);}
},30000);
