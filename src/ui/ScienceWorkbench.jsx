import {useRef,useState} from 'react';
import {useScienceStore} from '../store/useScienceStore.js';
import {useSimStore} from '../store/useSimStore.js';
import {useReplayStore} from '../store/useReplayStore.js';
import {api} from '../persistence.js';
import {reentryScenario,landingScenario} from '../physics/flightScenarios.js';
import {referenceScenario,REFERENCE_MISSION} from '../physics/referenceMission.js';
import {certifyMission} from '../physics/certification.js';
import {modelQuality,stressScenario,missionDebrief} from '../physics/scientific.js';
import {FRAME_NAMES,planetRelative,toBodyFixed,toLVLH,heliocentric} from '../physics/frames.js';
import {timeScales} from '../physics/time.js';
import {fromJulianDate,DAY} from '../physics/units.js';
import {NumberField,Select,Readouts,fmt} from './Fields.jsx';
import {Field} from './styles.js';
import ScientificPlot from './ScientificPlot.jsx';
export function downloadAnalysis(name,value,type='application/json'){const blob=new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const iso=jd=>fromJulianDate(jd).toISOString().slice(0,10);
const tabs=[['mission','Reference mission'],['accuracy','Accuracy'],['windows','Launch windows'],['numerical','Numerical lab'],['stress','Stress tests']];
export default function ScienceWorkbench({run}){
 const lab=useScienceStore(),sim=useSimStore(),s=sim.scenario,stats=sim.stats,r=lab.result,input=useRef();
 const [target,setTarget]=useState('mars'),[departure,setDeparture]=useState('2031-01-01'),[grid,setGrid]=useState(16),[metric,setMetric]=useState('totalDeltaV'),[selected,setSelected]=useState(null),[count,setCount]=useState(1000),[frame,setFrame]=useState('planet'),[field,setField]=useState('altitude');
 const job=(name,payload)=>run(()=>lab.run(name,payload));
 const quality=modelQuality(s,stats),b=s.bodies.find(x=>x.id===s.view.selected),parent=s.bodies.find(x=>x.id===b?.parentId),sun=s.bodies.find(x=>x.id==='sun');
 let coordinate=b?{position:b.position,velocity:b.velocity}:null,frameError='';
 try{if(b&&parent&&frame==='planet')coordinate=planetRelative(b,parent);if(b&&parent&&frame==='fixed')coordinate=toBodyFixed(b,parent,s.jd);if(b&&sun&&frame==='heliocentric')coordinate=heliocentric(b,sun);if(b&&parent&&frame==='lvlh'){const other=s.bodies.find(x=>x.id===s.view.targetId);if(!other)throw new Error('Choose a separate target body for LVLH coordinates');coordinate=toLVLH(other,b,parent);}}catch(e){coordinate=null;frameError=e.message;}
 const times=s.jd>=2441317.5?timeScales(s.jd,s.mission?.epochJD):null;
 const windowValues=lab.windows?.cells.filter(c=>!c.unavailable).map(c=>c[metric])??[],windowMin=Math.min(...windowValues),windowMax=Math.max(...windowValues);
 return <div className="stack"><div className="eyebrow">Analysis & validation</div><h2>Scientific workbench</h2>
 <Select label="Workspace" value={lab.tab} options={tabs} commit={lab.open}/>
 <small>Analysis runs in a separate worker. Results are measured; the current scenario changes only when you load a state.</small>
 {lab.busy&&<div role="status" className="event"><strong>{lab.progress?.phase??lab.job}</strong>{lab.progress?.fraction!=null&&<progress style={{width:'100%'}} value={lab.progress.fraction} max="1"/>}{lab.progress?.error!=null&&<small>Targeting residual {fmt(lab.progress.error/1000)} km</small>}<button onClick={lab.cancel}>Cancel analysis</button></div>}
 {lab.error&&<p role="alert" className="warning">{lab.error}</p>}
 {lab.tab==='mission'&&<>
 <h3>Earth → Mars reference</h3><details><summary>Other atmospheric flight laboratories</summary><div className="stack">{['capsule','spaceplane','generic'].map(kind=><button key={kind} onClick={()=>run(()=>sim.replace(reentryScenario(kind)))}>Earth entry · {kind}</button>)}{['moon','mars'].map(target=><button key={target} onClick={()=>run(()=>sim.replace(landingScenario(target)))}>{target} thrust landing</button>)}<small>Entry is ballistic: no lifting aerodynamics or ablation. Landing uses real thrust and fuel over a spherical surface.</small></div></details><small>2031-01-01 UTC · JPL approximate initialization · continuous-thrust ascent · full N-body cruise · fuel-aware ideal impulse burns. Capture is verified over two Mars orbits.</small>
 <div className="grid"><button disabled={lab.busy} onClick={()=>job('reference')}>Run & certify mission</button><button onClick={()=>run(()=>sim.replace(referenceScenario()))}>Load launch pad</button></div>
 <small>Loading the pad enables interactive ascent. The validation runner additionally solves departure, encounter, and capture; allow approximately 1–3 minutes depending on this computer.</small>
 {!r&&<p>NOT RUN · No mission certification has been measured in this session.</p>}
 {r&&<><h3 role="status">{r.status}</h3>{r.error&&<p className="warning">{r.error}</p>}
 <div>{r.checks.map(c=><div className="event" key={c.id}><strong>{c.passed?'✓ PASS':'✕ FAIL'} · {c.id}</strong><small>{c.criterion} · measured {typeof c.value==='number'?fmt(c.value,7):String(c.value)}</small></div>)}</div>
 <Readouts values={[['Duration',fmt(r.metrics.durationSeconds/DAY)+' days'],['Parking peri / apo',[r.metrics.parkingPeriapsis,r.metrics.parkingApoapsis].map(v=>fmt(v/1000)+' km').join(' / ')],['Parking eccentricity',fmt(r.metrics.parkingEccentricity,7)],['TMI Δv',fmt(r.metrics.tmiDeltaV)+' m/s'],['Mars arrival speed',fmt(r.metrics.marsRelativeArrivalVelocity)+' m/s'],['Closest Mars center',fmt(r.metrics.closestMarsApproach/1000)+' km'],['Capture Δv',fmt(r.metrics.captureDeltaV)+' m/s'],['Final peri / apo',[r.metrics.finalMarsPeriapsis,r.metrics.finalMarsApoapsis].map(v=>fmt(v/1000)+' km').join(' / ')],['Propellant consumed',fmt(r.metrics.propellantUsed)+' kg'],['Aboard / discarded fuel',fmt(r.metrics.remainingPropellant)+' / '+fmt(r.metrics.discardedPropellant)+' kg'],['Total propulsive Δv',fmt(r.metrics.totalDeltaV)+' m/s'],['Max-Q',fmt(r.metrics.maxQ?.q/1000)+' kPa'],['Source energy drift',fmt(r.metrics.energyDriftPercent,8)+' %']]}/>
 <div className="grid"><button disabled={lab.busy} onClick={()=>job('replay',{tape:r.tape,final:r.final})}>Verify deterministic replay</button><button onClick={()=>run(()=>sim.replace(r.final))}>Load final physical state</button><button onClick={()=>run(()=>{useReplayStore.getState().load({version:1,name:r.definition.name,frames:r.snapshots.map(x=>({scenario:x.scenario,wallTime:x.jd*DAY*1000}))});sim.configureView({panel:'replay'});})}>Review recorded snapshots</button><button disabled={lab.busy} onClick={()=>job('uncertainty',{result:r,options:{samples:4,seed:42}})}>Sensitivity · 4 seeded runs</button></div>
 {lab.replay&&<p className={lab.replay.equivalent?'success':'warning'}>{lab.replay.equivalent?'PASS':'FAIL'} · Replay tolerance: {lab.replay.positionTolerance} m, {lab.replay.velocityTolerance} m/s. Maximum position error {fmt(Math.max(...lab.replay.differences.map(x=>x.positionError??Infinity)),8)} m.</p>}
 {lab.uncertainty&&<><h3>Burn sensitivity</h3><p>{fmt(lab.uncertainty.captureSuccessFraction*100,0)}% of {lab.uncertainty.samples} sampled runs remain safely captured.</p><small>{lab.uncertainty.model} Magnitude ±0.1%, component direction perturbations ±0.001 rad, timing ±1 recorded step.</small>{lab.uncertainty.runs.map(x=><small key={x.sample}>Run {x.sample+1}: {x.error??fmt(x.positionError/1000)+' km final dispersion · '+(x.captured?'captured':'not safely captured')}</small>)}</>}
 <Select label="Recorded quantity" value={field} commit={setField} options={['altitude','speed','acceleration','q','mach','heatingProxy','propellant','thrust','energy','targetDistance']}/>
 <ScientificPlot samples={r.recorder} field={field} label={field} events={r.timeline}/>
 {r.metrics.plannedVsActual&&<details><summary>Planned vs actual encounter</summary><Readouts values={Object.entries(r.metrics.plannedVsActual).filter(([,v])=>typeof v==='number').map(([k,v])=>[k,fmt(v,6)])}/><small>{r.metrics.plannedVsActual.model}</small></details>}
 <details><summary>Detected events & burn analysis</summary>{r.timeline.map((e,i)=><div className="event" key={i}>T+{fmt(e.met)} s · {e.message}</div>)}{r.burns.map((b,i)=><div className="event" key={i}>{b.kind}: planned {fmt(b.plannedDeltaV)} / actual {fmt(b.actualDeltaV)} m/s · {fmt(b.fuelUsed)} kg · {b.model}</div>)}</details>
 <div className="row wrap"><button onClick={()=>downloadAnalysis('mission-debrief.md',missionDebrief(r),'text/markdown')}>Debrief Markdown</button><button onClick={()=>downloadAnalysis('mission-run.json',r)}>Run JSON</button><button onClick={()=>downloadAnalysis('mission-definition.json',REFERENCE_MISSION)}>Definition JSON</button><button onClick={()=>run(async()=>{const saved=await api('/mission-definitions',{method:'POST',body:JSON.stringify({version:1,name:r.definition.name,target:'mars',definition:r.definition})});localStorage.setItem('orrery-mission-edit:'+saved.id,saved.editKey);downloadAnalysis('mission-definition-share.json',{id:saved.id,url:location.origin+'/api/mission-definitions/'+saved.id});})}>Save definition to backend</button><button onClick={()=>downloadAnalysis('mission-tape.json',r.tape)}>Replay tape</button><button onClick={()=>downloadAnalysis('mission-telemetry.csv',['met,jd,altitude,speed,acceleration,q,mach,propellant,thrust,targetDistance',...r.recorder.map(x=>['met','jd','altitude','speed','acceleration','q','mach','propellant','thrust','targetDistance'].map(k=>x[k]??'').join(','))].join('\n'),'text/csv')}>Telemetry CSV</button><button onClick={()=>input.current.click()}>Compare saved run</button></div>
 {lab.comparison&&<><h3>Current vs saved run</h3><Readouts values={['durationSeconds','totalDeltaV','propellantUsed','closestMarsApproach','marsRelativeArrivalVelocity','finalMarsPeriapsis','finalMarsApoapsis'].map(k=>[k,fmt(r.metrics[k])+' / '+fmt(lab.comparison.metrics[k])])}/></>}
 </>}
 <input type="file" ref={input} hidden accept=".json" onChange={e=>{const file=e.target.files[0];if(file)run(async()=>{if(file.size>32*1024*1024)throw new Error('Run exceeds 32 MiB');const value=JSON.parse(await file.text());if(value.version!==1||!value.metrics||!value.definition)throw new Error('Not a version 1 mission report');lab.compare(value);});e.target.value='';}}/>
 </>}
 {lab.tab==='accuracy'&&<>
 {b&&parent&&(b.rocket||b.spacecraft)&&<><h3>Current orbit certification</h3><button onClick={()=>downloadAnalysis('orbit-certification.json',certifyMission(s,{vehicleId:b.id,targetId:parent.id,minimumPeriapsis:100000,maximumApoapsis:1e9,completed:true},stats))}>Certify current orbit · export checks</button><small>Evaluates binding energy, periapsis above 100 km and apoapsis below 1 million km around the selected primary. This is a current-state check, not whole-mission success.</small></>}
 <Readouts values={Object.entries(quality).filter(([k])=>k!=='warnings').map(([k,v])=>[k,String(v)])}/>
 <Readouts values={[['Energy drift %',fmt(stats?.energyDrift,9)],['Angular drift %',fmt(stats?.angularDrift,9)],['Accepted / rejected',(stats?.accepted??0)+' / '+(stats?.rejected??0)],['Conservation meaningful',stats?.conservationReliable?'Yes · reported sources':'Constraints / active forces: inspect warnings']]}/>
 <Select label="Reference frame" value={frame} commit={setFrame} options={Object.entries(FRAME_NAMES).filter(([k])=>['inertial','heliocentric','planet','fixed','lvlh'].includes(k))}/>
 <small>{parent?.name??'No primary'} · {b?.name??'Select a body'}</small>{frameError&&<p>{frameError}</p>}
 {coordinate&&<Readouts values={[['Position · m',coordinate.position.map(x=>fmt(x,6)).join(' / ')],['Velocity · m/s',coordinate.velocity.map(x=>fmt(x,6)).join(' / ')]]}/>}
 {times&&<Readouts values={Object.entries(times).map(([k,v])=>[k,typeof v==='number'?fmt(v,9):String(v)])}/>}
 {quality.warnings.map(x=><small className="warning" key={x}>! {x}</small>)}
 </>}
 {lab.tab==='windows'&&<>
 <Select label="Earth destination" value={target} commit={setTarget} options={['venus','mars','jupiter','saturn']}/><Field>Departure window start<input type="date" value={departure} onChange={e=>setDeparture(e.target.value)}/></Field>
 <NumberField label="Grid resolution (4–40)" value={grid} commit={x=>setGrid(Math.max(4,Math.min(40,Math.round(x))))}/>
 <button disabled={lab.busy} onClick={()=>{setSelected(null);job('windows',{to:target,departure,size:grid,spanDays:700,minFlightDays:target==='jupiter'?500:target==='saturn'?900:100,maxFlightDays:target==='jupiter'?1500:target==='saturn'?3000:400});}}>Compute Lambert window grid</button>
 <Select label="Plot quantity" value={metric} commit={setMetric} options={['totalDeltaV','departureC3','arrivalVInfinity','flightDays']}/>
 {lab.windows&&<><small>{lab.windows.model}</small><small>Horizontal: departure date · vertical: arrival date. Click a sample to inspect the corresponding arrival date.</small>
 <div style={{display:'grid',gridTemplateColumns:'repeat('+lab.windows.size+',1fr)',gap:1}} role="group" aria-label="Transfer window samples">
 {lab.windows.cells.map((c,i)=>{const t=(c[metric]-windowMin)/(windowMax-windowMin||1);
 return <button key={i} disabled={c.unavailable} aria-label={iso(c.depJD)+' departure, '+Math.round(c.flightDays)+' day transfer, '+metric+' '+fmt(c[metric])} title={iso(c.depJD)+' / '+iso(c.arrivalJD)} style={{padding:0,minHeight:15,borderRadius:0,background:c.unavailable?'#20252c':'hsl('+(210-35*t)+' 35% '+(24+35*(1-t))+'%)',border:selected===c?'1px solid white':'1px solid transparent'}} onClick={()=>setSelected(c)}/>;})}</div>
 {(selected??lab.windows.best[0])&&<Readouts values={Object.entries(selected??lab.windows.best[0]).filter(([,v])=>typeof v==='number').map(([k,v])=>[k,k.endsWith('JD')?iso(v):fmt(v)])}/>}
 <small>Unavailable cells fall outside the selected flight-duration range or have no valid Lambert solution. Best sampled excess-speed sums:</small>{lab.windows.best.slice(0,4).map((c,i)=><button key={i} onClick={()=>setSelected(c)}>{iso(c.depJD)} → {iso(c.arrivalJD)} · {fmt(c.totalDeltaV/1000)} km/s</button>)}
 <button onClick={()=>downloadAnalysis('transfer-window.json',selected??lab.windows.best[0])}>Export selected opportunity</button></>}
 </>}
 {['numerical','stress'].includes(lab.tab)&&<>
 <NumberField label="Test particles" value={count} commit={x=>setCount(Math.max(1,Math.min(19000,Math.round(x))))}/>
 <div className="grid"><button disabled={lab.busy} onClick={()=>job('benchmark',{count,options:{steps:10,integrators:lab.tab==='numerical'?['verlet','rk4','dopri']:['verlet']}})}>Compare solvers / integrators</button><button disabled={lab.busy} onClick={()=>job('benchmark',{scenario:s,options:{steps:5}})}>Analyze current clone</button><button onClick={()=>run(()=>sim.replace(stressScenario(count,'belt')))}>Load stress belt</button><button onClick={()=>run(()=>sim.replace(stressScenario(count,'ring')))}>Load stress ring</button></div>
 <div className="grid">{[1000,10000,100000].map(n=><button key={n} disabled={lab.busy} onClick={()=>job('gpu',{count:n})}>GPU kernel · {n.toLocaleString()} tracers</button>)}</div>{lab.gpu&&<div className="event"><strong>GPU COMPUTE: {lab.gpu.available?'AVAILABLE':'UNAVAILABLE'}</strong><Readouts values={Object.entries(lab.gpu).filter(([k])=>k!=='available').map(([k,v])=>[k,typeof v==='number'?fmt(v,5):String(v)])}/></div>}
 <small>Measurements include worker physics only. Live viewport FPS is separate. Scenarios retain the 20,000 total / 512 massive-body limits. No unmeasured FPS target is claimed.</small>
 {lab.benchmark?.map((x,i)=><div className="event" key={i}><strong>{x.integrator} · {x.solver} · {x.complete?'COMPLETE':'BUDGET REACHED'}</strong><Readouts values={[['Runtime',fmt(x.elapsedMs)+' ms'],['Throughput',fmt(x.stepsPerSecond)+' steps/s'],['Energy drift',fmt(x.energyDriftPercent,8)+' %'],['Maximum position difference',fmt(x.maximumPositionError)+' m'],['Accepted / rejected',x.accepted+' / '+x.rejected]]}/><small>{x.reference}</small></div>)}
 </>}
 </div>;
}
