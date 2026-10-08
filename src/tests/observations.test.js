import {it,expect} from 'vitest';
import {sunlight,observation,signalLink,lagrangePoints,rendezvous,rendezvousBurn,orbitChange} from '../physics/observations.js';
import {body,DEFAULT_SETTINGS} from '../physics/body.js';
import {makePreset} from '../physics/catalog.js';
import {orbitalElements} from '../physics/orbital.js';
import {burnVector,communications,stationPosition,bodyFixed} from '../physics/vehicles.js';
import {predict} from '../physics/prediction.js';
import {Engine} from '../physics/engine.js';
import {validateScenario} from '../physics/scenario.js';
import {G,AU,SOLAR_MASS,EARTH_MASS,norm,sub,add,scale,dot} from '../physics/units.js';
it('finite-disc occultation distinguishes sunlight, penumbra, and umbra',()=>{
 const observer=body({id:'observer'}),star=body({id:'sun',radius:10,position:[1000,0,0]}),large=body({id:'planet',radius:2,position:[50,0,0]});
 expect(sunlight(observer,star,[large]).state).toBe('umbra');
 const partial=body({id:'moon',radius:.5,position:[50,.5,0]});const p=sunlight(observer,star,[partial]);expect(p.state).toBe('penumbra');expect(p.fraction).toBeGreaterThan(0);expect(p.fraction).toBeLessThan(1);
 expect(sunlight(observer,star,[{...large,position:[-50,0,0]}]).state).toBe('sunlight');
 expect(sunlight(observer,star,[{...large,position:[1500,0,0]}]).state).toBe('sunlight');
});
it('observation derives phase, angular diameter and light delay from geometry',()=>{
 const observer=body({id:'earth',position:[0,0,0]}),target=body({id:'moon',radius:1,position:[100,0,0],velocity:[-2,0,0]}),sun=body({id:'sun',position:[-1000,0,0]});
 const o=observation(observer,target,sun,10);expect(o.lightTime).toBe(10);expect(o.closingSpeed).toBe(2);expect(o.phaseAngle).toBeCloseTo(0);expect(o.angularSize).toBeCloseTo(2*Math.asin(.01),12);expect(o.illuminatedFraction).toBe(1);
});
it('radio link preserves LOS, range, delay and inverse-square power behavior',()=>{
 const a=body({id:'a',position:[0,0,0]}),b=body({id:'b',position:[1000,0,0]}),n={range:3000,c:100,frequency:1e6};
 const l=signalLink(a,b,[],n),far=signalLink(a,{...b,position:[2000,0,0]},[],n);expect(l.status).toBe('connected');expect(l.delay).toBe(10);expect(l.receivedDBW-far.receivedDBW).toBeCloseTo(20*Math.log10(2),9);
 expect(signalLink(a,b,[body({id:'planet',radius:20,position:[500,0,0]})],n).status).toBe('blocked');expect(signalLink(a,b,[],{...n,range:999}).status).toBe('out-of-range');
});
it('ground-station links retain Earth occultation and carry actual delays',()=>{
 const s=makePreset('leo'),b=s.bodies[1],links=communications(b,s.bodies,[{id:'near',name:'Near',bodyId:'earth',latitude:0,longitude:0,altitude:10}],s.jd);expect(links).toHaveLength(1);expect(links[0].delay).toBeGreaterThan(0);expect(['connected','blocked','out-of-range']).toContain(links[0].status);
});
it('Lagrange points solve the collinear CR3BP force equation and triangular geometry',()=>{
 const a=body({id:'sun',mass:SOLAR_MASS}),b=body({id:'earth',mass:EARTH_MASS,position:[AU,0,0],velocity:[0,29780,0]}),points=lagrangePoints(a,b),mu=b.mass/(a.mass+b.mass);
 expect(points.map(p=>p.name)).toEqual(['L1','L2','L3','L4','L5']);
 for(const p of points.slice(0,3)){const x=p.position[0]/AU-mu,f=x-(1-mu)*(x+mu)/Math.abs(x+mu)**3-mu*(x-1+mu)/Math.abs(x-1+mu)**3;expect(Math.abs(f)).toBeLessThan(1e-9);}
 expect(norm(sub(points[3].position,a.position))).toBeCloseTo(AU,2);expect(norm(sub(points[3].position,b.position))).toBeCloseTo(AU,2);
 expect(points[0].position[0]).toBeLessThan(AU);expect(points[1].position[0]).toBeGreaterThan(AU);
});
it('capture and escape tools compute physical state changes',()=>{
 const s=makePreset('leo'),p=s.bodies[0],b=s.bodies[1],r=sub(b.position,p.position),v=sub(b.velocity,p.velocity),altitude=norm(r)-p.radius;
 const escaped=add(v,orbitChange(b,p,s.settings,{escape:true}));expect(orbitalElements(r,escaped,G*p.mass).e).toBeGreaterThan(1);
 const dv=orbitChange(b,p,s.settings,{periapsis:altitude,apoapsis:1000000}),o=orbitalElements(r,add(v,dv),G*p.mass);expect(o.periapsis-p.radius).toBeCloseTo(altitude,3);expect(o.apoapsis-p.radius).toBeCloseTo(1000000,3);
 expect(()=>orbitChange(b,p,s.settings,{periapsis:1000000,apoapsis:2000000})).toThrow();
});
it('rendezvous guidance matches velocity and bounds approach speed without claiming docking',()=>{
 const a=body({id:'a',position:[0,0,0],velocity:[10,0,0],spacecraft:{orientation:[1,0,0]}}),b=body({id:'b',position:[1000,0,0],velocity:[9,0,0],spacecraft:{orientation:[1,0,0]}});
 expect(rendezvous(a,b).closingSpeed).toBe(1);expect(rendezvousBurn(a,b,'match')).toEqual([-1,0,0]);const dv=rendezvousBurn(a,b,'approach',100);expect(norm(add(a.velocity,dv))-norm(b.velocity)).toBeLessThanOrEqual(10);
 expect(rendezvous(a,b).dockable).toBe(false);
});
it('local maneuver components resolve against live rather than saved orientation',()=>{
 const s=makePreset('leo'),p=s.bodies[0],b=s.bodies[1],n={components:[10,20,30],direction:'vector',vector:[0,0,0],deltaV:0};
 const dv=burnVector(b,p,n);expect(dv.every(Number.isFinite)).toBe(true);
 const radial=scale(sub(b.position,p.position),1/norm(sub(b.position,p.position)));expect(dot(dv,radial)).toBeCloseTo(30,7);
 b.position=[0,p.radius+400000,0];b.velocity=[0,0,7670];expect(burnVector(b,p,n)).not.toEqual(dv);
});
it('closest approach uses integration segments rather than sparse display path samples',()=>{
 const s=makePreset('empty');s.settings={...s.settings,stepSeconds:1,gMultiplier:0,collisionMode:'none',roche:false,softening:1};s.view.targetId='target';s.bodies=[body({id:'probe',massless:true,position:[-10,3,0],velocity:[1,0,0]}),body({id:'target',massless:true,position:[0,0,0],velocity:[0,0,0]})];const before=JSON.stringify(s),p=predict(s,{duration:20,ids:['probe'],resolution:8,maxMs:3000});expect(p.complete).toBe(true);expect(p.closestApproach.distance).toBeCloseTo(3,8);expect((p.closestApproach.jd-s.jd)*86400).toBeCloseTo(10,3);expect(p.closestApproach.relativeSpeed).toBe(1);expect(JSON.stringify(s)).toBe(before);
});
it('shadow events and partial-disc power survive scenario validation',()=>{
 const s=makePreset('leo'),b=s.bodies[1];b.position=[-s.bodies[0].radius-400000,0,0];b.velocity=[0,-7670,0];b.spacecraft.sunlightState='sunlight';s.settings.stepSeconds=.1;
 const engine=new Engine();engine.load(s);engine.advance(.1);const craft=engine.s.bodies[1];expect(craft.spacecraft.sunlightState).toBe('umbra');expect(craft.spacecraft.solarFraction).toBe(0);expect(engine.s.events.some(e=>e.kind==='eclipse')).toBe(true);expect(()=>validateScenario(engine.s)).not.toThrow();
});

it('non-Earth station transforms use the parent spin frame',()=>{
 const p=body({id:'mars',radius:3389500,spin:{axis:[0,0,1],period:88642}}),jd=2451545.123,station={latitude:12,longitude:-40,altitude:10},position=stationPosition(station,p,jd),fixed=bodyFixed(sub(position,p.position),p,jd);expect(fixed.latitude).toBeCloseTo(12,8);expect(fixed.longitude).toBeCloseTo(-40,8);
});
