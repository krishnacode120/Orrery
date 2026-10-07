import {useState} from 'react';
import {useSimStore} from '../store/useSimStore.js';
import {vehicleTelemetry,communications,earthFixed} from '../physics/vehicles.js';
import {stateFromElements} from '../physics/orbital.js';
import {G,DAY} from '../physics/units.js';
import {uid} from '../store/actions.js';
import {exportTelemetry,missionReport} from '../persistence.js';
import {NumberField,Select,Toggle,Readouts,fmt} from './Fields.jsx';
import {Field} from './styles.js';
import Icon from './Icon.jsx';
function Chart({samples,field,label,scale=1,unit=''}) {
 const values=samples.slice(-240).map(x=>x[field]).filter(Number.isFinite),min=Math.min(...values),max=Math.max(...values),range=max-min||1;
 const points=values.map((v,i)=>i/Math.max(1,values.length-1)*280+','+(54-(v-min)/range*45)).join(' ');
 return <div><div className="row spread chart-label"><span>{label}</span><span className="mono">{fmt(values.at(-1)*scale)} {unit}</span></div>
 <svg viewBox="0 0 280 60" className="chart" role="img" aria-label={label+' recorded telemetry'}><path d="M0 15H280M0 35H280M0 55H280" stroke="#25313d" strokeWidth=".5"/><polyline points={points} fill="none" stroke="#93afc5" strokeWidth="1.3"/></svg></div>;
}
function GroundTrack({b,parent,s}) {
 const t=vehicleTelemetry(b,parent,s.jd,s.settings),o=t?.elements,path=[];
 if(o&&o.e<1&&o.period)for(let i=0;i<=180;i++){const seconds=i/180*o.period*1.5,state=stateFromElements({...o,M:o.M+seconds*Math.sqrt(G*s.settings.gMultiplier*parent.mass/o.a**3)},G*s.settings.gMultiplier*parent.mass);path.push(earthFixed(state.position,s.jd+seconds/DAY));}
 const segments=[];let current=[];for(const p of path){if(current.length&&Math.abs(p.longitude-current.at(-1).longitude)>180){segments.push(current);current=[];}current.push(p);}segments.push(current);
 return <svg viewBox="0 0 360 180" style={{width:'100%',background:'#0b121a',border:'1px solid #29323e'}} role="img" aria-label="Earth latitude longitude ground track">
 <image href="/textures/earth_daymap.jpg" width="360" height="180" opacity=".34"/>
 {[30,60,90,120,150].map(y=><path key={y} d={'M0 '+y+'H360'} stroke="#2c3844" strokeWidth=".5"/>)}{[60,120,180,240,300].map(x=><path key={x} d={'M'+x+' 0V180'} stroke="#2c3844" strokeWidth=".5"/>)}
 {segments.map((list,i)=><polyline key={i} points={list.map(p=>(p.longitude+180)+','+(90-p.latitude)).join(' ')} stroke="#b4976b" fill="none" strokeWidth="1"/>)}
 {s.stations.map(x=><g key={x.id}><rect x={x.longitude+178} y={88-x.latitude} width="4" height="4" fill="#c7d4df"/><text x={x.longitude+185} y={91-x.latitude} fontSize="6" fill="#9fb0be">{x.name}</text></g>)}
 <circle cx={t.longitude+180} cy={90-t.latitude} r="3" fill="#d8e5ed"/><text x="5" y="12" fill="#8c9fac" fontSize="7">90 N</text><text x="5" y="172" fill="#8c9fac" fontSize="7">90 S</text></svg>;
}
export default function MissionControl({run}) {
 const sim=useSimStore(),s=sim.scenario,b=s.bodies.find(x=>x.id===s.view.selected),parent=s.bodies.find(x=>x.id===b?.parentId);
 const [tab,setTab]=useState('flight');
 const [direction,setDirection]=useState('prograde'),[deltaV,setDeltaV]=useState(100),[delay,setDelay]=useState(120),[vector,setVector]=useState([0,0,0]);
 if(!b||!parent||(!b.rocket&&!b.spacecraft))return <div className="stack"><Icon name="mission" size={34}/><h2>Choose a mission</h2><p className="object-description">Launch a two-stage vehicle, plan a satellite maneuver, or explore a constellation. Each workspace opens with its own camera, telemetry and controls.</p>{[['rocket','Launch vehicle'],['leo','Low Earth orbit'],['constellation','Constellation']].map(([id,name])=><button key={id} onClick={()=>run(()=>sim.preset(id))}>{name}</button>)}</div>;
 const t=vehicleTelemetry(b,parent,s.jd,s.settings),r=b.rocket,c=b.spacecraft,links=communications(b,s.bodies,s.stations,s.jd),samples=s.telemetry.filter(x=>x.bodyId===b.id),disabled=s.mode!=='sandbox';
 const edit=fn=>run(()=>sim.edit(s=>fn(s.bodies.find(x=>x.id===b.id))));
 const addBurn=()=>run(()=>sim.edit(s=>{s.maneuvers.push({id:uid('burn'),bodyId:b.id,jd:s.jd+delay/DAY,deltaV,direction,vector,executed:false});s.view.predictionEnabled=true;s.view.predictionDuration=Math.max(delay*2,3600);}));
 const flightSteps=['prelaunch','ignition','liftoff','vertical ascent','pitch program','gravity turn','first-stage cutoff','stage separation','second-stage ignition','orbital insertion','payload deployment','mission completion'];
 const phaseIndex=flightSteps.indexOf(r?.phase);
 return <><div className="row spread"><div><div className="eyebrow">{r?'Rocket view':'Satellite view'}</div><h2>{b.name}</h2></div><span className="badge">{r?.phase??'coasting'}</span></div>
 <div className="row"><button onClick={()=>sim.configureView({scale:'vehicle',cameraMode:r?'rocket chase':'satellite chase'})}>Vehicle</button><button onClick={()=>sim.configureView({scale:'earth',cameraMode:'orbit'})}>Earth orbit</button><button onClick={()=>sim.configureView({predictionEnabled:!s.view.predictionEnabled})}>Trajectory</button></div>
 <div className="panel-tabs" role="tablist" aria-label="Mission sections">{[['flight','Flight'],['orbit','Orbit'],['telemetry','Telemetry']].map(([key,label])=><button key={key} role="tab" aria-selected={tab===key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}</div>
 {tab==='flight'&&r?.phase==='prelaunch'&&<button className="primary-button" disabled={disabled||r.phase!=='prelaunch'} onClick={()=>{edit(b=>{b.locked=false;b.rocket.phase='ignition';b.rocket.engineOn=true;});if(sim.paused)sim.togglePause();}}>Ignition / launch</button>}
 <div className="mission-grid">{[['MET',fmt(t.met,1)+' s'],['Altitude',fmt(t.altitude/1000)+' km'],['Velocity',fmt(t.speed/1000)+' km/s'],['Acceleration',fmt(t.acceleration)+' m/s²'],['Vertical',fmt(t.verticalSpeed)+' m/s'],['Horizontal',fmt(t.horizontalSpeed)+' m/s']].map(([k,v])=><div className="telemetry-cell" key={k}><small>{k}</small><div className="metric">{v}</div></div>)}</div>
 <Readouts values={[['Apoapsis altitude',t.apoapsis==null?'Unbound':fmt(t.apoapsis/1000)+' km'],['Periapsis altitude',fmt(t.periapsis/1000)+' km'],['Inclination · ecliptic',fmt(t.elements?.i*180/Math.PI)+'°'],['Circular speed here',fmt(t.orbitalVelocity/1000)+' km/s'],['Heading / pitch / roll',[t.heading,t.pitch,t.roll].map(x=>fmt(x,1)+'°').join(' / ')],['Position · km',b.position.map(x=>fmt(x/1000,1)).join(' / ')]]}/>
 {tab==="flight"&&r&&<><div className="flight-status"><div className="row spread"><span className="eyebrow">Mission progress</span><span className="mono">{r.stage+1} / {r.stages.length} stages</span></div><div className="flight-progress" aria-label="Current mission phase">{flightSteps.map((phase,i)=><span key={phase} title={phase} className={i<=phaseIndex?'complete':''}/>)}</div><strong>{r.phase}</strong><small>{r.phase==='prelaunch'?'Vehicle on pad. Ignition releases the surface constraint and starts the engine.':r.autopilot?'Guidance is controlling the pitch program and target orbit.':'Manual guidance active. Monitor attitude, fuel and trajectory.'}</small></div>
 <div className="section stack"><div className="row spread"><h3>Flight systems</h3><span className={r.engineOn?'success':'muted'}>{r.engineOn?'Engine active':'Engine off'}</span></div>
 <div className="grid">
 <button disabled={disabled||r.phase==='prelaunch'} onClick={()=>edit(b=>b.rocket.engineOn=!b.rocket.engineOn)}>Engine {r.engineOn?'cutoff':'restart'}</button>
 <button disabled={disabled||r.phase==='prelaunch'||r.stage>=r.stages.length-1} onClick={()=>edit(b=>b.rocket.stageRequested=true)}>Separate stage</button>
 <button disabled={disabled||r.deployed||r.phase==='prelaunch'} onClick={()=>edit(b=>b.rocket.deployRequested=true)}>Deploy payload</button></div>
 <Field>Throttle · {Math.round(r.throttle*100)}%<input type="range" min="0" max="1" step=".01" value={r.throttle} disabled={disabled} onChange={e=>edit(b=>b.rocket.throttle=+e.target.value)}/></Field>
 <div className="row"><Toggle label="Guidance" value={r.autopilot} commit={v=>edit(b=>b.rocket.autopilot=v)}/><Toggle label="Auto stage" value={r.autoStage} commit={v=>edit(b=>b.rocket.autoStage=v)}/></div>
 <Readouts values={[['Current stage',r.stages[r.stage].name],['Thrust',fmt(t.thrust/1000)+' kN'],['Propellant',fmt(t.propellant)+' kg'],['Dry + payload mass',fmt(t.dryMass)+' kg'],['Total mass',fmt(t.totalMass)+' kg'],['Dynamic pressure',fmt(t.q/1000)+' kPa'],['Separation events',String(r.separations.length)]]}/>
 <div className="grid"><NumberField label="Target altitude" value={r.targetAltitude} unit="km" commit={v=>edit(b=>b.rocket.targetAltitude=v)}/><NumberField label="Payload mass" value={r.payloadMass} unit="kg" commit={v=>edit(b=>b.rocket.payloadMass=v)}/>
 {!r.autopilot&&[['pitch','Pitch'],['heading','Heading'],['roll','Roll']].map(([k,label])=><NumberField key={k} label={label} value={r[k]} unit="°" commit={v=>edit(b=>b.rocket[k]=v)}/>)}</div>
 <details><summary>Engine and airframe configuration</summary><div className="stack">{r.stages.map((stage,i)=><div className="stack section" key={i}><h3>{stage.name}</h3><div className="grid">{[['thrust','Thrust · N'],['isp','Specific impulse · s'],['dryMass','Dry mass · kg'],['fuel','Propellant · kg']].map(([k,label])=><NumberField key={k} label={label} value={stage[k]} commit={v=>edit(b=>{b.rocket.stages[i][k]=v;if(k==='fuel')b.rocket.stages[i].capacity=Math.max(v,stage.capacity);})}/>)}</div></div>)}
 <NumberField label="Reference area" value={r.area} unit="m²" commit={v=>edit(b=>b.rocket.area=v)}/><NumberField label="Drag coefficient" value={r.cd} commit={v=>edit(b=>b.rocket.cd=v)}/></div></details>
 <small>Point-mass propulsion, constant Isp, exponential atmosphere, drag and feedback guidance. No structural, combustion, wind, or 6-DOF flight model.</small></div></>}
 {tab==="flight"&&c&&<div className="section stack"><h3>Spacecraft systems</h3><Readouts values={[['Power',fmt(c.battery*100,1)+'% battery'],['Solar illumination',c.illuminated?'Lit':'Eclipse'],['Payload',c.payload],['Latitude',fmt(t.latitude)+'°'],['Longitude',fmt(t.longitude)+'°'],['Ground-relative speed',fmt(t.groundSpeed/1000)+' km/s'],['Period',fmt(t.elements?.period/60)+' min'],['Eccentricity',fmt(t.elements?.e,7)],['Semi-major axis',fmt(t.elements?.a/1000)+' km'],['True anomaly',fmt(t.elements?.nu*180/Math.PI)+'°']]}/>
 <Select label="Payload state" value={c.payload} options={['standby','active','off']} commit={v=>edit(b=>b.spacecraft.payload=v)}/><NumberField label="Radio range" value={c.range} unit="km" commit={v=>edit(b=>b.spacecraft.range=v)}/>
 <div className="grid">{[['capacityWh','Battery · Wh'],['solarWatts','Solar array · W'],['loadWatts','Load · W']].map(([k,label])=><NumberField key={k} label={label} value={c[k]} commit={v=>edit(b=>b.spacecraft[k]=v)}/>)}</div></div>}
 {tab==="orbit"&&<><details open><summary>Ground track and communications</summary><div className="stack"><GroundTrack b={b} parent={parent} s={s}/><small>Keplerian projected track. Illustrative Greenwich origin at J2000; not a navigation product.</small>
 <Toggle label="Show communication links" value={s.view.links} commit={v=>sim.configureView({links:v})}/>
 {links.length?links.map(l=><div key={l.id} className="row spread"><small>{l.name}</small><span className={l.status==='connected'?'success':'warning'} style={{fontSize:11}}>{l.status==='connected'?'Connected':l.status==='blocked'?'Earth blocked':'Out of range'}</span></div>):<small>No compatible receiver configured.</small>}
 <button onClick={()=>run(()=>sim.edit(s=>s.stations.push({id:uid('station'),name:'Station at subpoint',bodyId:parent.id,latitude:t.latitude,longitude:t.longitude,altitude:10})))}>Add ground station at subpoint</button></div></details>
 <details open><summary>Maneuver planning</summary><div className="stack"><small>Ideal impulsive burns; no finite engine burn or propellant debit.</small>
 <Select label="Burn direction" value={direction} options={[['prograde','Prograde'],['retrograde','Retrograde'],['in','Radial in'],['out','Radial out'],['normal','Normal'],['antinormal','Anti-normal'],['vector','Inertial vector']]} commit={setDirection}/>
 <div className="grid"><NumberField label="Δv" value={deltaV} unit="m/s" commit={setDeltaV}/><NumberField label="Time from now" value={delay} unit="s" commit={setDelay}/></div>
 {direction==='vector'&&<div className="triple">{vector.map((v,k)=><NumberField key={k} label={'Δv '+['X','Y','Z'][k]} value={v} unit="m/s" commit={v=>setVector(vector.map((x,i)=>i===k?v:x))}/>)}</div>}
 <button disabled={disabled} onClick={addBurn}>Add burn and predict</button>
 {s.maneuvers.filter(n=>n.bodyId===b.id).map(n=><div className="row spread" key={n.id}><small>{n.executed?'Executed':fmt((n.jd-s.jd)*DAY)+' s'} · {n.direction} · {fmt(n.deltaV)} m/s</small>{!n.executed&&<button aria-label="Remove maneuver" onClick={()=>run(()=>sim.edit(s=>s.maneuvers=s.maneuvers.filter(x=>x.id!==n.id)))}>×</button>}</div>)}</div></details>
 </>}{tab==="telemetry"&&<><details open><summary>Recorded telemetry</summary><div className="grid">{[['altitude','Altitude',.001,'km'],['speed','Velocity',.001,'km/s'],['acceleration','Acceleration',1,'m/s²'],['propellant','Propellant',.001,'t'],['q','Dynamic pressure',.001,'kPa'],['apoapsis','Apoapsis',.001,'km'],['periapsis','Periapsis',.001,'km'],['energy','Specific energy',1,'J/kg'],['communication','Communication',1,'']].map(([field,label,scale,unit])=><Chart key={field} samples={samples} {...{field,label,scale,unit}}/>)}</div>
 <div className="row wrap"><button onClick={()=>exportTelemetry(s,'csv')}>CSV</button><button onClick={()=>exportTelemetry(s,'json')}>JSON</button><button onClick={()=>missionReport(s)}>Mission report</button></div></details>
 <details open><summary>Mission timeline</summary><div className="stack">{s.events.slice(-20).reverse().map(e=><div className="event" key={e.id}><div className="eyebrow">{e.kind} · T+{fmt((e.jd-(s.mission?.epochJD??s.jd))*DAY,1)} s</div>{e.message}</div>)}{!s.events.length&&<small>No flight events yet.</small>}</div></details></>}</>;
}
