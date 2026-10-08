import {useState,useEffect} from 'react';
import {useSimStore} from '../store/useSimStore.js';
import {editElements} from '../store/actions.js';
import {derived} from '../physics/body.js';
import {derivedOrbit,density} from '../physics/orbital.js';
import {schwarzschild} from '../physics/exotic.js';
import {norm,G} from '../physics/units.js';
import {NumberField,VectorField,Select,Toggle,Readouts,fmt} from './Fields.jsx';
import {Field} from './styles.js';
export default function Inspector({run}) {
 const sim=useSimStore(),s=sim.scenario,b=s.bodies.find(x=>x.id===s.view.selected),[meta,setMeta]=useState(null);
 useEffect(()=>setMeta(null),[b?.id]);
 if(!b)return <small>Select an object in the viewport or object list.</small>;
 const disabled=s.mode!=='sandbox',u=s.view.units,d=derived(b,s.settings),orbit=derivedOrbit(b,s.bodies,s.settings),o=orbit.elements;
 const edit=fn=>run(()=>sim.edit(s=>fn(s.bodies.find(x=>x.id===b.id))));
 const field=(key,value)=>edit(b=>{b[key]=value;});
 return <><div className="row spread"><div><div className="eyebrow">{b.type} / {b.massless?'test particle':'gravity source'}</div><h2>{b.name}</h2></div><input style={{width:35}} type="color" aria-label="Body color" disabled={disabled} value={b.color} onChange={e=>field('color',e.target.value)}/></div>
 {disabled&&<small>Ephemeris state is read-only. <button onClick={sim.sandbox}>Convert to Sandbox</button></small>}
 <Field>Name<input value={b.name} disabled={disabled} onChange={e=>field('name',e.target.value)}/></Field>
 <div className="grid"><NumberField label="Mass" value={b.mass} unit={u.mass} units={['kg','M⊕','M☉']} disabled={disabled} commit={v=>field('mass',v)}/>
 <NumberField label="Radius" value={b.radius} unit={u.radius} units={['m','km','R⊕','R☉']} disabled={disabled} commit={v=>field('radius',v)}/>
 <NumberField label="Density override" title="kg/m³. Changes mass at the current radius." value={density(b)} unit="kg/m³" disabled={disabled} commit={v=>edit(b=>{b.density=v;b.mass=v*4*Math.PI*b.radius**3/3;})}/>
 <NumberField label="Temperature" value={b.temperature} unit="K" disabled={disabled} commit={v=>field('temperature',v)}/></div>
 <details><summary>State vectors · J2000 ecliptic</summary><div className="stack">
 <VectorField label="Position" value={b.position} unit={u.length} disabled={disabled} commit={v=>field('position',v)}/>
 <VectorField label="Velocity" value={b.velocity} unit={u.velocity} disabled={disabled} commit={v=>field('velocity',v)}/>
 <Readouts values={[['Acceleration · m/s²',(b.acceleration??[0,0,0]).map(x=>fmt(x,5)).join(' / ')]]}/>
 <small>Acceleration is derived from forces. Edit velocity or mass to change motion.</small></div></details>
 <details open><summary>Orbital analysis</summary>{o?<div className="stack"><small>Primary: {orbit.primary.name}. Osculating elements; angular basis is J2000 ecliptic.</small>
 <div className="grid">{[['a','Semi-major axis',u.length,['m','km','AU']],['e','Eccentricity','',null],['i','Inclination',u.angle,['deg','rad']],['Omega','Ascending node Ω',u.angle,['deg','rad']],['omega','Periapsis argument ω',u.angle,['deg','rad']],['M','Mean anomaly',u.angle,['deg','rad']]].map(([key,label,unit,units])=><NumberField key={key} label={label} value={o[key]} unit={unit} units={units} disabled={disabled||o.e>=1} commit={v=>run(()=>sim.edit(s=>editElements(s,b.id,{[key]:v})))}/>)}</div>
 <Readouts values={[['True anomaly',fmt(o.nu*180/Math.PI)+'°'],['Periapsis · km',fmt(o.periapsis/1000)],['Apoapsis · km',o.apoapsis==null?'Unbound':fmt(o.apoapsis/1000)],['Period · days',o.period==null?'Unbound':fmt(o.period/86400)],['Specific energy · J/kg',fmt(o.specificEnergy)],['Specific angular momentum',fmt(o.specificAngularMomentum)+' m²/s'],['Hill radius · km',orbit.hill?fmt(orbit.hill/1000):'—'],['Fluid Roche boundary · km',orbit.roche?fmt(orbit.roche/1000):'—']]}/>
 <div className="row"><Toggle label="Hill sphere" value={s.view.showHill} commit={v=>sim.configureView({showHill:v})}/><Toggle label="Roche boundary" value={s.view.showRoche} commit={v=>sim.configureView({showRoche:v})}/></div>
 </div>:<small>No suitable primary or non-degenerate orbit.</small>}</details>
 <Readouts values={[['Surface gravity',fmt(G*s.settings.gMultiplier*b.mass/b.radius**2)+' m/s²'],['Escape velocity',fmt(Math.sqrt(2*G*s.settings.gMultiplier*b.mass/b.radius)/1000)+' km/s'],['Pinned',b.locked?'External constraint':'No']]}/>
 <details><summary>Appearance and rotation</summary><div className="stack">
 <Select label="Surface material" value={b.material} options={['rock','earth','gas','ice','spacecraft','debris']} disabled={disabled} commit={v=>field('material',v)}/>
 <NumberField label="Rotation period" value={b.spin.period} unit="d" units={['s','d','yr']} disabled={disabled} commit={v=>edit(b=>b.spin.period=v)}/>
 <NumberField label="Axial tilt" value={b.axialTilt} unit="°" disabled={disabled} commit={v=>field('axialTilt',v)}/>
 <VectorField label="Spin axis" value={b.spin.axis} unit="" disabled={disabled} commit={v=>edit(b=>{if(!norm(v))throw new Error('Spin axis must be nonzero');b.spin.axis=v;b.axialTilt=Math.acos(v[2]/norm(v))*180/Math.PI;})}/>
 <NumberField label="Trail points" value={b.trail.length} disabled={disabled} commit={v=>edit(b=>b.trail.length=Math.max(0,Math.min(4096,Math.floor(v))))}/>
 <NumberField label="Trail duration" value={b.trail.duration??86400*30} unit="d" units={['s','d','yr']} disabled={disabled} commit={v=>edit(b=>b.trail.duration=v)}/>
 <NumberField label="Trail width" value={b.trail.width??1} unit="px" disabled={disabled} commit={v=>edit(b=>b.trail.width=Math.max(.1,Math.min(10,v)))}/>
 <Field>Trail color<input type="color" value={b.trail.color} disabled={disabled} onChange={e=>edit(b=>b.trail.color=e.target.value)}/></Field>
 <Select label="Trail mode" value={b.trail.mode??'history'} options={['history','orbit']} disabled={disabled} commit={v=>edit(b=>b.trail.mode=v)}/>
 <Toggle label="Visible" value={b.visible} disabled={disabled} commit={v=>field('visible',v)}/>
 <Toggle label="Atmosphere" value={b.atmosphere} disabled={disabled} commit={v=>field('atmosphere',v?{density:1,color:'#789cbc',height:b.radius*.015}:null)}/>
 <Toggle label="Ring system" value={b.rings} disabled={disabled} commit={v=>field('rings',v?{inner:b.radius*1.4,outer:b.radius*2.4,opacity:.6,texture:null}:null)}/>
 </div></details>
 <details><summary>Behavior and tools</summary><div className="stack"><Toggle label="Pin in inertial frame" value={b.locked} disabled={disabled} commit={v=>field('locked',v)}/>
 <Toggle label="Massless gravitational test particle" value={b.massless} disabled={disabled} commit={v=>field('massless',v)}/>
 <Select label="Collision override" value={b.collisionMode} options={['inherit','none','merge','bounce','fragment']} disabled={disabled} commit={v=>field('collisionMode',v)}/>
 <Select label="Parent" value={b.parentId??''} options={[['','Automatic'],...s.bodies.filter(x=>x.id!==b.id&&!x.massless).map(x=>[x.id,x.name])]} disabled={disabled} commit={v=>field('parentId',v||null)}/>
 <div className="grid">{[['mass','Mass ×2'],['radius','Radius ×2'],['zero','Zero velocity'],['reverse','Reverse velocity'],['randomize','Random velocity'],['circularize','Circularize'],['duplicate','Duplicate'],['moon','Add moon'],['binary','Binary companion'],['explode','Fragment'],['barycenter','Center barycenter'],['freeze','Freeze / release all'],['scale','Scale system ×2'],['supernova','Supernova model'],['delete','Delete']].map(([a,label])=><button key={a} disabled={disabled} onClick={()=>run(()=>sim.action(b.id,a))}>{label}</button>)}</div>
 <small>Teleport using position fields. Supernova uses parameterized mass loss and radial impulses.</small></div></details>
 {b.blackHole&&<details open><summary>Black-hole approximation</summary><div className="stack"><Readouts values={[['Schwarzschild radius',fmt(schwarzschild(b.mass,s.settings)/1000)+' km'],['Accreted mass',fmt(b.blackHole.accretedMass)+' kg'],['Photon sphere',fmt(1.5*schwarzschild(b.mass,s.settings)/1000)+' km']]}/>
 <NumberField label="Disk outer radius / rₛ" value={b.blackHole.diskSize} disabled={disabled} commit={v=>edit(b=>b.blackHole.diskSize=v)}/>
 <NumberField label="Disk temperature" value={b.blackHole.temperature} unit="K" disabled={disabled} commit={v=>edit(b=>b.blackHole.temperature=v)}/>
 <Toggle label="Photon-sphere guide" value={b.blackHole.photonSphere} commit={v=>edit(b=>b.blackHole.photonSphere=v)}/>
 <Toggle label="Doppler-style brightness (visual)" value={b.blackHole.doppler} commit={v=>edit(b=>b.blackHole.doppler=v)}/>
 <small>Newtonian gravity, horizon capture, fluid Roche disruption. Lensing and accretion are procedural visual approximations.</small></div></details>}
 {b.wormhole&&<details open><summary>Experimental transport</summary><div className="stack"><NumberField label="Throat radius" value={b.wormhole.throatRadius} unit="km" units={['m','km','AU']} commit={v=>edit(b=>{b.wormhole.throatRadius=v;b.radius=v;})}/>
 <NumberField label="Re-entry cooldown" value={b.wormhole.cooldown} unit="s" commit={v=>edit(b=>b.wormhole.cooldown=v)}/>
 <Toggle label="Transform velocity" value={b.wormhole.transformVelocity} commit={v=>edit(b=>b.wormhole.transformVelocity=v)}/>
 <small>Exit: {s.bodies.find(x=>x.id===b.wormhole.pairId)?.name??'Missing mouth'}. Select the exit mouth to relocate it. This is a transport rule, not physical wormhole evolution.</small>
 {b.wormhole.orientation.map((v,k)=><NumberField key={k} label={'Orientation quaternion '+['x','y','z','w'][k]} value={v} commit={v=>edit(b=>b.wormhole.orientation[k]=v)}/>)}</div></details>}
 <details><summary>Custom metadata</summary><Field>JSON<textarea rows="5" disabled={disabled} value={meta??JSON.stringify(b.metadata,null,2)} onChange={e=>setMeta(e.target.value)}/></Field><button disabled={disabled||meta===null} onClick={()=>run(()=>{field('metadata',JSON.parse(meta));setMeta(null);})}>Apply metadata</button></details>
 </>;
}
