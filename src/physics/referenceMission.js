import {reproducibilityMetadata} from '../version.js';
import {Engine} from './engine.js';
import {baseScenario,realityBodies,earthBody} from './catalog.js';
import {body} from './body.js';
import {defaultRocket,rocketMass,vehicleTelemetry} from './vehicles.js';
import {stationPosition} from './vehicles.js';
import {applyFuelBurn} from './flight.js';
import {lambert,hyperbolicDeparture,sphereOfInfluence} from './transfers.js';
import {orbitalElements} from './orbital.js';
import {stateAt} from './elements.js';
import {G,DAY,julianDate,add,sub,scale,norm,unit,dot,cross} from './units.js';

export const REFERENCE_MISSION={version:1,id:'earth-mars-reference',name:'Earth → Mars Reference Mission',
 launchUTC:'2031-01-01T00:00:00Z',flightDays:260,parkingAltitude:200000,targetPeriapsis:6000000,
 captureSafetyAltitude:200000,settleOrbits:2,seed:20310101,propagation:'full-n-body',
 criteria:{parkingEccentricity:.08,parkingMinAltitude:150000,maxEncounterRadius:3e8,minimumMarsPeriapsis:200000,maximumMarsApoapsis:1.2e7,maxEnergyDriftPercent:.01},
 models:{frame:'J2000 ecliptic inertial',time:'UTC-tagged elapsed SI seconds',ephemeris:'JPL Table 1 + approximate Earth–Moon geometry',atmosphere:'Layered dry hydrostatic approximation',burns:'Fuel-aware ideal impulses after continuous-thrust ascent'}};

export function referenceScenario(definition=REFERENCE_MISSION){
 const d=structuredClone(definition),s=baseScenario(d.name);s.jd=julianDate(d.launchUTC);
 s.bodies=realityBodies(s.jd).filter(b=>b.type!=='moon'||b.id==='moon');
 const earth=s.bodies.find(b=>b.id==='earth'),atmospheric=earthBody();earth.atmosphere=atmospheric.atmosphere;
 const r=defaultRocket();
 r.stages=[{name:'Booster',dryMass:40000,fuel:600000,capacity:600000,thrust:16000000,isp:320,engineCount:1},
 {name:'Orbital stage',dryMass:12000,fuel:250000,capacity:250000,thrust:3500000,isp:440,engineCount:1},
 {name:'Transfer stage',dryMass:1500,fuel:25000,capacity:25000,thrust:200000,isp:450,engineCount:1,autoIgnite:false}];
 r.payloadMass=1000;r.targetAltitude=d.parkingAltitude;
 const sun=s.bodies.find(b=>b.id==='sun'),arrival=stateAt('mars',s.jd+d.flightDays),planned=lambert(sub(earth.position,sun.position),arrival.position,d.flightDays*DAY,G*sun.mass),vinf=unit(sub(add(sun.velocity,planned.departure),earth.velocity));
 const axis=unit(earth.spin.axis),normal=unit(sub(axis,scale(vinf,dot(axis,vinf))));r.launchPlaneNormal=normal;
 let pad=unit(cross(normal,axis));if(norm(pad)<.5)pad=[1,0,0];
 const local=scale(pad,earth.radius+30),position=add(earth.position,local);
 const velocity=add(earth.velocity,cross(scale(unit(earth.spin.axis),2*Math.PI/earth.spin.period),local));
 s.bodies.push(body({id:'reference-vehicle',name:'Mars validation vehicle',type:'rocket',radius:5,mass:rocketMass(r),massless:true,locked:true,
  parentId:'earth',collisionMode:'none',position,velocity,rocket:r,material:'spacecraft',createdAt:d.launchUTC}));
 for(const b of s.bodies)b.createdAt=d.launchUTC;
 s.mode='sandbox';s.settings={...s.settings,integrator:'rk4',adaptive:false,softening:1,roche:false,collisionMode:'none',solver:'direct',stepSeconds:.25};
 s.provenance={source:'jpl',epochJD:s.jd,note:d.models.ephemeris};
 s.mission={name:d.name,epochJD:s.jd,definition:d,validation:{status:'NOT RUN',checks:[],metrics:{},timeline:[]}};
 s.view={...s.view,selected:'reference-vehicle',targetId:'mars',panel:'mission',scale:'vehicle',cameraMode:'rocket',showSOI:true};
 return s;
}
const get=(s,id)=>s.bodies.find(b=>b.id===id);
export function coastStep(s,limit=1800){
 const b=get(s,'reference-vehicle');let dt=limit;
 if(b)for(const id of ['earth','mars']){const p=get(s,id);if(!p)continue;const r=norm(sub(b.position,p.position)),v=norm(sub(b.velocity,p.velocity));
  dt=Math.min(dt,Math.max(.25,.025*Math.min(r/Math.max(v,1),Math.sqrt(r**3/(G*p.mass)))));
 }
 return dt;
}
function integrateTo(engine,jd,{sample,onSample,cancel}={}){
 let steps=0;
 while(engine.s.jd<jd-1e-10){
  if(cancel?.())throw new Error('Mission cancelled');
  engine.s.settings.stepSeconds=Math.min(coastStep(engine.s),(jd-engine.s.jd)*DAY);
  if(engine.s.settings.stepSeconds<.01)break;
  engine.advance(engine.s.settings.stepSeconds,{deterministic:true});
  if(sample&&steps++%sample===0)onSample?.(engine);
 }
}
function solve3(A,b){
 const m=A.map((row,i)=>[...row,b[i]]);
 for(let i=0;i<3;i++){let pivot=i;for(let j=i+1;j<3;j++)if(Math.abs(m[j][i])>Math.abs(m[pivot][i]))pivot=j;
  [m[i],m[pivot]]=[m[pivot],m[i]];if(Math.abs(m[i][i])<1e-10)throw new Error('Trajectory correction matrix is singular');
  const f=m[i][i];for(let k=i;k<4;k++)m[i][k]/=f;
  for(let j=0;j<3;j++)if(j!==i){const q=m[j][i];for(let k=i;k<4;k++)m[j][k]-=q*m[i][k];}
 }
 return m.map(row=>row[3]);
}
function shoot(snapshot,arrivalJD,targetPosition,velocity,{cancel,notify=()=>{}}={}){
 const trial=v=>{const e=new Engine();e.load(snapshot);get(e.s,'reference-vehicle').velocity=[...v];integrateTo(e,arrivalJD,{cancel});return get(e.s,'reference-vehicle').position;};
 let guess=[...velocity],error=Infinity;
 for(let iteration=0;iteration<12;iteration++){
  const end=trial(guess),residual=sub(targetPosition,end);error=norm(residual);notify(iteration,error);
  if(error<100000)return {velocity:guess,error,iterations:iteration+1};
  const columns=[0,1,2].map(k=>{const v=[...guess];v[k]+=5;return scale(sub(trial(v),end),.2);});
  const matrix=[0,1,2].map(k=>columns.map(c=>c[k])),correction=solve3(matrix,residual),length=norm(correction);
  guess=add(guess,scale(correction,Math.min(1,500/Math.max(length,1))));
 }
 throw new Error('N-body transfer targeting did not converge; final position residual '+error+' m');
}
function finiteSnapshot(engine,phase){
 const s=structuredClone(engine.s);s.telemetry=s.telemetry.slice(-60);s.events=s.events.slice(-60);
 return {jd:s.jd,phase,scenario:s};
}
export async function runReferenceMission({definition=REFERENCE_MISSION,initial=null,progress=()=>{},cancel=()=>false,yieldTask=()=>Promise.resolve()}={}){
 const d=structuredClone(definition),engine=new Engine();engine.load(initial??referenceScenario(d));
 engine.recordedSteps=[];const tape={version:1,initial:structuredClone(engine.s),steps:engine.recordedSteps,commands:[],seed:d.seed,definition:d};
 const command=entry=>tape.commands.push({step:engine.recordedSteps.length,bodyId:'reference-vehicle',...structuredClone(entry)});
 const control=patch=>{command({type:'control',patch});Object.assign(get(engine.s,'reference-vehicle').rocket,patch);};
 const recorder=[];const record=()=>{if(recorder.length<4000){const b=get(engine.s,'reference-vehicle'),p=get(engine.s,b.parentId);const t=vehicleTelemetry(b,p,engine.s.jd,engine.s.settings);if(t)recorder.push({...t,position:[...b.position],velocity:[...b.velocity],stage:b.rocket.stage,targetDistance:norm(sub(b.position,get(engine.s,'mars').position))});}};
 const start=engine.s.jd,metrics={launchJD:start},checks=[],timeline=[],snapshots=[],burns=[];
 let lastStats=null,peakAcceleration=0;
 const check=(id,passed,value,criterion)=>checks.push({id,passed,value,criterion});
 const event=(kind,message,data={})=>{timeline.push({kind,message,jd:engine.s.jd,met:(engine.s.jd-start)*DAY,...data});engine.log(kind==='TMI'||kind.includes('correction')||kind==='Mars orbit insertion'?'burn':'mission',kind+': '+message,['reference-vehicle']);};
 const snapshot=phase=>{record();if(snapshots.length<220)snapshots.push(finiteSnapshot(engine,phase));};
 const report=(phase,fraction)=>progress({phase,fraction,jd:engine.s.jd,checks:structuredClone(checks),metrics:structuredClone(metrics)});
 const burn=(kind,dv)=>{const b=get(engine.s,'reference-vehicle'),before=structuredClone(b.velocity),fuel=applyFuelBurn(b,dv);command({type:'burn',vector:dv});
  burns.push({kind,jd:engine.s.jd,plannedDeltaV:norm(dv),actualDeltaV:norm(sub(b.velocity,before)),vector:dv,fuelUsed:fuel,timingError:0,model:'Fuel-aware ideal impulse'});
  event(kind,kind+' executed',{deltaV:norm(dv),fuel});return norm(dv);};
 try{
  const b=get(engine.s,'reference-vehicle');command({type:'control',locked:false,patch:{phase:'ignition',engineOn:true}});b.locked=false;b.rocket.phase='ignition';b.rocket.engineOn=true;event('ignition','Reference launch ignition');snapshot('ignition');
  while(b.rocket.met<2200&&!['orbital insertion','crashed','fuel exhausted'].includes(b.rocket.phase)){
   engine.advance(.25,{deterministic:true});peakAcceleration=Math.max(peakAcceleration,vehicleTelemetry(b,get(engine.s,'earth'),engine.s.jd,engine.s.settings).acceleration);
   if(Math.round(b.rocket.met*4)%20===0)record();
   if(Math.round(b.rocket.met*4)%400===0){snapshot('ascent');report(b.rocket.phase,.08*b.rocket.met/2200);await yieldTask();if(cancel())throw new Error('Mission cancelled');}
  }
  let t=vehicleTelemetry(b,get(engine.s,'earth'),engine.s.jd,engine.s.settings);
  metrics.parkingAltitude=t.altitude;metrics.parkingPeriapsis=t.periapsis;metrics.parkingApoapsis=t.apoapsis;metrics.parkingEccentricity=t.elements.e;metrics.parkingJD=engine.s.jd;
  check('parking-orbit',t.elements.e<d.criteria.parkingEccentricity&&t.periapsis>d.criteria.parkingMinAltitude,t.elements.e,'e < '+d.criteria.parkingEccentricity+', periapsis > '+d.criteria.parkingMinAltitude+' m');
  if(!checks.at(-1).passed)throw new Error('Launch did not achieve the required parking orbit');
  event('parking','Stable parking orbit measured',metrics);snapshot('parking');
  control({autopilot:false,phase:'coasting',stageRequested:true,engineOn:false});
  engine.advance(.25,{deterministic:true});
  control({engineOn:false,phase:'coasting'});
  const arrivalJD=start+d.flightDays,planetEngine=new Engine();
  planetEngine.load({...structuredClone(engine.s),bodies:engine.s.bodies.filter(x=>!x.massless),maneuvers:[],telemetry:[]});
  integrateTo(planetEngine,arrivalJD,{cancel});const futureMars=get(planetEngine.s,'mars'),sun=get(engine.s,'sun');
  let escape=null,parkingLoops=0;metrics.maximumDeparturePeriapsis=0;
  while(parkingLoops++<2500){
   const earth=get(engine.s,'earth'),target=sub(futureMars.position,sun.position);
   const transfer=lambert(sub(earth.position,sun.position),target,(arrivalJD-engine.s.jd)*DAY,G*sun.mass);
   const vinf=sub(add(sun.velocity,transfer.departure),earth.velocity);
   try{const candidate=hyperbolicDeparture(sub(b.position,earth.position),vinf,G*earth.mass);
    metrics.maximumDeparturePeriapsis=Math.max(metrics.maximumDeparturePeriapsis,candidate.periapsis);metrics.searchVInfinity=norm(vinf);metrics.searchOrbitRadius=norm(sub(b.position,earth.position));
    if(candidate.periapsis>earth.radius+100000&&dot(unit(candidate.velocity),unit(sub(b.velocity,earth.velocity)))>.8&&dot(candidate.velocity,sub(b.position,earth.position))>=0){escape={...candidate,vinf,transfer};break;}}catch{}
   engine.s.settings.stepSeconds=5;engine.advance(5,{deterministic:true});
  }
  if(!escape)throw new Error('No safe hyperbolic departure geometry found within the parking window');
  const earth=get(engine.s,'earth'),arrivalDirection=unit(sub(escape.transfer.arrival,sub(futureMars.velocity,sun.velocity)));
  const aim=add(futureMars.position,scale(arrivalDirection,-2e8));
  report('N-body transfer targeting',.1);await yieldTask();
  const solution=shoot(engine.s,arrivalJD,aim,add(earth.velocity,escape.velocity),{cancel,notify:(iteration,error)=>progress({phase:'TMI targeting iteration '+(iteration+1),fraction:.1,error})});
  metrics.targetingResidual=solution.error;metrics.requestedTmiDeltaV=norm(sub(solution.velocity,b.velocity));metrics.transferVInfinity=norm(escape.vinf);metrics.departurePeriapsis=escape.periapsis;metrics.tmiDeltaV=burn('TMI',sub(solution.velocity,b.velocity));check('tmi',metrics.tmiDeltaV>0,metrics.tmiDeltaV,'Fuel-aware burn executed');
  metrics.tmiHeliocentricElements=orbitalElements(sub(b.position,sun.position),sub(b.velocity,sun.velocity),G*sun.mass);snapshot('TMI');
  let corrected=false,enteredMars=false,exitedEarth=false,nextRecord=engine.s.jd;
  while(engine.s.jd<arrivalJD-1e-8){
   if(cancel())throw new Error('Mission cancelled');
   const primaryBefore=b.parentId;
   engine.s.settings.stepSeconds=Math.min(coastStep(engine.s),(arrivalJD-engine.s.jd)*DAY);
   lastStats=engine.advance(engine.s.settings.stepSeconds,{deterministic:true});
   if(!exitedEarth&&b.parentId!=='earth'){exitedEarth=true;metrics.earthEscape={jd:engine.s.jd,position:sub(b.position,get(engine.s,'earth').position),velocity:sub(b.velocity,get(engine.s,'earth').velocity)};metrics.heliocentricTransfer=orbitalElements(sub(b.position,sun.position),sub(b.velocity,sun.velocity),G*sun.mass);event('Earth SOI exit','Measured Earth influence exit');snapshot('Earth SOI exit');}
   if(!enteredMars&&b.parentId==='mars'){enteredMars=true;event('Mars SOI entry','Measured Mars influence entry');snapshot('Mars SOI entry');}
   if(!corrected&&engine.s.jd>=start+d.flightDays/2){
    report('Midcourse targeting',.5);await yieldTask();const correction=shoot(engine.s,arrivalJD,aim,b.velocity,{cancel});
    metrics.midcourseDeltaV=burn('Midcourse correction',sub(correction.velocity,b.velocity));corrected=true;snapshot('midcourse');
   }
   if(engine.s.jd>=nextRecord){nextRecord+=2;snapshot('heliocentric cruise');report('Heliocentric cruise',.2+.5*Math.min(1,(engine.s.jd-start)/d.flightDays));await yieldTask();}
  }
  check('Earth-SOI-exit',exitedEarth,exitedEarth,'Parent changed through measured SOI crossing');
  metrics.plannedVsActual={arrivalJD,arrivalTimeErrorSeconds:(engine.s.jd-arrivalJD)*DAY,positionErrorMeters:norm(sub(b.position,aim)),velocityErrorMetersPerSecond:norm(sub(sub(b.velocity,sun.velocity),escape.transfer.arrival)),targetPosition:aim,actualPosition:[...b.position],plannedHeliocentricVelocity:escape.transfer.arrival,actualHeliocentricVelocity:sub(b.velocity,sun.velocity),model:'Lambert/patched-departure plan corrected by N-body shooting; arrival aim is 200,000 km upstream of Mars, not its center'};
  const mars=get(engine.s,'mars');metrics.marsApproachDistance=norm(sub(b.position,mars.position));metrics.marsRelativeArrivalVelocity=norm(sub(b.velocity,mars.velocity));
  check('Mars-encounter',metrics.marsApproachDistance<d.criteria.maxEncounterRadius,metrics.marsApproachDistance,'Range < '+d.criteria.maxEncounterRadius+' m');
  if(!checks.at(-1).passed)throw new Error('Mars approach outside encounter tolerance');
  const r=sub(b.position,mars.position),relative=sub(b.velocity,mars.velocity),mu=G*mars.mass,energy=dot(relative,relative)/2-mu/norm(r),vinf2=Math.max(0,2*energy);
  const rp=mars.radius+d.targetPeriapsis,angularMomentum=rp*Math.sqrt(vinf2+2*mu/rp),vt=angularMomentum/norm(r),vr=-Math.sqrt(Math.max(0,vinf2+2*mu/norm(r)-vt*vt));
  let tangent=unit(sub(relative,scale(unit(r),dot(relative,unit(r)))));if(norm(tangent)<.5)tangent=unit(cross([0,0,1],unit(r)));
  metrics.encounterCorrectionDeltaV=burn('Encounter targeting',sub(add(scale(unit(r),vr),scale(tangent,vt)),relative));
  snapshot('encounter targeting');let minimum=Infinity,previousRadial=-Infinity,approachSteps=0;
  while(approachSteps++<100000){
   const p=get(engine.s,'mars'),r=sub(b.position,p.position),v=sub(b.velocity,p.velocity),range=norm(r),radial=dot(r,v)/range;minimum=Math.min(minimum,range);
   if(range<=p.radius)throw new Error('Vehicle impacted Mars');
   if(previousRadial<0&&radial>=0&&approachSteps>2)break;previousRadial=radial;
   engine.s.settings.stepSeconds=Math.min(coastStep(engine.s,120),Math.max(.25,(range-rp)/Math.max(-radial,1)*.1));
   lastStats=engine.advance(engine.s.settings.stepSeconds,{deterministic:true});
   if(approachSteps%2000===0){report('Mars periapsis approach',.82);await yieldTask();if(cancel())throw new Error('Mission cancelled');}
  }
  if(approachSteps>=100000)throw new Error('Mars periapsis not reached within bounded steps');
  metrics.closestMarsApproach=minimum;
  const rr=sub(b.position,mars.position),vv=sub(b.velocity,mars.velocity),prograde=unit(sub(vv,scale(unit(rr),dot(vv,unit(rr)))));
  metrics.captureDeltaV=burn('Mars orbit insertion',sub(scale(prograde,Math.sqrt(mu/norm(rr))),vv));
  let final=orbitalElements(rr,sub(b.velocity,mars.velocity),mu);
  check('Mars-bound',final.specificEnergy<0,final.specificEnergy,'Mars-relative specific energy < 0');
  const settleJD=engine.s.jd+final.period*d.settleOrbits/DAY;snapshot('capture');report('Verifying stable Mars orbit',.92);
  integrateTo(engine,settleJD,{cancel,sample:400,onSample:()=>snapshot('Mars orbit')});
  final=orbitalElements(sub(b.position,mars.position),sub(b.velocity,mars.velocity),mu);
  metrics.finalMarsPeriapsis=final.periapsis-mars.radius;metrics.finalMarsApoapsis=final.apoapsis-mars.radius;metrics.finalMarsEccentricity=final.e;
  check('safe-final-periapsis',metrics.finalMarsPeriapsis>d.criteria.minimumMarsPeriapsis,metrics.finalMarsPeriapsis,'Periapsis altitude > '+d.criteria.minimumMarsPeriapsis+' m');
  check('bounded-final-apoapsis',metrics.finalMarsApoapsis<d.criteria.maximumMarsApoapsis,metrics.finalMarsApoapsis,'Apoapsis altitude < '+d.criteria.maximumMarsApoapsis+' m');
  metrics.durationSeconds=(engine.s.jd-start)*DAY;metrics.propellantUsed=b.rocket.consumedPropellant??0;metrics.remainingPropellant=b.rocket.stages.slice(b.rocket.stage).reduce((sum,x)=>sum+x.fuel,0);metrics.discardedPropellant=b.rocket.stages.slice(0,b.rocket.stage).reduce((sum,x)=>sum+x.fuel,0);
  metrics.totalDeltaV=b.rocket.propulsiveDeltaV??0;metrics.maxQ=b.rocket.maxQState;metrics.maxAcceleration=peakAcceleration;
  const numerical=engine.advance(0,{deterministic:true});metrics.energyDriftPercent=numerical.energyDrift;metrics.angularMomentumDriftPercent=numerical.angularDrift;
  const unreliable=Math.abs(numerical.energyDrift)>d.criteria.maxEnergyDriftPercent;
  check('numerical-drift',!unreliable,numerical.energyDrift,'Source-system energy drift < '+d.criteria.maxEnergyDriftPercent+'%');
  const status=unreliable?'NUMERICALLY UNRELIABLE':checks.every(x=>x.passed)?'SUCCESS':'PARTIAL SUCCESS';
  for(const e of engine.s.events.filter(e=>['staging','mission','insertion','soi'].includes(e.kind)))if(!timeline.some(x=>x.message===e.message))timeline.push({kind:e.kind,message:e.message,jd:e.jd,met:(e.jd-start)*DAY});timeline.sort((a,b)=>a.jd-b.jd);
  const result={version:1,status,definition:d,checks,metrics,timeline,burns,tape,recorder,initial:initial??referenceScenario(d),final:engine.s,snapshots,
   reproducibility:{...reproducibilityMetadata(engine.s),scenarioVersion:2,integrator:'rk4',solver:'direct',seed:d.seed,sequence:'State-dependent coast steps; fixed 0.25 s powered ascent; no wall-clock budget',models:d.models}};
  engine.s.mission.validation={status,checks,metrics,timeline,burns};snapshot('complete');report(status,1);return result;
 }catch(error){
  const status=checks.some(x=>x.passed)?'PARTIAL SUCCESS':'FAILED';
  const result={version:1,status,error:error.message,definition:d,checks,metrics,timeline,burns,tape,recorder,initial:initial??referenceScenario(d),final:engine.s,snapshots};
  engine.s.mission.validation={status,error:error.message,checks,metrics,timeline,burns};report(status,1);return result;
 }
}
