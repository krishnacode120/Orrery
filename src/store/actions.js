import { body } from '../physics/body.js';
import { G, AU, SOLAR_MASS, EARTH_MASS, EARTH_RADIUS, add, sub, scale, unit, norm, cross } from '../physics/units.js';
import { derivedOrbit, primaryFor, stateFromElements } from '../physics/orbital.js';
import { diagnostics } from '../physics/integrators.js';
import { makeDebris, replaceBodies, debrisCapacity } from '../physics/debris.js';
import { schwarzschild } from '../physics/exotic.js';
import { spacecraftAt } from '../physics/catalog.js';
export const uid=prefix=>prefix+'-'+crypto.randomUUID().slice(0,12);
export function circularize(b,bodies,settings) {
  const parent=primaryFor(b,bodies);
  if(!parent)throw new Error('A more massive primary is required');
  const r=sub(b.position,parent.position),distance=norm(r);
  if(distance<=parent.radius)throw new Error('Move the body above the primary surface');
  let normal=cross(r,sub(b.velocity,parent.velocity));if(norm(normal)<1e-10)normal=[0,0,1];
  b.velocity=add(parent.velocity,scale(unit(cross(normal,r)),Math.sqrt(G*settings.gMultiplier*(parent.mass+(b.massless?0:b.mass))/distance)));
  b.parentId=parent.id;
}
export function createBody(kind,position=[AU,0,0],velocity=[0,0,0]) {
  const id=uid(kind),b=body({id,name:kind[0].toUpperCase()+kind.slice(1),type:kind,position:[...position],velocity:[...velocity],
    mass:EARTH_MASS,radius:EARTH_RADIUS,color:'#a0adbc'});
  if(kind==='star')Object.assign(b,{mass:SOLAR_MASS,radius:6.957e8,color:'#e9c593',temperature:5772,luminosity:3.828e26});
  if(kind==='asteroid'||kind==='comet')Object.assign(b,{mass:1e14,radius:5000,color:'#aaa69e'});
  if(kind==='test particle')Object.assign(b,{type:'asteroid',mass:0,massless:true,radius:1000,name:'Test particle'});
  if(kind==='moon')Object.assign(b,{mass:7.342e22,radius:1737400});
  if(['spacecraft','satellite'].includes(kind))Object.assign(b,{mass:800,radius:2,massless:true,material:'spacecraft',collisionMode:'none',
    spacecraft:{range:4e7,battery:1,capacityWh:1000,solarWatts:600,loadWatts:220,payload:'standby',orientation:[1,0,0],epochJD:2451545}});
  if(kind==='blackHole')Object.assign(b,{mass:SOLAR_MASS,radius:schwarzschild(SOLAR_MASS),color:'#121519',
    blackHole:{diskSize:12,temperature:20000,doppler:true,photonSphere:true,accretedMass:0,spin:0}});
  if(['neutronStar','pulsar','whiteDwarf'].includes(kind))Object.assign(b,{mass:1.4*SOLAR_MASS,radius:kind==='whiteDwarf'?7e6:12000,color:'#c1d8f0',temperature:1e6,
    spin:{axis:[0,0,1],period:kind==='pulsar'?.1:30}});
  return b;
}
export function godAction(s,id,action,value=2) {
  const b=s.bodies.find(b=>b.id===id);if(!b)throw new Error('Select a body first');
  if(s.mode!=='sandbox')throw new Error('Convert to Sandbox before editing');
  if(action==='mass')b.mass*=value;
  if(action==='radius')b.radius*=value;
  if(action==='zero')b.velocity=[0,0,0];
  if(action==='reverse')b.velocity=b.velocity.map(x=>-x);
  if(action==='randomize')b.velocity=b.velocity.map(x=>x+(Math.random()-.5)*10000);
  if(action==='circularize')circularize(b,s.bodies,s.settings);
  if(action==='duplicate'){const clone=structuredClone(b);clone.id=uid(b.type);clone.name+=' copy';clone.position[0]+=b.radius*3;s.bodies.push(clone);s.view.selected=clone.id;}
  if(action==='delete'){s.bodies=s.bodies.filter(x=>x.id!==id).map(x=>x.parentId===id?{...x,parentId:null}:x);s.maneuvers=s.maneuvers.filter(x=>x.bodyId!==id);s.view.selected=s.bodies[0]?.id??null;}
  if(action==='freeze'){const locked=!s.bodies.every(b=>b.locked);s.bodies.forEach(b=>{b.locked=locked;});}
  if(action==='scale')s.bodies.forEach(x=>{x.position=x.position.map(x=>x*value);});
  if(action==='barycenter'){const d=diagnostics(s.bodies,s.settings);s.bodies.forEach(x=>{x.position=sub(x.position,d.center);x.velocity=sub(x.velocity,d.momentum.map(v=>d.mass?v/d.mass:0));});}
  if(action==='explode') {
    const count=Math.min(s.settings.fragmentCount,debrisCapacity(s.bodies,[b]));
    if(count<2)throw new Error('Fragment capacity reached');
    s.bodies=replaceBodies(s.bodies,[b],makeDebris(b,count,[1,0,0],value*1000,s.eventSerial+1,s.bodies,s.settings));
  }
  if(action==='binary') {
    const companion=createBody('star',add(b.position,[AU,0,0]),b.velocity);companion.mass=b.mass;
    companion.parentId=b.id;s.bodies.push(companion);circularize(companion,s.bodies,s.settings);
    const center=scale(add(b.velocity,companion.velocity),.5);b.velocity=sub(scale(b.velocity,2),center);companion.velocity=center;
  }
  if(action==='moon'){const moon=spacecraftAt(b,{altitude:Math.max(b.radius*10,1e7)},0,s.jd);Object.assign(moon,{id:uid('moon'),name:b.name+' moon',type:'moon',mass:b.mass*1e-5,radius:b.radius*.1,massless:false,spacecraft:null});s.bodies.push(moon);}
  if(action==='supernova'){const old=b.mass;b.mass=Math.min(1.4*SOLAR_MASS,old*.4);b.type='neutronStar';b.radius=12000;b.color='#cce3ff';b.temperature=1e6;
    for(const other of s.bodies)if(other!==b)other.velocity=add(other.velocity,scale(unit(sub(other.position,b.position)),Math.min(100000,old/Math.max(norm(sub(other.position,b.position))**2,1)*1e-15)));
    s.events.push({id:++s.eventSerial,jd:s.jd,kind:'supernova',bodyIds:[id],message:'Parameterized mass loss and radial impulse; not a radiation-hydrodynamics model',energyDelta:0,massDelta:b.mass-old});s.events=s.events.slice(-200);}
}
export function brush(s,id,kind,count=100) {
  const center=s.bodies.find(b=>b.id===id);if(!center)throw new Error('Select a primary');
  const distance=Math.max(center.radius*5,center.type==='star'?2.5*AU:1e8);
  for(let i=0;i<count;i++){
    const angle=i*2.3999632297,radius=distance*(kind==='ring'?1+.02*Math.sin(i):.7+.6*Math.random());
    const p=kind==='stream'?[radius,((i-count/2)/count)*radius,.01*radius*Math.sin(i)]:[radius*Math.cos(angle),radius*Math.sin(angle),kind==='cloud'?radius*(Math.random()-.5):.005*radius*Math.sin(i)];
    const b=createBody('test particle',add(center.position,p),center.velocity);b.id=uid('particle');b.parentId=id;
    s.bodies.push(b);circularize(b,s.bodies,s.settings);
  }
}
export function editElements(s,id,patch) {
  const b=s.bodies.find(b=>b.id===id),d=derivedOrbit(b,s.bodies,s.settings);
  if(!d.primary||!d.elements)throw new Error('No orbital primary');
  const state=stateFromElements({...d.elements,...patch},G*s.settings.gMultiplier*(d.primary.mass+(b.massless?0:b.mass)));
  b.position=add(d.primary.position,state.position);b.velocity=add(d.primary.velocity,state.velocity);
}
export function mouthPair(s,position) {
  const a=createBody('custom',position),b=createBody('custom',add(position,[AU,0,0]));
  a.id=uid('mouth');b.id=uid('mouth');
  for(const [mouth,exit] of [[a,b],[b,a]])Object.assign(mouth,{name:mouth===a?'Mouth A':'Mouth B',type:'wormholeMouth',mass:0,massless:true,locked:true,radius:1e8,
    wormhole:{pairId:exit.id,throatRadius:1e8,orientation:[0,0,0,1],transformVelocity:true,cooldown:30}});
  s.bodies.push(a,b);s.view.selected=a.id;
}
