import {orbitalElements,derivedOrbit,primaryFor} from '../physics/orbital.js';
import {observation,observingStar,sunlight} from '../physics/observations.js';
import {surfacePosition} from '../navigation/model.js';
import {sub,norm,dot,unit,cross,DAY,YEAR,G} from '../physics/units.js';
import {C,formatDistance,formatDuration} from './coordinates.js';
export function apparentSky(observer,targets,jd,{latitude=0,longitude=0,altitude=1000,surface=false}={}){
 const p=surface?surfacePosition(observer,jd,latitude,longitude,altitude):observer.position,up=unit(sub(p,observer.position)),axis=unit(observer.spin?.axis??[0,0,1]),east=unit(cross(axis,up)),north=unit(cross(up,east));
 return targets.filter(t=>t.id!==observer.id).map(t=>{const d=sub(t.position,p),distance=norm(d),u=unit(d);return {id:t.id,name:t.name,direction:u,distance,angularSize:t.radius?2*Math.asin(Math.min(1,t.radius/distance)):0,azimuth:surface?((Math.atan2(dot(u,east),dot(u,north))*180/Math.PI+360)%360):null,elevation:surface?Math.asin(Math.max(-1,Math.min(1,dot(u,up))))*180/Math.PI:null};});
}
export function upcomingEvents(s,selectedId){const b=s.bodies.find(x=>x.id===selectedId),items=s.maneuvers.filter(n=>!n.executed&&n.jd>=s.jd).map(n=>({jd:n.jd,kind:'Maneuver',message:n.bodyId+' · '+n.deltaV+' m/s'}));items.push(...(s.experimentEvents??[]).filter(e=>!e.executed&&e.jd>=s.jd).map(e=>({jd:e.jd,kind:'Scheduled change',message:e.operation.kind})));
 if(b){const d=derivedOrbit(b,s.bodies,s.settings),e=d.elements;if(e?.period&&e.M!=null){const next=(m)=>((m-e.M+2*Math.PI)%(2*Math.PI))/(2*Math.PI)*e.period;for(const [m,label] of [[0,'Periapsis'],[Math.PI,'Apoapsis']])items.push({jd:s.jd+next(m)/DAY,kind:label,message:'Osculating two-body estimate; perturbations can change the epoch'});}}
 return items.sort((a,b)=>a.jd-b.jd).slice(0,20);
}
export function missionAnalyst(s,id,stats){const b=s.bodies.find(x=>x.id===id);if(!b)return {facts:[],suggestions:[],model:'Deterministic rules from current state; not an AI chat service.'};const d=derivedOrbit(b,s.bodies,s.settings),e=d.elements,facts=[],suggestions=[];
 if(e){facts.push({label:'Orbit',value:e.specificEnergy<0?'Bound at this instant':'Unbound at this instant'});facts.push({label:'Eccentricity',value:e.e});if(e.periapsis<=d.primary.radius){facts.push({label:'Surface crossing',value:'Osculating periapsis intersects '+d.primary.name});suggestions.push({label:'Preview a higher periapsis in Encounter operations',action:'rendezvous'});}if(e.e>.2&&e.e<1)suggestions.push({label:'Preview circularization around the selected primary',action:'rendezvous'});if(e.period&&s.settings.stepSeconds>e.period/100){facts.push({label:'Step warning',value:'Maximum step exceeds 1% of orbital period'});suggestions.push({label:'Halve maximum timestep',action:'accuracy'});}}
 if(stats?.conservationReliable&&Math.abs(stats.energyDrift)>.01){facts.push({label:'Drift warning',value:'Tracked energy drift exceeds 0.01%'});suggestions.push({label:'Halve maximum timestep',action:'accuracy'});}
 if(b.rocket){const r=b.rocket,stage=r.stages[r.stage];facts.push({label:'Mission phase',value:r.phase});facts.push({label:'Propellant',value:stage.fuel+' kg'});if(stage.capacity>0&&stage.fuel/stage.capacity<.1)facts.push({label:'Fuel warning',value:'Active-stage fuel below 10%'});}
 facts.push({label:'Integrator',value:s.settings.integrator},{label:'Gravity',value:s.settings.solver});
 return {facts,suggestions,model:'Rule-based Mission Analyst using authoritative state. Suggestions run only after an explicit click; no fabricated telemetry.'};
}
export function sensorReadings(s,id,targetId,fov=30){const b=s.bodies.find(x=>x.id===id),target=s.bodies.find(x=>x.id===targetId);if(!b)return null;const primary=primaryFor(b,s.bodies),star=observingStar(s,b),direction=unit(b.rocket?.orientation??b.spacecraft?.orientation??b.velocity),r=sub(star.position,b.position),sunAngle=Math.acos(Math.max(-1,Math.min(1,dot(unit(r),direction)))),range=target?observation(b,target,star,C):null;
 return {lightSource:star.name,altitude:primary?norm(sub(b.position,primary.position))-primary.radius:null,range,sunAngle,sunlight:sunlight(b,star,s.bodies),direction,fov};
}
export const CHALLENGES=[['circular','400 km circular orbit'],['geo','Geostationary-like Earth orbit'],['escape','Escape selected primary'],['moon','Bound lunar arrival'],['mars','Bound Mars arrival'],['rendezvous','Rendezvous within 100 m'],['binary','Bound binary pair']];
export function validateChallenge(s,id,kind,targetId){const b=s.bodies.find(x=>x.id===id),target=s.bodies.find(x=>x.id===targetId),d=b?derivedOrbit(b,s.bodies,s.settings):null,e=d?.elements;let passed=false,criteria='';
 if(kind==='circular'){criteria='Bound; eccentricity < 0.01; both apsides 350–450 km above primary';passed=!!e&&e.specificEnergy<0&&e.e<.01&&e.periapsis-d.primary.radius>=350e3&&e.apoapsis-d.primary.radius<=450e3;}
 if(kind==='geo'){criteria='Earth-centered; bound; e < 0.01; inclination < 1°; period within 0.5% of sidereal day';passed=!!e&&d.primary.id==='earth'&&e.specificEnergy<0&&e.e<.01&&e.i<Math.PI/180&&Math.abs(e.period/86164.0905-1)<.005;}
 if(kind==='escape'){criteria='Positive osculating orbital energy; moving away from primary';passed=!!e&&e.specificEnergy>0&&dot(sub(b.position,d.primary.position),sub(b.velocity,d.primary.velocity))>0;}
 if(kind==='moon'||kind==='mars'){criteria='Bound to '+kind+'; periapsis clears surface';passed=!!e&&d.primary.id===kind&&e.specificEnergy<0&&e.periapsis>d.primary.radius;}
 if(kind==='rendezvous'){criteria='Distance ≤ 100 m and relative speed ≤ 0.2 m/s';passed=!!b&&!!target&&b.id!==target.id&&norm(sub(b.position,target.position))<=100&&norm(sub(b.velocity,target.velocity))<=.2;}
 if(kind==='binary'){criteria='Selected two massive stars have bound relative orbit and clear periapsis';const p=target??s.bodies.find(x=>x.type==='star'&&x.id!==id);if(b?.type==='star'&&p?.type==='star'){const orbit=orbitalElements(sub(b.position,p.position),sub(b.velocity,p.velocity),G*s.settings.gMultiplier*(b.mass+p.mass));passed=orbit?.specificEnergy<0&&orbit.periapsis>b.radius+p.radius;} }
 const deltaV=s.maneuvers.filter(n=>n.executed&&!n.failed).reduce((n,m)=>n+(m.actualDeltaV??m.deltaV),0);
 return {passed,criteria,deltaV,missionDuration:b?.rocket?.met??(s.jd-(s.mission?.epochJD??s.jd))*DAY,eccentricity:e?.e,period:e?.period,model:'Instantaneous physical-state validation; passing is not proof of long-term stability.'};
}
