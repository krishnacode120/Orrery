import {G,AU,DAY,add,sub,scale,norm,unit} from './units.js';
import {body} from './body.js';
import {rocketMass} from './vehicles.js';
import {applyFuelBurn} from './flight.js';
import {makeDebris,debrisCapacity} from './debris.js';
export const OP_KINDS=['mass','radius','density','position','velocity','spin','tilt','temperature','gravity','create','delete','burn','ignite','cutoff','stage','collision','fragment'];
const numeric=['mass','radius','density','spin','tilt','temperature','gravity'];
const bounded=(x,max=1e40)=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=max;
const vector=x=>Array.isArray(x)&&x.length===3&&x.every(v=>bounded(v,1e20));
export function validateOperation(op){
 if(!op||!OP_KINDS.includes(op.kind))throw new Error('Unknown experiment operation');
 if(op.kind!=='gravity'&&op.kind!=='create'&&(typeof op.bodyId!=='string'||!op.bodyId||op.bodyId.length>80))throw new Error('Operation requires a body');
 if(numeric.includes(op.kind)&&(!bounded(op.value)||!['set','multiply'].includes(op.mode??'set')))throw new Error('Invalid scalar operation');
 if(['position','velocity','burn'].includes(op.kind)&&(!vector(op.vector)||!['set','add','multiply'].includes(op.mode??'add')||op.mode==='multiply'&&!bounded(op.factor,1000)))throw new Error('Invalid vector operation');
 if(op.kind==='burn'&&(op.mode??'add')!=='add')throw new Error('Burn is an additive impulse');
 if(op.kind==='create'&&(!op.body||typeof op.body!=='object'||Array.isArray(op.body)))throw new Error('Creation requires a body state');
 if(op.kind==='collision'&&(typeof op.otherId!=='string'||!bounded(op.speed??1000,1e7)||op.speed<0))throw new Error('Invalid collision trigger');
 if(op.kind==='fragment'&&(!Number.isInteger(op.count??8)||(op.count??8)<2||(op.count??8)>64))throw new Error('Fragment count must be 2–64');
 return op;
}
export function validateSchedule(events=[]){
 if(!Array.isArray(events)||events.length>256)throw new Error('At most 256 scheduled experiment events');
 const ids=new Set();for(const e of events){if(typeof e.id!=='string'||!e.id||e.id.length>80||ids.has(e.id)||!Number.isFinite(e.jd)||e.jd<2378496.5||e.jd>=2816787.5||typeof e.executed!=='boolean')throw new Error('Invalid scheduled event');ids.add(e.id);validateOperation(e.operation);}
 return events;
}
export function removeBody(s,id){
 if(!s.bodies.some(b=>b.id===id))throw new Error('Body no longer exists');
 s.bodies=s.bodies.filter(b=>b.id!==id);for(const b of s.bodies){if(b.parentId===id)b.parentId=null;if(b.wormhole?.pairId===id)b.wormhole=null;}
 s.maneuvers=s.maneuvers.filter(n=>n.bodyId!==id);
 s.stations=s.stations.filter(n=>n.bodyId!==id);
}
export function applyOperation(s,operation){
 const op=validateOperation(operation),b=s.bodies.find(x=>x.id===op.bodyId);
 if(op.kind==='create'){const next=structuredClone(op.body);if(s.bodies.some(x=>x.id===next.id))throw new Error('Created body ID already exists');s.bodies.push(next);return 'Created '+next.name;}
 if(op.kind==='gravity'){s.settings.gMultiplier=op.mode==='multiply'?s.settings.gMultiplier*op.value:op.value;return 'Gravity multiplier → '+s.settings.gMultiplier;}
 if(!b)throw new Error('Experiment body no longer exists: '+op.bodyId);
 const scalar=current=>op.mode==='multiply'?current*op.value:op.value;
 if(['mass','radius','density','temperature'].includes(op.kind)){
  if(op.kind==='mass'&&b.rocket)throw new Error('Edit rocket fuel/dry mass in Mission parameters; total mass is derived');
  const derivedDensity=b.mass/(4/3*Math.PI*b.radius**3);b[op.kind]=scalar(op.kind==='density'?(b.density??derivedDensity):b[op.kind]);if(op.kind==='density'){if(b.rocket)throw new Error('Rocket mass is derived from stages');b.mass=b.density*4/3*Math.PI*b.radius**3;}
 }else if(op.kind==='spin')b.spin.period=scalar(b.spin.period);
 else if(op.kind==='tilt')b.axialTilt=scalar(b.axialTilt);
 else if(['position','velocity'].includes(op.kind)){
  const parent=s.bodies.find(x=>x.id===b.parentId)??s.bodies.find(x=>x.type==='star'&&x.id!==b.id),origin=op.relative&&parent?parent[op.kind]:[0,0,0],old=[...b[op.kind]],v=sub(old,origin);
  b[op.kind]=op.mode==='multiply'?add(origin,scale(v,op.factor)):op.mode==='set'?[...op.vector]:add(old,op.vector);
  if(op.kind==='position'&&op.children){const shift=sub(b.position,old);for(const child of s.bodies.filter(x=>x.parentId===b.id))child.position=add(child.position,shift);}
 }else if(op.kind==='delete')removeBody(s,b.id);
 else if(op.kind==='burn'){if(b.locked)throw new Error('Unpin the vehicle before an impulsive burn');if(op.fuelAware)applyFuelBurn(b,op.vector);else b.velocity=add(b.velocity,op.vector);}
 else if(op.kind==='ignite'){if(!b.rocket)throw new Error('Ignition requires a rocket');b.locked=false;b.rocket.phase='ignition';b.rocket.engineOn=true;}
 else if(op.kind==='cutoff'){if(!b.rocket)throw new Error('Cutoff requires a rocket');b.rocket.engineOn=false;b.rocket.phase='coasting';}
 else if(op.kind==='stage'){if(!b.rocket||b.rocket.phase==='prelaunch'||b.rocket.stage>=b.rocket.stages.length-1)throw new Error('No active stage to separate');b.rocket.stageRequested=true;}
 else if(op.kind==='collision'){
  const other=s.bodies.find(x=>x.id===op.otherId);if(!other||other.id===b.id)throw new Error('Choose two distinct bodies');const direction=unit(norm(sub(other.position,b.position))?sub(other.position,b.position):[1,0,0]);
  other.position=add(b.position,scale(direction,(b.radius+other.radius)*.8));other.velocity=sub(b.velocity,scale(direction,op.speed??1000));b.collisionMode='merge';other.collisionMode='merge';s.settings.collisionMode='merge';
 }else if(op.kind==='fragment'){
  const count=Math.min(op.count??8,debrisCapacity(s.bodies,[b]));if(count<2)throw new Error('No capacity for fragments');
  const debris=makeDebris(b,count,[0,0,1],Math.max(1,norm(b.velocity)*.01),s.eventSerial+1,s.bodies,s.settings);
  removeBody(s,b.id);s.bodies.push(...debris);
 }
 return b.name+': '+op.kind+' experiment applied';
}
export const QUICK_EXPERIMENTS=[
 ['earth2','Earth mass ×2'],['earth10','Earth mass ×10'],['jupiter10','Jupiter mass ×10'],['jupiter1000','Jupiter mass ×1000'],
 ['sun90','Sun mass −10%'],['sun110','Sun mass +10%'],['removeMoon','Remove Moon'],['duplicateMoon','Duplicate Moon'],['secondEarth','Add second Earth'],
 ['stopEarth','Stop Earth relative to Sun'],['reverseEarth','Reverse Earth orbit'],['marsIn','Move Mars inward'],['marsOut','Move Mars outward'],
 ['gHalf','Gravity ×0.5'],['g2','Gravity ×2'],['g10','Gravity ×10'],['v2','Double all relative velocities'],['v0','Zero all relative velocities'],['vReverse','Reverse all relative velocities']
];
const cloneAt=(s,id,newId,factor=1.1)=>{
 const original=s.bodies.find(b=>b.id===id);if(!original)throw new Error('Missing '+id);const next=structuredClone(original),p=s.bodies.find(b=>b.id===original.parentId)??s.bodies.find(b=>b.type==='star'&&b.id!==id);
 next.id=newId;next.name=original.name+' companion';next.createdAt=new Date().toISOString();next.position=p?add(p.position,scale(sub(original.position,p.position),factor)):add(original.position,[original.radius*4,0,0]);return next;
};
export function quickOperations(s,key,token){
 const mass=(id,value)=>({kind:'mass',bodyId:id,value,mode:'multiply'}),velocity=(id,factor)=>({kind:'velocity',bodyId:id,mode:'multiply',factor,vector:[0,0,0],relative:true});
 const map={earth2:[mass('earth',2)],earth10:[mass('earth',10)],jupiter10:[mass('jupiter',10)],jupiter1000:[mass('jupiter',1000)],sun90:[mass('sun',.9)],sun110:[mass('sun',1.1)],removeMoon:[{kind:'delete',bodyId:'moon'}],stopEarth:[velocity('earth',0)],reverseEarth:[velocity('earth',-1)],marsIn:[{kind:'position',bodyId:'mars',mode:'multiply',factor:.8,vector:[0,0,0],relative:true,children:true}],marsOut:[{kind:'position',bodyId:'mars',mode:'multiply',factor:1.2,vector:[0,0,0],relative:true,children:true}],gHalf:[{kind:'gravity',mode:'multiply',value:.5}],g2:[{kind:'gravity',mode:'multiply',value:2}],g10:[{kind:'gravity',mode:'multiply',value:10}]};
 if(['v2','v0','vReverse'].includes(key))return s.bodies.filter(b=>b.type!=='star'&&!b.locked).map(b=>velocity(b.id,key==='v2'?2:key==='v0'?0:-1));
 if(key==='duplicateMoon'||key==='secondEarth')return [{kind:'create',body:cloneAt(s,key==='duplicateMoon'?'moon':'earth',token,1.25)}];
 if(!map[key])throw new Error('Unknown quick experiment');return map[key];
}
export const EXPERIMENT_PRESETS=[
 ['starJupiter','Jupiter becomes star-like'],['noMoon','Earth loses the Moon'],['twoMoons','Earth has two moons'],['earthMars','Earth moves to Mars orbit'],['marsEarth','Mars moves to Earth orbit'],['sun75','Sun loses 25% mass'],['sun125','Sun gains 25% mass'],['rogue','Rogue planet flyby'],['binary','Binary Sun'],['alignment','Planetary alignment'],['planets10','All planets ×10 mass'],['reversed','All velocities reversed'],['noJupiter','Solar system without Jupiter'],['moonImpact','Moon collision course'],['asteroidImpact','Asteroid Earth impact'],['holeFlyby','Black-hole flyby']
];
export function presetOperations(s,key,token){
 if(key==='noMoon')return quickOperations(s,'removeMoon',token);if(key==='twoMoons')return quickOperations(s,'duplicateMoon',token);if(key==='reversed')return quickOperations(s,'vReverse',token);
 if(key==='noJupiter')return [{kind:'delete',bodyId:'jupiter'}];
 if(['sun75','sun125','starJupiter','planets10'].includes(key))return (key==='planets10'?s.bodies.filter(b=>b.type==='planet').map(b=>b.id):[key==='starJupiter'?'jupiter':'sun']).map(id=>({kind:'mass',bodyId:id,mode:'multiply',value:key==='sun75'?.75:key==='sun125'?1.25:key==='starJupiter'?1000:10}));
 if(['earthMars','marsEarth'].includes(key)){const source=s.bodies.find(b=>b.id===(key==='earthMars'?'mars':'earth')),id=key==='earthMars'?'earth':'mars';if(!source)throw new Error('Missing target orbit');return [{kind:'position',bodyId:id,mode:'set',vector:source.position,children:true},{kind:'velocity',bodyId:id,mode:'set',vector:source.velocity}];}
 if(key==='alignment'){const sun=s.bodies.find(b=>b.id==='sun');if(!sun)throw new Error('Sun required');return s.bodies.filter(b=>b.type==='planet').flatMap(b=>{const distance=norm(sub(b.position,sun.position)),speed=Math.sqrt(G*s.settings.gMultiplier*sun.mass/distance);return [{kind:'position',bodyId:b.id,mode:'set',vector:add(sun.position,[distance,0,0]),children:true},{kind:'velocity',bodyId:b.id,mode:'set',vector:add(sun.velocity,[0,speed,0])}];});}
 if(key==='moonImpact'){const moon=s.bodies.find(b=>b.id==='moon'),earth=s.bodies.find(b=>b.id==='earth');if(!moon||!earth)throw new Error('Earth and Moon required');return [{kind:'velocity',bodyId:moon.id,mode:'set',vector:add(earth.velocity,scale(unit(sub(earth.position,moon.position)),1000))}];}
 const sun=s.bodies.find(b=>b.id==='sun'),earth=s.bodies.find(b=>b.id==='earth');if(!sun)throw new Error('Sun required');
 if(key==='binary'){const next=cloneAt(s,'sun',token);next.position=add(sun.position,[AU*.5,0,0]);next.velocity=add(sun.velocity,[0,20000,0]);next.parentId=null;return [{kind:'create',body:next}];}
 const type=key==='holeFlyby'?'blackHole':key==='asteroidImpact'?'asteroid':'rogue',origin=type==='asteroid'?earth?.position:sun.position;if(!origin)throw new Error('Earth required');
 const next=body({id:token,name:type==='blackHole'?'Experimental black-hole flyby':type==='asteroid'?'Impact asteroid':'Rogue visitor',type,mass:type==='blackHole'?sun.mass:type==='asteroid'?1e12:5.9722e24,radius:type==='asteroid'?500:6371000,position:add(origin,type==='asteroid'?[1e8,0,0]:[AU*-2,AU*.2,0]),velocity:add(type==='asteroid'?earth.velocity:sun.velocity,type==='asteroid'?[-20000,0,0]:[60000,0,0]),color:type==='blackHole'?'#101218':'#968577'});
 if(type==='blackHole')next.blackHole={diskSize:12,temperature:15000,doppler:true,photonSphere:true};return [{kind:'create',body:next}];
}
