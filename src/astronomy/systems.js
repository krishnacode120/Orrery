import {body} from '../physics/body.js';
import {baseScenario} from '../physics/catalog.js';
import {stateFromElements,derivedOrbit} from '../physics/orbital.js';
import {G,AU,EARTH_MASS,EARTH_RADIUS,SOLAR_MASS,SOLAR_RADIUS,add,sub,scale,norm,YEAR} from '../physics/units.js';
import {validateScenario} from '../physics/scenario.js';
export function habitableZone(luminosity){if(!(luminosity>0))return null;const l=luminosity/3.828e26;return {inner:AU*Math.sqrt(l/1.1),outer:AU*Math.sqrt(l/.53),model:'Simplified luminosity scaling: 1.10 and 0.53 times Earth solar flux; not proof of habitability.'};}
export function equilibriumTemperature(luminosity,distance,albedo=.3){return luminosity>0&&distance>0?(luminosity*(1-albedo)/(16*Math.PI*5.670374419e-8*distance*distance))**.25:null;}
export function placePlanet(s,{name='Hypothetical planet',mass=EARTH_MASS,radius=EARTH_RADIUS,a=AU,e=0,i=0,M=0,parentId}={}){
 const parent=s.bodies.find(b=>b.id===(parentId??s.view.selected))??s.bodies.find(b=>b.type==='star');if(!parent||!parent.mass)throw new Error('Select a massive primary');
 if(!Number.isFinite(mass)||mass<=0||!Number.isFinite(radius)||radius<=0||!Number.isFinite(a)||a*(1-e)<=parent.radius+radius||!(e>=0&&e<.9))throw new Error('Choose positive mass/radius and an orbit clear of the primary surface');
 const state=stateFromElements({a,e,i,Omega:0,omega:0,M},G*s.settings.gMultiplier*(parent.mass+mass)),b=body({id:'user-'+crypto.randomUUID(),name,type:parent.type==='star'?'planet':'moon',mass,radius,parentId:parent.id,position:add(parent.position,state.position),velocity:add(parent.velocity,state.velocity),color:'#8bada6',metadata:{status:'Exact configuration value',hypothetical:true}});
 s.bodies.push(b);s.view.selected=b.id;return b;
}
export function loadCatalogSystem(system,{unknownMass=EARTH_MASS,unknownRadius=EARTH_RADIUS}={}){
 if(!(system.host.mass>0&&system.host.radius>0))throw new Error('Host mass/radius are unavailable; configure a primary in System Builder');
 const s=baseScenario(system.name+' · editable model'),star=body({id:'host',name:system.name,type:'star',mass:system.host.mass,radius:system.host.radius,temperature:system.host.temperature??5772,luminosity:system.host.luminosity??0,position:[0,0,0],metadata:{catalogId:system.id,status:'Catalog value',temperatureStatus:system.host.temperature==null?'Configured fallback':'Catalog value'}});
 s.bodies.push(star);const assumptions=[];
 for(const [k,p] of system.planets.entries()){if(!(p.a>0||p.period>0)){assumptions.push(p.name+': skipped; no orbit scale');continue;}const mass=p.mass??unknownMass,radius=p.radius??unknownRadius,a=p.a??Math.cbrt(G*star.mass*(p.period/(2*Math.PI))**2);
 const b=placePlanet(s,{name:p.name,mass,radius,a,e:p.e??0,i:0,M:k*2*Math.PI/system.planets.length,parentId:star.id});
 b.id=p.id;b.metadata={catalogId:p.id,massStatus:p.mass==null?'Configured fallback':p.massStatus,radiusStatus:p.radius==null?'Configured fallback':'Catalog value',orbitStatus:p.a==null?'Calculated from period':'Catalog value',geometry:'Illustrative coplanar orientation and mean anomaly; not an observed ephemeris'};
 if(p.mass==null||p.radius==null)assumptions.push(p.name+': '+(p.mass==null?'configured mass ':'')+(p.radius==null?'configured radius':''));
 }
 const com=s.bodies.reduce((p,b)=>add(p,scale(b.position,b.mass)),[0,0,0]),momentum=s.bodies.reduce((p,b)=>add(p,scale(b.velocity,b.mass)),[0,0,0]),total=s.bodies.reduce((n,b)=>n+b.mass,0);s.bodies.forEach(b=>{b.position=sub(b.position,scale(com,1/total));b.velocity=sub(b.velocity,scale(momentum,1/total));});
 s.settings.stepSeconds=Math.min(1800,...system.planets.filter(p=>p.period>0).map(p=>p.period/1000));s.settings.roche=false;s.view.selected=star.id;s.tags=['exoplanet','experimental'];s.provenance={source:'custom',epochJD:s.jd,note:'NASA archive parameter model; illustrative phases and orientation. '+assumptions.join('; ')};return validateScenario(s);
}
export const STAR_TYPES={sun:{mass:SOLAR_MASS,radius:SOLAR_RADIUS,temperature:5772,luminosity:3.828e26},red:{mass:.2*SOLAR_MASS,radius:.25*SOLAR_RADIUS,temperature:3200,luminosity:.008*3.828e26},hot:{mass:2*SOLAR_MASS,radius:1.7*SOLAR_RADIUS,temperature:8500,luminosity:12*3.828e26}};
export function generateSystem({starType='sun',count=6,inner=.3*AU,outer=15*AU,giants=true,moons=true,belt=false,seed=42}={}){
 if(!Number.isInteger(count)||count<1||count>16||!(inner>0&&outer>inner&&outer<=1000*AU)||!STAR_TYPES[starType])throw new Error('Generate 1–16 planets with valid increasing orbital bounds');
 let rng=seed>>>0;const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 const s=baseScenario('Generated planetary system'),star=body({id:'primary',name:'Primary',type:'star',...STAR_TYPES[starType],position:[0,0,0]});s.bodies=[star];let previous=null;
 for(let k=0;k<count;k++){const a=count===1?Math.sqrt(inner*outer):inner*(outer/inner)**(k/(count-1)),gas=giants&&k>count/2,mass=EARTH_MASS*(gas?30+100*random():.3+2*random()),radius=EARTH_RADIUS*(gas?4+4*random():Math.cbrt(mass/EARTH_MASS)),e=.015*random();
 if(previous){const hill=(a+previous.a)/2*((mass+previous.mass)/(3*star.mass))**(1/3);if(a-previous.a<8*hill)throw new Error('Orbital bounds are too crowded for eight mutual Hill radii; widen the range or reduce planet count');}
 const b=placePlanet(s,{name:'Planet '+(k+1),mass,radius,a,e,i:.015*random(),M:random()*Math.PI*2,parentId:star.id});previous={a,mass};
 if(moons&&gas){placePlanet(s,{name:b.name+' moon',mass:mass*1e-5,radius:radius*.08,a:radius*15,e:0,M:random()*6,parentId:b.id});}
 }
 if(belt){for(let k=0;k<600;k++){const a=outer*(.5+.2*random()),state=stateFromElements({a,e:.05*random(),i:.05*random(),Omega:random()*6,omega:0,M:random()*6},G*star.mass);s.bodies.push(body({id:'dust-'+k,name:'Belt '+k,type:'asteroid',massless:true,mass:0,radius:1000,parentId:star.id,...state,trail:{length:0,color:'#8693a1'}}));}}
 s.view.selected=star.id;s.tags=['generated'];s.provenance.note='Seed '+seed+'; Hill spacing heuristic. Stability over astronomical timescales is not guaranteed.';return validateScenario(s);
}
export function binarySystem({separation=AU,secondaryMass=SOLAR_MASS,architecture='circumbinary',triple=false}={}){
 if(!(separation>.01*AU&&separation<=100*AU&&secondaryMass>0&&secondaryMass<=100*SOLAR_MASS))throw new Error('Invalid binary parameters');
 const s=baseScenario(triple?'Hierarchical triple · experimental':'Binary · '+architecture),m1=SOLAR_MASS,m2=secondaryMass,total=m1+m2,v=Math.sqrt(G*total/separation);
 const a=body({id:'primary',type:'star',name:'Star A',mass:m1,radius:SOLAR_RADIUS,luminosity:3.828e26,position:[-separation*m2/total,0,0],velocity:[0,-v*m2/total,0]}),b=body({id:'companion',type:'star',name:'Star B',mass:m2,radius:SOLAR_RADIUS,luminosity:3.828e26,position:[separation*m1/total,0,0],velocity:[0,v*m1/total,0]});s.bodies=[a,b];
 if(architecture==='component')placePlanet(s,{a:separation*.12,parentId:a.id});else{const r=separation*5;s.bodies.push(body({id:'circumbinary',type:'planet',name:'Circumbinary planet',mass:EARTH_MASS,radius:EARTH_RADIUS,position:[r,0,0],velocity:[0,Math.sqrt(G*total/r),0]}));}
 if(triple){const third=body({id:'third',type:'star',name:'Outer companion',mass:SOLAR_MASS,radius:SOLAR_RADIUS,position:[separation*30,0,0],velocity:[0,Math.sqrt(G*(total+SOLAR_MASS)/(separation*30)),0]});const shift=scale(third.velocity,-third.mass/(total+third.mass));s.bodies.forEach(b=>b.velocity=add(b.velocity,shift));third.velocity=add(third.velocity,shift);s.bodies.push(third);}
 s.view.selected=a.id;s.tags=['binary','experimental'];s.provenance.note='Circular two-star initial conditions; approximate planet and hierarchical third-star initial conditions. N-body evolution determines stability.';return validateScenario(s);
}
export function formationSystem({count=64,dust=600,seed=17}={}){
 if(!Number.isInteger(count)||count<8||count>256||!Number.isInteger(dust)||dust<0||dust>5000)throw new Error('Formation supports 8–256 resolved bodies and at most 5,000 tracers');
 const s=baseScenario('Protoplanetary disk · educational'),star=body({id:'primary',name:'Young primary',type:'star',...STAR_TYPES.sun,position:[0,0,0]});s.bodies=[star];
 for(let k=0;k<count+dust;k++){const resolved=k<count,a=AU*(.5+4*(k*.61803398875%1)),angle=(k+seed)*2.39996323,state=stateFromElements({a,e:.03,i:.02*Math.sin(k),Omega:0,omega:0,M:angle},G*star.mass);s.bodies.push(body({id:'disk-'+k,name:(resolved?'Proto-body ':'Dust tracer ')+k,type:'asteroid',mass:resolved?EARTH_MASS*.1/count:0,radius:resolved?EARTH_RADIUS*Math.cbrt(.1/count):1000,massless:!resolved,parentId:star.id,...state,color:resolved?'#b6a893':'#606d7c',collisionMode:resolved?'merge':'none',metadata:{disk:true},trail:{length:0,color:'#8693a1'}}));}
 s.settings.collisionMode='merge';s.settings.roche=false;s.view.selected=star.id;s.tags=['formation','educational'];s.provenance.note='Simplified educational formation model. Point gravity and physical-radius collision accretion; no hydrodynamics, gas drag, migration or chemistry.';return validateScenario(s);
}
export function formationMetrics(s){const disk=s.bodies.filter(b=>b.metadata?.disk&&!b.massless),largest=[...disk].sort((a,b)=>b.mass-a.mass)[0];return {count:disk.length,mass:disk.reduce((n,b)=>n+b.mass,0),largest,ejected:disk.filter(b=>derivedOrbit(b,s.bodies,s.settings).elements?.specificEnergy>0).length,collisions:s.events.filter(e=>e.kind==='merge').length};}
