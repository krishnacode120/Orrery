import {it,expect} from 'vitest';
import {atmosphere,flightAtmosphere,enginePerformance} from '../physics/atmosphere.js';
import {toBodyFixed,fromBodyFixed,toLVLH,fromLVLH} from '../physics/frames.js';
import {timeScales} from '../physics/time.js';
import {attitudeStep,rcsStep,dockingStep} from '../physics/dynamics.js';
import {LogicalSimulation} from '../physics/deterministic.js';
import {makePreset,earthBody} from '../physics/catalog.js';
import {body,DEFAULT_SETTINGS} from '../physics/body.js';
import {norm,sub,julianDate,DAY} from '../physics/units.js';
import {GPUGravity,gpuEligibility,advanceWithGPU,advanceTracersCPU} from '../physics/gpuGravity.js';
import {Engine} from '../physics/engine.js';
import {stressScenario,porkchop} from '../physics/scientific.js';
import {verlet} from '../physics/integrators.js';
it('layered atmosphere is continuous with physical sea-level values',()=>{
 const earth=earthBody(),sea=atmosphere(earth,0);expect(sea.pressure).toBe(101325);expect(sea.density).toBeCloseTo(1.225,3);expect(sea.speedOfSound).toBeCloseTo(340.294,2);
 for(const h of [11000,20000,32000,47000,51000,71000,84852]){const a=atmosphere(earth,h-.001),b=atmosphere(earth,h+.001);expect(Math.abs(a.density/b.density-1)).toBeLessThan(1e-5);}
 const f=flightAtmosphere(earth,11000,600);expect(f.q).toBeCloseTo(.5*f.density*600**2,7);expect(f.mach).toBeGreaterThan(2);expect(atmosphere(earth,200000).density).toBe(0);expect(flightAtmosphere(earth,200000,8000).mach).toBeNull();
});
it('engine thrust, Isp and mass flow respond to ambient pressure',()=>{
 const stage={thrust:100,isp:300,seaLevelThrust:80,vacuumThrust:100,seaLevelIsp:280,vacuumIsp:320,minThrottle:.2,maxThrottle:1};
 expect(enginePerformance(stage,101325).thrust).toBe(80);expect(enginePerformance(stage,0).isp).toBe(320);expect(enginePerformance(stage,0,0).massFlow).toBe(0);
 expect(enginePerformance(stage,0,.01).thrust).toBe(20);
});
it('rotating frame transforms round-trip position AND velocity',()=>{
 const p=earthBody();p.position=[1e11,2e10,-3e9];p.velocity=[100,30000,-50];
 const s={position:[1e11+7e6,2e10+1e6,-3e9+3e6],velocity:[-1000,36000,200]},jd=julianDate('2031-02-01'),fixed=toBodyFixed(s,p,jd),back=fromBodyFixed(fixed,p,jd);
 expect(norm(sub(back.position,s.position))).toBeLessThan(.001);expect(norm(sub(back.velocity,s.velocity))).toBeLessThan(1e-8);
 const observer={position:[1e11+7e6,2e10,-3e9],velocity:[100,37000,-50]},local=toLVLH(s,observer,p),restored=fromLVLH(local,observer,p);
 expect(norm(sub(restored.position,s.position))).toBeLessThan(.001);expect(norm(sub(restored.velocity,s.velocity))).toBeLessThan(1e-8);
});
it('UTC TT and approximate TDB are distinct and leap offsets explicit',()=>{
 const t=timeScales(julianDate('2017-01-01'));expect(t.taiMinusUtc).toBe(37);expect((t.ttJD-t.utcJD)*DAY).toBeCloseTo(69.184,3);
 expect(Math.abs((t.tdbJD-t.ttJD)*DAY)).toBeLessThan(.002);expect(()=>timeScales(julianDate('1960-01-01'))).toThrow();
});
it('30, 60 and 144 render FPS execute the same logical physics sequence',()=>{
 const s=makePreset('leo');s.settings.stepSeconds=.25;const results=[];
 for(const fps of [30,60,144]){const sim=new LogicalSimulation(s,.25);for(let i=0;i<fps*20;i++)sim.renderElapsed(1/fps);expect(sim.tick).toBe(80);results.push(sim.engine.s);}
 expect(results[0].bodies.map(b=>[b.position,b.velocity])).toEqual(results[1].bodies.map(b=>[b.position,b.velocity]));expect(results[1].bodies.map(b=>[b.position,b.velocity])).toEqual(results[2].bodies.map(b=>[b.position,b.velocity]));
});
it('rigid torque changes orientation and RCS consumes finite fuel',()=>{
 const b=body({id:'v',mass:100,radius:1,spacecraft:{orientation:[1,0,0],attitude:{mode:'rigid',quaternion:[0,0,0,1],angularVelocity:[0,0,0],inertia:[10,10,10],torque:[0,0,1]},rcs:{fuel:1,thrust:10,isp:200,translation:[1,0,0]}}});
 const direction=attitudeStep(b,[1,0,0],1);expect(direction[1]).toBeGreaterThan(0);const m=b.mass;rcsStep(b,1);expect(b.mass).toBeLessThan(m);expect(b.spacecraft.rcs.fuel).toBeLessThan(1);expect(norm(b.velocity)).toBeGreaterThan(0);
});
it('docking rejects distant/fast craft and latches only aligned near ports',()=>{
 const a=body({id:'a',name:'A',mass:10,radius:1,spacecraft:{orientation:[1,0,0],docking:{armed:true,targetId:'b'}}}),b=body({id:'b',name:'B',mass:20,radius:1,position:[100,0,0],spacecraft:{orientation:[-1,0,0]}});let events=0;
 dockingStep([a,b],()=>events++);expect(events).toBe(0);b.position=[2.1,0,0];b.velocity=[1,0,0];dockingStep([a,b],()=>events++);expect(events).toBe(0);
 b.velocity=[0,0,0];dockingStep([a,b],()=>events++);expect(events).toBe(1);expect(a.spacecraft.docking.connected).toBe(true);expect(a.position).toEqual([0,0,0]);
});
it('GPU failure completes exactly one CPU tracer step without duplicating source integration',async()=>{
 const s=stressScenario(8),e=new Engine(),reference=new Engine();s.settings.computeMode='gpu';e.load(s);reference.load(s);
 const gpu={available:true,reason:'test device',advance:async()=>{throw new Error('device lost');}};
 const stats=await advanceWithGPU(e,100,gpu);reference.advance(100,{deterministic:true,maxSteps:1});
 expect(stats.advanced).toBe(100);expect(stats.computeMode).toBe('Worker CPU fallback');
 for(let i=0;i<s.bodies.length;i++){expect(norm(sub(e.s.bodies[i].position,reference.s.bodies[i].position))).toBeLessThan(.001);expect(norm(sub(e.s.bodies[i].velocity,reference.s.bodies[i].velocity))).toBeLessThan(1e-8);}
 expect(await new GPUGravity().initialize(null)).toBe(false);expect(gpuEligibility(makePreset('rocket'))).toBeTruthy();
});
it('Lambert grids contain measured finite opportunity metrics',()=>{
 const grid=porkchop({size:4});expect(grid.cells).toHaveLength(16);expect(grid.best.length).toBeGreaterThan(0);expect(grid.best[0].departureC3).toBeGreaterThan(0);expect(grid.best[0].arrivalJD).toBeGreaterThan(grid.best[0].depJD);
});
