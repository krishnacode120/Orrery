import {useState,useEffect} from 'react';
import {focusCamera,systemCamera,cameraPreset} from '../navigation/actions.js';
import {useUIStore} from '../store/useUIStore.js';
import {useSimStore} from '../store/useSimStore.js';
import {derivedOrbit} from '../physics/orbital.js';
import {AU,DAY,G,norm,sub} from '../physics/units.js';
import {fmt,Readouts} from './Fields.jsx';
import Inspector from './Inspector.jsx';
import Icon from './Icon.jsx';
import {captureScreenshot} from '../capture.js';

const maps={sun:'sun',earth:'earth_daymap',venus:'venus_atmosphere',mercury:'mercury',mars:'mars',jupiter:'jupiter',saturn:'saturn',uranus:'uranus',neptune:'neptune',moon:'moon'};
export function PlanetSwatch({body,size=40}) {
 const image=maps[body.id]??(body.material==='earth'?'earth_daymap':body.type==='moon'?'moon':null);
 return <span className={'planet-swatch '+(body.rings?'has-rings ':'')+(body.type==='star'?'is-star':'')} style={{'--size':size+'px','--planet-color':body.color,backgroundImage:image?'url(/textures/'+image+'.jpg)':undefined}}/>;
}
export function focusBody(id,mode='orbit'){focusCamera(id,mode);}
const descriptions={
 sun:'Our system’s central star. Its gravity binds the planets, moons and smaller bodies into a single moving system.',
 mercury:'A cratered, airless world on the shortest planetary orbit. A useful laboratory for the weak-field GR correction.',
 venus:'A rocky world beneath a deep cloud deck, rotating slowly in the opposite direction to most planets.',
 earth:'An ocean-covered terrestrial planet. Explore its surface, inspect the Moon, or move into an Earth-orbit mission.',
 mars:'A terrestrial world with a thin atmosphere, polar ice and two small moons: Phobos and Deimos.',
 jupiter:'The largest planet in the system. Its four major moons form a planetary system of their own.',
 saturn:'A gas giant surrounded by a broad ring system. Its moons include Titan and Enceladus.',
 uranus:'An ice giant with an extreme axial tilt and a system of distant moons.',
 neptune:'The outermost major planet, accompanied here by its retrograde moon Triton.',
 moon:'Earth’s largest natural satellite. The default trajectory is a mean-orbit approximation; Horizons supplies epoch-specific vectors.',
};
export function SelectionInspector({run}) {
 const sim=useSimStore(),s=sim.scenario,b=s.bodies.find(x=>x.id===s.view.selected),[tab,setTab]=useState('overview');
 if(!b)return <div className="empty-state"><Icon name="objects" size={32}/><h2>Select an object</h2><p>Choose a world from the navigator to inspect its state.</p></div>;
 const orbit=derivedOrbit(b,s.bodies,s.settings),parent=orbit.primary,moons=s.bodies.filter(x=>x.parentId===b.id),speed=norm(parent?sub(b.velocity,parent.velocity):b.velocity);
 return <><div className="selection-heading"><PlanetSwatch body={b} size={42}/><div><div className="eyebrow">{b.type==='star'?'Main sequence star':b.type.replace(/([A-Z])/g,' $1')}</div><h2>{b.name}</h2></div><button className="icon-button" aria-label={'Focus '+b.name} title="Frame this object" onClick={()=>focusBody(b.id)}><Icon name="focus"/></button></div>
 <div className="panel-tabs" role="tablist" aria-label="Object inspector">{[['overview','Overview'],['edit','Properties']].map(([key,label])=><button role="tab" aria-selected={tab===key} className={tab===key?'active':''} key={key} onClick={()=>setTab(key)}>{label}</button>)}</div>
 {tab==='overview'?<div className="overview-content">
 <p className="object-description">{descriptions[b.id]??(b.rocket?'A simulated launch vehicle. Flight dynamics, staging and propellant are integrated by the physics worker.':b.spacecraft?'An orbiting vehicle with live orbital analysis, maneuver planning and communication geometry.':b.blackHole?'Newtonian gravity with horizon absorption. Relativistic and accretion visuals are approximations.':'A body in the active simulation. Measurements below come from its current state.')}</p>
 <div className="overview-metrics"><div><span>MEAN RADIUS</span><strong>{fmt(b.radius/1000,0)} <small>km</small></strong></div><div><span>{parent?'RELATIVE SPEED':'INERTIAL SPEED'}</span><strong>{fmt(speed/1000,2)} <small>km/s</small></strong></div></div>
 <section className="data-section"><div className="section-title"><Icon name="orbit" size={15}/><h3>Orbital state</h3><span className="live-dot" title="Updated from simulation"/></div>
 <Readouts values={parent?[['Primary',parent.name],['Distance',fmt(norm(sub(b.position,parent.position))/AU,4)+' AU'],['Orbital period',orbit.elements?.period?fmt(orbit.elements.period/DAY,2)+' days':'Unbound'],['Semi-major axis',fmt(orbit.elements?.a/AU,5)+' AU'],['Eccentricity',fmt(orbit.elements?.e,5)],['Inclination',fmt((orbit.elements?.i??0)*180/Math.PI,2)+'°']]:[['Reference frame','J2000 ecliptic'],['Speed',fmt(speed/1000,3)+' km/s']]}/></section>
 <section className="data-section"><div className="section-title"><Icon name="inspect" size={15}/><h3>Physical properties</h3></div><Readouts values={[['Mass',b.mass.toExponential(4)+' kg'],['Surface gravity',fmt(G*s.settings.gMultiplier*b.mass/b.radius**2,2)+' m/s²'],['Rotation period',fmt(Math.abs(b.spin.period)/3600,2)+' hours'],['Axial tilt',fmt(b.axialTilt,2)+'°'],['Model temperature',fmt(b.temperature,0)+' K'],['Mean density',fmt(b.density??b.mass/(4*Math.PI*b.radius**3/3),1)+' kg/m³'],['Escape velocity',fmt(Math.sqrt(2*G*s.settings.gMultiplier*b.mass/b.radius)/1000,2)+' km/s']]}/></section>
 {moons.length>0&&<section className="data-section"><div className="section-title"><Icon name="objects" size={15}/><h3>Orbiting objects</h3><span className="count">{moons.length}</span></div><div className="satellite-list">{moons.slice(0,10).map(x=><button key={x.id} onClick={()=>focusBody(x.id)}><PlanetSwatch body={x} size={24}/><span>{x.name}</span><Icon name="chevron" size={14}/></button>)}</div></section>}
 {(b.rocket||b.spacecraft)&&<button className="primary-button" onClick={()=>sim.configureView({panel:'mission'})}><Icon name="mission"/>Open mission control</button>}
 <button className="secondary-button" onClick={()=>{setTab('edit');}}><Icon name="inspect"/>Inspect and edit properties</button>
 <div className="model-note"><Icon name="horizons" size={15}/><span>{s.mode==='reality'?(s.provenance.source==='horizons'?'Horizons ephemeris playback':'Approximate ephemeris · JPL elements'):'Locally propagated N-body state'}</span></div>
 </div>:<div className="property-editor"><Inspector run={run}/></div>}
 </>;
}
export function BodyNavigator(){
 const sim=useSimStore(),s=sim.scenario,[family,setFamily]=useState('primary');
 const [search,setSearch]=useState('');
 const selected=s.bodies.find(x=>x.id===s.view.selected),parent=s.bodies.find(x=>x.id===selected?.parentId);
 useEffect(()=>{setFamily(selected?.rocket||selected?.spacecraft?'vehicles':selected?.type==='moon'?'local':'primary');},[selected?.id]);
 const localPrimary=selected?.type==='moon'?parent:selected;
 const major=s.bodies.filter(x=>!x.disrupted&&(!x.massless||x.spacecraft||x.rocket)).slice(0,200);
 const list=family==='local'?[localPrimary,...s.bodies.filter(x=>x.parentId===localPrimary?.id)].filter(Boolean):family==='vehicles'?s.bodies.filter(x=>x.rocket||x.spacecraft):major;
 return <section className="body-navigator" aria-label="Object navigator"><div className="navigator-heading"><span className="eyebrow">Navigate</span><div className="navigator-filters">{[['primary','System'],['local','Moons'],['vehicles','Vehicles']].map(([key,label])=><button key={key} className={family===key?'active':''} onClick={()=>setFamily(key)}>{label}</button>)}</div><button aria-label="Hide navigator" onClick={()=>useUIStore.getState().workspace({left:false})}>×</button></div>
 <input aria-label="Search objects" placeholder="Search objects…" value={search} onChange={e=>setSearch(e.target.value)}/><button className="system-navigation" onClick={()=>{systemCamera();}}>◎ Solar System</button><div className="body-strip">{list.filter(x=>x.name.toLowerCase().includes(search.toLowerCase())).map(x=><button key={x.id} aria-label={'Explore '+x.name} aria-pressed={x.id===s.view.selected} className={'body-tile '+(x.id===s.view.selected?'selected':'')} onClick={()=>sim.configureView({selected:x.id})} onDoubleClick={()=>focusBody(x.id)}><PlanetSwatch body={x} size={22}/><span>{x.name}</span>{x.id===s.view.selected&&<span className="selection-dot"/>}</button>)}{!list.length&&<div className="navigator-empty">No {family==='vehicles'?'vehicles':'moons'} in this selection. Open Scenarios to explore more.</div>}</div></section>;
}
export function ViewportControls(){
 const sim=useSimStore(),s=sim.scenario,b=s.bodies.find(x=>x.id===s.view.selected),tool=useUIStore(x=>x.tool);
 return <>{tool!=='select'&&<div className="placement-banner"><Icon name="tools"/><span>{tool==='spawn'?'Click to place; drag to set velocity.':tool==='move'?'Click and drag to move the selected object.':'Drag to add velocity to the selected object.'}</span><button onClick={()=>useUIStore.getState().update({tool:'select',placementPreview:null})}>Cancel <kbd>Esc</kbd></button></div>}<div className="viewport-heading"><div className="eyebrow">{s.view.scale==='system'?'System overview':s.view.scale==='earth'?'Earth orbital environment':'Object observation'}</div><h2>{s.view.scale==='system'?'Solar system':b?.name??s.name}</h2><span>{s.mode==='reality'?'Ephemeris':'N-body simulation'} <span className="text-separator">/</span> J2000 ecliptic</span></div>
 <div className="viewport-actions" aria-label="Viewport controls"><select className="solar-view-picker" aria-label="Solar System view" value="" onChange={e=>cameraPreset(e.target.value)}><option value="" disabled>System views</option>{['Solar System Overview','Solar System Top','Solar System Side','Inner Planets'].map(name=><option key={name}>{name}</option>)}</select><button title="View whole system" aria-label="View whole system" className={s.view.scale==='system'?'active':''} onClick={()=>systemCamera()}><Icon name="orbit"/></button><button title="Frame selection" aria-label="Frame selection" onClick={()=>b&&focusBody(b.id)}><Icon name="focus"/></button><span/><button title="Toggle orbit paths" aria-label="Toggle orbit paths" aria-pressed={s.view.orbits} className={s.view.orbits?'active':''} onClick={()=>sim.configureView({orbits:!s.view.orbits})}><Icon name="analysis"/></button><button title="Toggle labels" aria-label="Toggle labels" aria-pressed={s.view.labels} onClick={()=>sim.configureView({labels:!s.view.labels})}>Aa</button><button title="Save viewport screenshot" aria-label="Save viewport screenshot" onClick={()=>{try{captureScreenshot();}catch(e){sim.fail(e.message);}}}><Icon name="camera"/></button></div>
 <div className="viewport-guide"><span><Icon name="explore" size={13}/>{s.view.cameraMode==='free'?'WASDQE · drag to look':'Drag to orbit'}</span><span>{s.view.cameraMode==='free'?'Wheel · speed / Alt · dolly':'Wheel · zoom / middle drag · pan'}</span><span className="hide-mobile"><kbd>F</kbd> Frame selection</span></div>
 </>;
}
export function ScenarioArt({preset}){
 const map={rocket:'earth',leo:'earth',meo:'earth',geo:'earth',polar:'earth',sso:'earth',elliptical:'earth','high-elliptical':'earth',constellation:'earth','solar-now':'earth',binary:'sun','jupiter-star':'jupiter','ten-moons':'earth',rings:'saturn',collision:'moon',comet:'neptune'};
 const id=map[preset.id]??(preset.category==='extreme'?'sun':preset.id==='flyby'?'sun':'mars');
 if(['empty','figure-eight','asteroids','wormhole','comet'].includes(preset.id))return <div className="scenario-art schematic-art"><svg viewBox="0 0 240 120" aria-hidden="true">
 {preset.id==='empty'?<g stroke="#3e5269" fill="none"><path d="M35 60h170M120 20v80" strokeDasharray="3 4"/><circle cx="120" cy="60" r="24"/><path d="M113 60h14M120 53v14" stroke="#d9b780"/></g>
 :preset.id==='figure-eight'?<g fill="none" stroke="#b39875"><path d="M120 60C20-35 20 155 120 60S220 155 120 60S20-35 120 60" strokeWidth=".8"/>{[[60,52],[137,42],[158,85]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="5" fill={['#b79c74','#8da3b5','#8ea28d'][i]}/>)}</g>
 :preset.id==='wormhole'?<g fill="none"><ellipse cx="76" cy="60" rx="19" ry="33" stroke="#94a8c8" strokeWidth="3"/><ellipse cx="164" cy="60" rx="19" ry="33" stroke="#ba9e7b" strokeWidth="3"/><path d="M78 60h83" stroke="#40536a" strokeDasharray="4 4"/><circle cx="119" cy="60" r="3" fill="#d6dee8"/></g>
 :preset.id==='comet'?<g><path d="M82 75L198 29 103 80Z" fill="#8ba8b627"/><path d="M82 75L209 62 99 80Z" fill="#c4b58d28"/><circle cx="85" cy="76" r="7" fill="#bcc3c3"/></g>
 :<g><circle cx="120" cy="60" r="12" fill="#d4a65d"/>{Array.from({length:100},(_,i)=><circle key={i} cx={120+Math.cos(i*2.4)*(52+i%9)} cy={60+Math.sin(i*2.4)*(30+i%5)} r={.5+(i%3)*.2} fill="#8795a9"/>)}</g>}</svg></div>;

 return <div className={'scenario-art '+(preset.category==='extreme'?'extreme-art':'')}><span className="art-orbit"/><span className="art-orbit second"/><PlanetSwatch body={{id,color:'#ab967d',type:id==='sun'?'star':'planet'}} size={76}/><Icon name={preset.category==='mission'?'mission':preset.category==='satellite'?'orbit':'explore'} size={18}/></div>;
}
