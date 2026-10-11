import {G,norm,sub} from './units.js';
import {orbitalElements} from './orbital.js';
export const MISSION_STATUSES=['NOT RUN','RUNNING','SUCCESS','PARTIAL SUCCESS','FAILED','NUMERICALLY UNRELIABLE'];
// Declarative checks inspect actual state/events; no phase-name success shortcut.
export function certifyMission(s,{vehicleId,targetId,minimumPeriapsis=0,maximumApoapsis=Infinity,requiredEvents=[],completed=false,started=true,maxDriftPercent=.01}={},stats=null){
 const b=s.bodies.find(x=>x.id===vehicleId),target=s.bodies.find(x=>x.id===targetId),checks=[];
 if(b&&target){const r=sub(b.position,target.position),v=sub(b.velocity,target.velocity),o=orbitalElements(r,v,G*s.settings.gMultiplier*target.mass);
  checks.push({id:'target-bound',passed:o.specificEnergy<0&&!b.locked,value:o.specificEnergy,criterion:'Negative target-relative energy in free flight'});
  checks.push({id:'safe-periapsis',passed:o.periapsis>target.radius+minimumPeriapsis,value:o.periapsis-target.radius,criterion:'Periapsis altitude > '+minimumPeriapsis+' m'});
  checks.push({id:'bounded-apoapsis',passed:o.apoapsis<=target.radius+maximumApoapsis,value:Number.isFinite(o.apoapsis)?o.apoapsis-target.radius:null,criterion:'Configured apoapsis bound'});
 }else checks.push({id:'vehicle-and-target',passed:false,criterion:'Both objects must exist'});
 for(const kind of requiredEvents)checks.push({id:'event-'+kind,passed:s.events.some(e=>e.kind===kind&&e.bodyIds.includes(vehicleId)),criterion:'Observed '+kind+' event'});
 const unreliable=stats&&(!Number.isFinite(stats.energyDrift)||stats.conservationReliable&&Math.abs(stats.energyDrift)>maxDriftPercent);
 const status=unreliable?'NUMERICALLY UNRELIABLE':!started?'NOT RUN':!completed?'RUNNING':checks.every(x=>x.passed)?'SUCCESS':checks.some(x=>x.passed)?'PARTIAL SUCCESS':'FAILED';
 return {status,checks,jd:s.jd,model:'Osculating two-body orbit checks on the current N-body state; bounded retained event log'};
}
