import {useState,useMemo} from 'react';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {scalePreset} from '../components/viewSpace.js';
import {measure,sphereOfInfluence,transferPlan,planVehicleDeparture} from '../physics/transfers.js';
import {deltaVBudget} from '../physics/flight.js';
import {defaultRocket,rocketMass} from '../physics/vehicles.js';
import {body} from '../physics/body.js';
import {spacecraftAt} from '../physics/catalog.js';
import {G,AU,DAY,add,sub,scale,norm,unit,cross,fromJulianDate} from '../physics/units.js';
import {uid} from '../store/actions.js';
import {Select,Toggle,NumberField,Readouts,fmt} from './Fields.jsx';
import {Field} from './styles.js';
import {focusBody} from './Workspace.jsx';
export function Measurement(){
 const sim=useSimStore(),s=sim.scenario,ui=useUIStore(),[observer,setObserver]=useState('sun');
 const choices=s.bodies.filter(b=>!b.disrupted).map(b=>[b.id,b.name]),a=s.bodies.find(b=>b.id===(ui.measurementFrom??s.view.selected)),b=s.bodies.find(b=>b.id===ui.measurementTo),o=s.bodies.find(b=>b.id===observer),m=a&&b?measure(a,b,o,s.settings.c):null;
 return <div className="stack"><h2>Measure</h2><Select label="From" value={a?.id??''} options={[['','Choose'],...choices]} commit={x=>ui.update({measurementFrom:x})}/><Select label="To" value={b?.id??''} options={[['','Choose'],...choices]} commit={x=>ui.update({measurementTo:x})}/><Select label="Angular observer" value={observer} options={choices} commit={setObserver}/>{m&&<Readouts values={[['Distance',fmt(m.distance/1000)+' km'],['Distance · AU',fmt(m.distance/AU,6)],['Relative speed',fmt(m.relativeSpeed/1000,3)+' km/s'],['One-way light time',fmt(m.lightTime,2)+' s'],['Angular separation',m.angle==null?'Undefined at observer':fmt(m.angle*180/Math.PI,3)+'°']]}/>}<small>Live inertial state. Angular separation is measured at the chosen observer; light time assumes straight-line propagation.</small></div>;
}
export function spawnRocket(s,primaryId='earth',parking=false){
 const p=s.bodies.find(b=>b.id===primaryId);if(!p||!['planet','moon','dwarf','rogue'].includes(p.type))throw new Error('Select a planet or moon as departure');
 const r=defaultRocket(),b=spacecraftAt(p,{altitude:parking?200000:30,inclination:0},0,s.jd);
 Object.assign(b,{id:uid('rocket'),name:'Explorer launch vehicle',type:'rocket',mass:rocketMass(r),radius:5,rocket:r,spacecraft:null,locked:!parking});
 if(!parking){const local=sub(b.position,p.position);b.velocity=add(p.velocity,cross(scale(unit(p.spin.axis),2*Math.PI/p.spin.period),local));}
 else {r.phase='orbital insertion';r.engineOn=false;r.attitudeMode='prograde';}
 s.bodies.push(b);s.view.selected=b.id;s.view.panel='mission';s.view.scale='vehicle';s.view.cameraMode='rocket chase';
 s.mode='sandbox';s.ephemeris=null;s.settings.stepSeconds=parking?10:.25;s.settings.softening=1;s.settings.timeScale=10;s.settings.collisionMode='none';s.settings.roche=false;
 return b;
}
export function MissionPlanner({run}){
 const sim=useSimStore(),s=sim.scenario,ui=useUIStore();
 const [epoch,setEpoch]=useState(fromJulianDate(s.jd).toISOString().slice(0,10));
 const [source,setSource]=useState(s.bodies.some(b=>b.id==='earth')?'earth':s.bodies[0]?.id??''),[target,setTarget]=useState('mars'),[days,setDays]=useState(259),[plan,setPlan]=useState(null),[fuel,setFuel]=useState(true);
 const bodies=s.bodies.filter(b=>!b.disrupted),selected=bodies.find(b=>b.id===s.view.selected);
 const calculate=()=>run(()=>{const p=planVehicleDeparture(useSimStore.getState().scenario,source,target,days);setPlan(p);sim.configureView({transferPreview:p,transferPath:true,targetId:target});});
 const queue=()=>run(()=>sim.edit(d=>{
  const b=d.bodies.find(x=>x.id===source);if(!b?.rocket&&!b?.spacecraft)throw new Error('Choose the actual vehicle as departure to schedule its maneuver');
  if(d.mode!=='sandbox')throw new Error('Convert to Sandbox first');
  const p=planVehicleDeparture(d,source,target,days);
  d.maneuvers.push({id:uid('transfer'),bodyId:b.id,jd:d.jd,deltaV:p.departureDV,direction:'vector',vector:p.departureVector,executed:false,fuelAware:!!b.rocket&&fuel});
  d.mission={...d.mission,name:b.name+' → '+d.bodies.find(x=>x.id===target).name,targetId:target,transfer:p};d.view.predictionEnabled=true;d.view.predictionDuration=p.duration;d.view.targetId=target;
 }));
 const cruise=()=>run(()=>sim.edit(d=>{
  const sourceBody=d.bodies.find(b=>b.id===source);if(!sourceBody||sourceBody.massless)throw new Error('Choose a departure planet for a cruise demonstration');
  const p=transferPlan(d,source,target,days),radius=sphereOfInfluence(sourceBody,d.bodies,d.settings)??sourceBody.radius*20;
  const b=spacecraftAt(sourceBody,{altitude:radius*1.05},0,d.jd);b.id=uid('cruise');b.name='Transfer explorer';b.type='spacecraft';
  b.position=add(sourceBody.position,scale(unit(p.departureVector),radius*1.05));b.parentId=p.primaryId;b.spacecraft.range=1e14;
  d.bodies.push(b);const corrected=transferPlan(d,b.id,target,days);b.velocity=corrected.departureVelocity;
  d.mode='sandbox';d.ephemeris=null;d.mission={name:sourceBody.name+' → '+d.bodies.find(x=>x.id===target).name,epochJD:d.jd,targetId:target,transfer:corrected};
  d.settings.stepSeconds=1800;d.settings.timeScale=DAY;d.settings.adaptive=true;d.settings.roche=false;d.settings.collisionMode='none';
  d.view={...d.view,selected:b.id,scale:'system',targetId:target,transferPreview:corrected,transferPath:true,panel:'mission'};
 }));
 return <div className="stack"><h2>Mission planner</h2><small>Lambert targeting with moving destination. Hohmann values estimate circular coplanar launch windows. Arrival is an encounter target, not a guaranteed capture.</small>
 <Field>Departure date (Reality initialization)<input type="date" min="1800-01-01" max="2049-12-31" value={epoch} onChange={e=>setEpoch(e.target.value)}/></Field><button disabled={s.mode!=='reality'} onClick={()=>run(()=>{sim.jump(new Date(epoch+'T00:00:00Z'));setPlan(null);})}>Set Reality epoch</button><small>Sandbox missions depart from the live clock; changing the Reality epoch reinitializes ephemerides.</small><Select label="Departure body / vehicle" value={source} options={bodies.map(b=>[b.id,b.name])} commit={setSource}/><Select label="Destination" value={target} options={bodies.filter(b=>b.id!==source&&!b.massless).map(b=>[b.id,b.name])} commit={setTarget}/><NumberField label="Flight time" value={days} commit={x=>setDays(Math.max(.01,Math.min(5000,x)))}/><small>Duration in days · Departure {fromJulianDate(s.jd).toISOString().slice(0,19)} UTC</small>
 <button onClick={calculate}>Calculate transfer</button>
 {plan&&<><Readouts values={[['Departure Δv',fmt(plan.departureDV/1000,3)+' km/s'],['Arrival match Δv',fmt(plan.arrivalDV/1000,3)+' km/s'],['Total estimate',fmt(plan.totalDV/1000,3)+' km/s'],['Phase angle',fmt(plan.phase*180/Math.PI,2)+'°'],['Circular launch window',fromJulianDate(plan.windowJD).toISOString().slice(0,10)],['Arrival',fromJulianDate(plan.arrivalJD).toISOString().slice(0,10)]]}/><small>{plan.model}</small><small>Calculated at JD {plan.epochJD.toFixed(5)}. Scheduling recalculates from the current state. Launch window is a mean-motion estimate.</small></>}
 <Toggle label="Debit rocket propellant for planned burn" value={fuel} commit={setFuel}/><button onClick={queue} disabled={!bodies.find(b=>b.id===source)?.rocket&&!bodies.find(b=>b.id===source)?.spacecraft}>Schedule departure on selected vehicle</button>
 <details><summary>Initialize a cruise demonstration</summary><p>Creates a spacecraft just outside the departure planet's SOI with Lambert transfer velocity. This skips ascent and escape; it does not move an existing rocket.</p><button onClick={cruise}>Create cruise spacecraft</button></details>
 <div className="divider"/><button onClick={()=>run(()=>sim.edit(d=>spawnRocket(d,source,false)))}>Add launch vehicle at departure</button><button onClick={()=>run(()=>sim.edit(d=>spawnRocket(d,source,true)))}>Add rocket in parking orbit</button>
 {selected?.rocket&&<Readouts values={[['Selected rocket Δv',fmt(deltaVBudget(selected.rocket).total/1000)+' km/s'],['Transfer margin',plan?fmt((deltaVBudget(selected.rocket).total-plan.totalDV)/1000)+' km/s':'Calculate a plan']]}/>}
 <button onClick={()=>{ui.workspace({right:true});sim.configureView({panel:'mission'});}}>Flight operations</button></div>;
}
export function GodTools({run}){
 const sim=useSimStore(),s=sim.scenario,b=s.bodies.find(b=>b.id===s.view.selected),ui=useUIStore(),[amount,setAmount]=useState(2);
 const act=(action,value)=>run(()=>sim.action(b?.id,action,value));
 return <div className="stack"><h2>God Mode</h2>{s.mode==='reality'?<button onClick={sim.sandbox}>Convert current state to Sandbox</button>:<small>Changes affect authoritative physics and are undoable.</small>}
 <div className="grid">{[['move','Move'],['throw','Throw']].map(([tool,label])=><button key={tool} disabled={s.mode!=='sandbox'} onClick={()=>ui.update({tool})}>{label}</button>)}<button onClick={()=>act('pin')}>Pin / unpin</button><button onClick={()=>act('duplicate')}>Duplicate</button><button onClick={()=>act('delete')}>Delete</button><button onClick={()=>act('zero')}>Zero velocity</button></div>
 <NumberField label="Multiplier / impulse km/s" value={amount} commit={setAmount}/><div className="grid">{[['mass','Multiply mass'],['radius','Scale radius'],['explode','Fragment'],['spin','Scale spin'],['elliptical','Make elliptical'],['escape','Escape orbit'],['apo-up','Raise apoapsis'],['apo-down','Lower apoapsis'],['peri-up','Raise periapsis'],['peri-down','Lower periapsis'],['circularize','Circularize'],['reverse-orbit','Reverse orbit'],['binary','Binary companion'],['moon','Add moon'],['barycenter','Move to barycenter']].map(([a,label])=><button key={a} disabled={!b||s.mode!=='sandbox'} onClick={()=>act(a,amount)}>{label}</button>)}</div>
 <div className="row">{[0,.1,1,10].map(x=><button key={x} onClick={()=>run(()=>sim.edit(d=>d.settings.gMultiplier=x))}>G ×{x}</button>)}</div><div className="grid"><button onClick={sim.togglePause}>Freeze / resume time</button><button onClick={()=>run(()=>sim.edit(d=>d.settings.timeScale=-d.settings.timeScale))}>Reverse time</button><button onClick={()=>run(()=>sim.edit(d=>d.settings.timeScale=.1))}>Slow motion</button><button onClick={()=>run(()=>sim.edit(d=>d.settings.timeScale=DAY))}>1 day / second</button></div>
 <button onClick={()=>sim.configureView({panel:'tools'})}>Create objects & particle brushes</button><button onClick={()=>sim.configureView({panel:'collision'})}>Collision laboratory</button><button onClick={()=>sim.configureView({panel:'inspector'})}>Edit vectors / physical properties</button></div>;
}
export function CollisionLab({run}){
 const sim=useSimStore(),s=sim.scenario,[a,setA]=useState('earth'),[b,setB]=useState('moon'),[speed,setSpeed]=useState(11000),[angle,setAngle]=useState(0),[ratio,setRatio]=useState(1),[mode,setMode]=useState('fragment');
 const choices=s.bodies.filter(b=>!b.massless&&!b.disrupted).map(b=>[b.id,b.name]);
 return <div className="stack"><h2>Collision laboratory</h2><Select label="Primary" value={a} options={choices} commit={setA}/><Select label="Impactor" value={b} options={choices} commit={setB}/><NumberField label="Impact approach speed" value={speed} unit="km/s" commit={setSpeed}/><NumberField label="Impact angle · degrees" value={angle} commit={x=>setAngle(Math.max(-85,Math.min(85,x)))}/><NumberField label="Impactor mass multiplier" value={ratio} commit={x=>setRatio(Math.max(.001,x))}/><Select label="Collision model" value={mode} options={['merge','bounce','fragment']} commit={setMode}/><button onClick={()=>run(()=>sim.edit(d=>{
 const p=d.bodies.find(x=>x.id===a),q=d.bodies.find(x=>x.id===b);if(!p||!q||p===q)throw new Error('Choose two different bodies');
 const local=structuredClone(q);local.id=uid('impactor');local.name=q.name+' impactor';local.mass*=ratio;local.parentId=p.id;local.position=add(p.position,[(p.radius+q.radius)*4,0,0]);local.velocity=add(p.velocity,[-Math.abs(speed)*Math.cos(angle*Math.PI/180),Math.abs(speed)*Math.sin(angle*Math.PI/180),0]);local.collisionMode=mode;
 d.bodies.push(local);d.mode='sandbox';d.ephemeris=null;d.settings.collisionMode=mode;d.settings.roche=false;d.settings.stepSeconds=Math.max(.01,Math.min(5,(p.radius+q.radius)/Math.max(speed,1)/50));d.settings.timeScale=100;d.view.selected=p.id;d.view.scale='planetary';
 }))}>Create impact experiment</button><small>Clones the impactor into the active system. Gravity changes the approach velocity before contact. Undo restores the previous configuration.</small></div>;
}
