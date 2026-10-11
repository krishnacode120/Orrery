import {Engine} from './engine.js';
import {body} from './body.js';
import {baseScenario} from './catalog.js';
import {G,AU,DAY,SOLAR_MASS,julianDate,sub,norm,scale,add} from './units.js';
import {stateAt} from './elements.js';
import {lambert} from './transfers.js';
import {orbitalElements} from './orbital.js';
import {replayMissionTape} from './deterministic.js';
export const randomSeed=seed=>{let x=seed>>>0;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};};
export function modelQuality(s,stats){
 const p=s.settings;return {ephemeris:s.mode==='reality'?(s.ephemeris?'Horizons sampled playback':'JPL approximate Table 1'):s.provenance.source==='horizons'?'Horizons initialization → numerical propagation':'Numerical propagation from '+s.provenance.source,
 gravity:'Mutual direct Newtonian sources; '+(p.solver==='direct'?'direct':'octree / direct auto')+' non-sourcing tracers',
 integrator:p.integrator,timestep:stats?.lastDt??p.stepSeconds,tolerance:p.rtol,
 relativity:p.gr?'Dominant-primary 1PN approximation':'Disabled',
 atmosphere:'Layered dry Earth / exponential Mars · approximate',moons:'Circular initial phases unless Horizons loaded',
 warnings:[...(stats?.warnings??[]),'Ideal impulse maneuver model; no finite-burn interplanetary guidance','Prime meridians are illustrative, not IAU/SPICE orientation','Future UTC uses latest known leap-second offset']};
}
export function porkchop({from='earth',to='mars',departure='2031-01-01',spanDays=500,minFlightDays=150,maxFlightDays=350,size=20}={}){
 if(!['earth','venus','mars','jupiter','saturn'].includes(from)||!['earth','venus','mars','jupiter','saturn'].includes(to)||from===to)throw new Error('Invalid transfer bodies');
 if(!Number.isInteger(size)||size<4||size>40||!Number.isFinite(spanDays)||spanDays<1||spanDays>2000||!Number.isFinite(minFlightDays)||!Number.isFinite(maxFlightDays)||minFlightDays<1||maxFlightDays<=minFlightDays||maxFlightDays>4000)throw new Error('Invalid bounded transfer grid');
 const start=julianDate(departure),cells=[];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const depJD=start+x/(size-1)*spanDays,arrivalJD=start+minFlightDays+y/(size-1)*(spanDays+maxFlightDays-minFlightDays),flightDays=arrivalJD-depJD;
  try{if(flightDays<minFlightDays||flightDays>maxFlightDays)throw new Error('Outside flight duration bounds');const a=stateAt(from,depJD),b=stateAt(to,arrivalJD),solution=lambert(a.position,b.position,flightDays*DAY,G*SOLAR_MASS),departureVInfinity=norm(sub(solution.departure,a.velocity)),arrivalVInfinity=norm(sub(solution.arrival,b.velocity));
   cells.push({x,y,depJD,arrivalJD,flightDays,departureC3:departureVInfinity**2,departureVInfinity,arrivalVInfinity,totalDeltaV:departureVInfinity+arrivalVInfinity,departureVector:solution.departure,arrivalVector:solution.arrival});
  }catch{cells.push({x,y,depJD,arrivalJD,flightDays,unavailable:true});}
 }
 const best=cells.filter(c=>!c.unavailable).sort((a,b)=>a.totalDeltaV-b.totalDeltaV).slice(0,8);
 return {from,to,size,cells,best,model:'Zero-revolution heliocentric Lambert with JPL Table 1 endpoints. Excess-speed sum is not launch/capture fuel Δv.'};
}
export function stressScenario(count=1000,kind='belt',seed=42){
 if(!Number.isInteger(count)||count<1||count>19000)throw new Error('Stress particle count must be 1–19,000');
 const s=baseScenario(count+' tracer '+kind),rand=randomSeed(seed);s.jd=julianDate('2031-01-01');s.mode='sandbox';s.bodies=[body({id:'sun',name:'Benchmark source',mass:SOLAR_MASS,radius:6.957e8,type:'star'})];
 for(let i=0;i<count;i++){const a=kind==='ring'?AU:AU*(1.8+rand()*1.5),angle=rand()*2*Math.PI,z=(rand()-.5)*a*(kind==='ring'?.005:.15),v=Math.sqrt(G*SOLAR_MASS/a);
  s.bodies.push(body({id:'tracer-'+i,name:'Tracer '+i,type:'asteroid',mass:0,massless:true,radius:50,collisionMode:'none',position:[a*Math.cos(angle),a*Math.sin(angle),z],velocity:[-v*Math.sin(angle),v*Math.cos(angle),0],parentId:'sun',trail:{length:0,color:'#aaaaaa'}}));}
 s.settings={...s.settings,solver:'tree',collisionMode:'none',roche:false,stepSeconds:1800};s.view.panel='science';return s;
}
export function benchmarkScenario(s,{steps=10,solvers=['direct','tree'],integrators=['verlet','rk4','dopri']}={}){
 if(!Number.isInteger(steps)||steps<1||steps>1000||s.bodies.length>20000||!solvers.every(x=>['direct','tree'].includes(x))||!integrators.every(x=>['verlet','rk4','dopri'].includes(x)))throw new Error('Invalid benchmark budget');
 const duration=steps*s.settings.stepSeconds,results=[];
 const propagate=(integrator,solver,tolerance=s.settings.rtol)=>{
  const e=new Engine();e.load({...structuredClone(s),mode:'sandbox',settings:{...s.settings,integrator,solver,rtol:tolerance,collisionMode:'none',roche:false}});
  let remaining=duration,accepted=0,rejected=0,stats;const started=performance.now();
  while(remaining>1e-7&&accepted<10000){stats=e.advance(remaining,{deterministic:true,maxSteps:Math.min(512,10000-accepted)});if(stats.advanced<=0)break;remaining-=stats.advanced;accepted=stats.accepted;rejected=stats.rejected;}
  return {e,stats,elapsedMs:performance.now()-started,accepted,rejected,remaining};
 };
 const reference=propagate('dopri','direct',1e-12);
 for(const integrator of integrators)for(const solver of solvers){
  const r=propagate(integrator,solver);let maximumPositionError=0;
  const comparable=r.remaining<1e-6&&reference.remaining<1e-6;
  if(comparable)for(let i=0;i<r.e.s.bodies.length;i++)maximumPositionError=Math.max(maximumPositionError,norm(sub(r.e.s.bodies[i].position,reference.e.s.bodies[i].position)));
  results.push({integrator,solver,elapsedMs:r.elapsedMs,stepsPerSecond:r.accepted*1000/Math.max(.001,r.elapsedMs),accepted:r.accepted,rejected:r.rejected,advanced:duration-r.remaining,energyDriftPercent:r.stats?.energyDrift,maximumPositionError:comparable?maximumPositionError:null,complete:comparable,reference:'Direct Dormand–Prince, rtol 1e-12, same elapsed time; numerical reference, not exact truth'});
 }return results;
}
export function missionUncertainty(result,{samples=4,seed=42,magnitudeFraction=.001,directionRadians=.001,timingSteps=1}={}){
 if(!result.tape||!Number.isInteger(samples)||samples<1||samples>8||!Number.isFinite(magnitudeFraction)||magnitudeFraction<0||magnitudeFraction>.1||!Number.isFinite(directionRadians)||directionRadians<0||directionRadians>.1||!Number.isInteger(timingSteps)||timingSteps<0||timingSteps>20)throw new Error('Invalid uncertainty configuration');
 const rand=randomSeed(seed),runs=[];
 for(let i=0;i<samples;i++){const tape=structuredClone(result.tape);for(const c of tape.commands)if(c.type==='burn'){const v=c.vector,amount=norm(v);c.vector=add(scale(v,1+(rand()*2-1)*magnitudeFraction),[0,1,2].map(()=>amount*(rand()*2-1)*directionRadians));c.step=Math.max(0,Math.min(tape.steps.length,c.step+Math.round((rand()*2-1)*timingSteps)));}
  try{const s=replayMissionTape(tape),b=s.bodies.find(x=>x.id==='reference-vehicle'),mars=s.bodies.find(x=>x.id==='mars'),nominal=result.final.bodies.find(x=>x.id===b.id),r=sub(b.position,mars.position),v=sub(b.velocity,mars.velocity),o=orbitalElements(r,v,G*mars.mass);
   runs.push({sample:i,positionError:norm(sub(b.position,nominal.position)),marsRange:norm(r),relativeSpeed:norm(v),captured:!b.locked&&o.specificEnergy<0&&o.periapsis>mars.radius+result.definition.captureSafetyAltitude,periapsis:o.periapsis-mars.radius});
  }catch(error){runs.push({sample:i,captured:false,error:error.message});}
 }
 return {seed,samples,runs,captureSuccessFraction:runs.filter(x=>x.captured).length/samples,model:'Perturbed ideal impulses on the recorded step sequence. Sample fraction is not a calibrated probability; no retargeting.'};
}
export function missionDebrief(result){
 const m=result.metrics;return '# '+result.definition.name+'\n\nOutcome: '+result.status+'\n\n'+Object.entries(m).filter(([,v])=>typeof v==='number').map(([k,v])=>'- '+k+': '+v).join('\n')+'\n\nModels: '+JSON.stringify(result.definition.models)+'\n\n'+result.checks.map(c=>'- '+(c.passed?'PASS':'FAIL')+' '+c.id+': '+c.criterion).join('\n');
}
