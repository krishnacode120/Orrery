import {Engine} from './engine.js';
import {diagnostics} from './integrators.js';
import {derivedOrbit} from './orbital.js';
import {realityBodies} from './catalog.js';
import {transferPlan,hohmann} from './transfers.js';
import {applyOperation} from './experimentOps.js';
import {DAY,G,norm,sub} from './units.js';
const elements=(b,s)=>{const o=derivedOrbit(b,s.bodies,s.settings).elements;return o?Object.fromEntries(['a','e','i','Omega','omega','M','periapsis','apoapsis','period'].map(k=>[k,Number.isFinite(o[k])?o[k]:null])):null;};
export function compareSnapshots(baseline,experiment){
 const map=new Map(baseline.bodies.map(b=>[b.id,b])),rows=[];
 for(const b of experiment.bodies){const original=map.get(b.id);map.delete(b.id);const before=original?elements(original,baseline):null,after=elements(b,experiment);rows.push({id:b.id,name:b.name,status:original?'retained':'created',positionDifference:original?norm(sub(b.position,original.position)):null,velocityDifference:original?norm(sub(b.velocity,original.velocity)):null,massDifference:b.mass-(original?.mass??0),baseline:before,experiment:after,eccentricityDifference:before&&after?after.e-before.e:null});}
 for(const b of map.values())rows.push({id:b.id,name:b.name,status:'removed',positionDifference:null,velocityDifference:null,massDifference:-b.mass,baseline:elements(b,baseline),experiment:null,eccentricityDifference:null});
 const a=diagnostics(baseline.bodies,baseline.settings),b=diagnostics(experiment.bodies,experiment.settings);
 return {baselineJD:baseline.jd,experimentJD:experiment.jd,aligned:Math.abs(baseline.jd-experiment.jd)<2e-9,rows,energyDifference:b.energy-a.energy,angularMomentumDifference:norm(sub(b.angular,a.angular)),barycenterDifference:norm(sub(b.center,a.center)),baselineDiagnostics:a,experimentDiagnostics:b};
}
export function compareExperiments(baseline,experiment,{duration=DAY*365.25,resolution=80,maxMs=4000,ids=[],targetId=null}={}){
 if(baseline.bodies.length>1000||experiment.bodies.length>1000)throw new Error('Comparison is limited to 1,000 bodies per branch; reduce particle counts first.');
 if(!Number.isFinite(duration)||duration===0||Math.abs(duration)>DAY*365.25*1000)throw new Error('Choose a nonzero horizon up to 1,000 years');
 if(!Number.isFinite(resolution)||!Number.isFinite(maxMs))throw new Error('Invalid comparison budget or resolution');
 const started=performance.now(),deadline=started+Math.max(100,Math.min(12000,maxMs)),a=new Engine(),b=new Engine();
 a.load({...baseline,mode:'sandbox',ephemeris:null,telemetry:[]});b.load({...experiment,mode:'sandbox',ephemeris:null,telemetry:[]});
 const startJD=Math.max(a.s.jd,b.s.jd),direction=Math.sign(duration),endJD=startJD+duration/DAY,chosen=ids.length?ids.slice(0,32):experiment.bodies.filter(x=>!x.massless&&!x.disrupted).slice(0,32).map(x=>x.id);
 if(targetId&&chosen[0]&&chosen[0]!==targetId){a.encounterPair=[chosen[0],targetId];b.encounterPair=[chosen[0],targetId];}
 const paths={baseline:Object.fromEntries(chosen.map(id=>[id,[]])),experiment:Object.fromEntries(chosen.map(id=>[id,[]]))},maxDeviation={},outcomes=[],lastE=new Map();let error=null,samples=0,lastAligned=null,matchedState=null;
 const advanceTo=(engine,jd)=>{while(Math.abs(jd-engine.s.jd)>2e-9&&performance.now()<deadline){const d=engine.advance((jd-engine.s.jd)*DAY);if(Math.abs(d.advanced)<1e-9)return false;}return Math.abs(jd-engine.s.jd)<=2e-9;};
 const seedSerial=[a.s.eventSerial,b.s.eventSerial];
 const sample=()=>{lastAligned=compareSnapshots(a.s,b.s);matchedState={events:[...a.s.events.map(e=>({...e,branch:'baseline'})),...b.s.events.map(e=>({...e,branch:'experiment'}))],closestApproach:{baseline:structuredClone(a.encounter),experiment:structuredClone(b.encounter)},mission:{baselineFuel:a.s.bodies.find(x=>x.id===chosen[0])?.rocket?.stages.reduce((n,s)=>n+s.fuel,0)??null,experimentFuel:b.s.bodies.find(x=>x.id===chosen[0])?.rocket?.stages.reduce((n,s)=>n+s.fuel,0)??null,baselineManeuverDV:a.s.maneuvers.filter(n=>n.executed&&!n.failed&&n.actualJD>=startJD).reduce((sum,n)=>sum+(n.actualDeltaV??(n.components?norm(n.components):n.direction==='vector'?norm(n.vector):n.deltaV)),0),experimentManeuverDV:b.s.maneuvers.filter(n=>n.executed&&!n.failed&&n.actualJD>=startJD).reduce((sum,n)=>sum+(n.actualDeltaV??(n.components?norm(n.components):n.direction==='vector'?norm(n.vector):n.deltaV)),0)}};samples++;for(const row of lastAligned.rows){if(row.positionDifference!==null)maxDeviation[row.id]=Math.max(maxDeviation[row.id]??0,row.positionDifference);}
  for(const [label,engine] of [['baseline',a],['experiment',b]])for(const id of chosen){const body=engine.s.bodies.find(x=>x.id===id);if(!body)continue;paths[label][id].push({jd:engine.s.jd,position:[...body.position]});const e=elements(body,engine.s)?.e,key=label+':'+id,old=lastE.get(key);if(old!=null&&e!=null&&(old<1)!==(e<1))outcomes.push({kind:e>=1?(body.type==='moon'?'moon-ejection':'escape'):'capture',branch:label,bodyId:id,jd:engine.s.jd,message:body.name+(e>=1?' became osculating-unbound':' became osculating-bound')+' relative to its current primary; sampled crossing.'});lastE.set(key,e);}
 };
 try{
  if(!advanceTo(a,startJD)||!advanceTo(b,startJD))return {aligned:false,complete:false,advanced:0,requested:duration,startJD,paths,samples:0,elapsedMs:performance.now()-started,reason:'Budget reached while aligning the preserved baseline to the experiment epoch.'};
  a.encounter=null;b.encounter=null;sample();const count=Math.max(8,Math.min(256,Math.floor(resolution)));
  for(let i=1;i<=count&&performance.now()<deadline;i++){const jd=startJD+duration/DAY*i/count;if(!advanceTo(a,jd)||!advanceTo(b,jd))break;sample();}
 }catch(e){error=e.message;}
 const finalJD=lastAligned?.experimentJD??startJD,advanced=(finalJD-startJD)*DAY;
 const events=[...(matchedState?.events??[]).filter(e=>e.id>seedSerial[e.branch==='baseline'?0:1]&&e.jd>=Math.min(startJD,finalJD)-1e-9&&e.jd<=Math.max(startJD,finalJD)+1e-9),...outcomes].sort((x,y)=>direction*(x.jd-y.jd));
 return {aligned:!!lastAligned,complete:Math.abs(finalJD-endJD)<2e-9,advanced,requested:duration,startJD,finalJD,paths,comparison:lastAligned,maxSampledDeviation:maxDeviation,events:events.slice(-400),samples,elapsedMs:performance.now()-started,reason:error??(Math.abs(finalJD-endJD)>=2e-9?'Compute budget or scenario epoch boundary reached; no extrapolated results.':null),closestApproach:matchedState?.closestApproach??null,mission:matchedState?.mission??null,model:'Both branches use cloned Sandbox engines. Same-epoch samples only. Maximum deviation is sampled, not a continuous bound.'};
}
export function sensitivity(scenario,{kind='mass',bodyId='jupiter',start=.5,end=2,samples=6,duration=DAY*30,maxMs=5000,targetId=null,transferDays=259,transferType='lambert'}={}){
 if(!['mass','velocity','gravity','departure'].includes(kind)||![start,end,samples,maxMs,transferDays].every(Number.isFinite)||end<start||transferDays<=0)throw new Error('Invalid sensitivity range or parameter');
 const count=Math.max(2,Math.min(12,Math.floor(samples))),deadline=performance.now()+Math.max(200,Math.min(12000,maxMs)),rows=[];
 for(let i=0;i<count&&performance.now()<deadline;i++){
  const value=start+(end-start)*i/(count-1);
  try{
   if(kind==='departure'){const s=structuredClone(scenario);s.jd=value;s.bodies=realityBodies(value);const earth=s.bodies.find(x=>x.id==='earth'),mars=s.bodies.find(x=>x.id==='mars'),sun=s.bodies.find(x=>x.id==='sun'),h=transferType==='hohmann'?hohmann(norm(sub(earth.position,sun.position)),norm(sub(mars.position,sun.position)),G*s.settings.gMultiplier*sun.mass):null,plan=h?{totalDV:Math.abs(h.departure)+Math.abs(h.arrival),duration:h.duration,arrivalDV:Math.abs(h.arrival),model:'Circular coplanar Hohmann estimate; departure phase and inclination omitted.'}:transferPlan(s,'earth','mars',transferDays);rows.push({value,complete:true,totalDV:plan.totalDV,travelTime:plan.duration,arrivalVelocity:plan.arrivalDV,model:plan.model});}
   else {const altered=structuredClone(scenario);applyOperation(altered,{kind,bodyId,mode:kind==='velocity'?'multiply':'multiply',value,factor:value,relative:true,vector:[0,0,0]});const result=compareExperiments(scenario,altered,{duration,resolution:24,ids:[bodyId],targetId,maxMs:Math.min(1000,deadline-performance.now())});rows.push({value,complete:result.complete,advanced:result.advanced,positionDifference:result.comparison?.rows.find(x=>x.id===bodyId)?.positionDifference??null,closestApproach:result.closestApproach?.experiment?.distance??null,reason:result.reason});}
  }catch(e){rows.push({value,complete:false,error:e.message});}
 }
 const completed=rows.filter(x=>x.complete);
 return {rows,requestedSamples:count,completedSamples:completed.length,partial:rows.length<count,bestDV:completed.filter(x=>x.totalDV!=null).sort((a,b)=>a.totalDV-b.totalDV)[0]??null,bestEncounter:completed.filter(x=>x.closestApproach!=null).sort((a,b)=>a.closestApproach-b.closestApproach)[0]??null,model:kind==='departure'?(transferType==='hohmann'?'Coarse circular coplanar Hohmann estimates; phase/inclination omitted, not a flown mission.':'Coarse JPL Table 1 / two-body Lambert estimates, not a flown mission.'):'Bounded cloned-engine samples; incomplete horizons are excluded from rankings.'};
}
