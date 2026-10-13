import styled from 'styled-components';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {showObjectInfo,closeObjectInfo,clearSelection} from '../interaction/selection.js';
import {focusCamera,setCameraMode} from '../navigation/actions.js';
import {derivedOrbit,density} from '../physics/orbital.js';
import {G,AU,DAY,norm,sub} from '../physics/units.js';
import {fmt,Readouts} from './Fields.jsx';
const Card=styled.section`
 position:fixed;z-index:24;right:${p=>p.$inspector?'390px':'20px'};top:130px;width:270px;max-height:calc(100dvh - 230px);overflow:auto;
 background:#111923f5;border:1px solid #45505c;border-radius:8px;padding:12px;font-size:12px;
 h2{font-size:16px;margin:0} button{min-height:32px} small{color:#aab6c3}
 @media(max-width:800px){z-index:51;right:10px;left:10px;top:auto;bottom:165px;width:auto;max-height:38dvh}
`;
export default function ObjectInfo(){
 const sim=useSimStore(),ui=useUIStore();
 return <ObjectInfoContent sim={sim} ui={ui}/>;
}
export function ObjectInfoContent({sim,ui}){
 const s=sim.scenario,selected=s.bodies.find(b=>b.id===s.view.selected),b=s.bodies.find(b=>b.id===ui.infoObjectId);
 if(ui.hidden||!selected&&!b)return null;
 const object=b??selected,sun=s.bodies.find(x=>x.id==='sun'),orbit=derivedOrbit(object,s.bodies,s.settings).elements;
 const speed=sun?norm(sub(object.velocity,sun.velocity)):null,mu=G*s.settings.gMultiplier*object.mass;
 const values=[
 ['Sun distance · calculated',sun&&sun.id!==object.id?fmt(norm(sub(object.position,sun.position))/AU,5)+' AU':'—'],
 ['Heliocentric speed',speed!==null?fmt(speed/1000,3)+' km/s':'Unknown'],
 ['Physical radius',fmt(object.radius/1000,2)+' km'],['Mass',object.mass.toExponential(4)+' kg'],
 ['Density · calculated/override',fmt(density(object),1)+' kg/m³'],['Surface gravity',fmt(mu/object.radius**2,3)+' m/s²'],
 ['Escape speed',fmt(Math.sqrt(2*mu/object.radius)/1000,3)+' km/s'],['Spin period',object.spin?.period?fmt(object.spin.period/3600,2)+' h':'Unknown'],
 ['Orbital period',orbit?.period?fmt(orbit.period/DAY,3)+' days':'Unbound / unavailable'],
 ['Semi-major axis',orbit?.a?fmt(orbit.a/AU,6)+' AU':'Unknown'],['Eccentricity',orbit?fmt(orbit.e,6):'Unknown'],
 ['Inclination · J2000',orbit?fmt(orbit.i*180/Math.PI,3)+'°':'Unknown'],
 ['Periapsis / apoapsis',orbit?fmt(orbit.periapsis/1000)+' / '+(orbit.apoapsis?fmt(orbit.apoapsis/1000):'unbound')+' km':'Unknown'],
 ['Moons in this scenario',s.bodies.filter(x=>x.parentId===object.id&&x.type==='moon').map(x=>x.name).join(', ')||'None loaded'],
 ];
 return <Card $inspector={ui.right&&!!s.view.panel} aria-label="Object information" onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
 <div className="row spread"><div><h2>{object.name}</h2><small>{object.type} · {s.mode==='reality'?'Ephemeris state':'Simulation state'}</small></div>
 {b&&<button aria-label="Close information" onClick={closeObjectInfo}>×</button>}</div>
 {b&&!ui.infoCollapsed&&<><Readouts values={values.slice(0,4)}/><details><summary>More information</summary><Readouts values={values.slice(4)}/>{object.type==='star'&&<Readouts values={[['Temperature · model',object.temperature?fmt(object.temperature)+' K':'Unknown'],['Luminosity · model',object.luminosity?object.luminosity.toExponential(3)+' W':'Unknown'],['Spectral type',object.metadata?.spectralType??'Unknown']]}/>}<small>Physical values in the J2000 ecliptic frame; visual exaggeration never enters these calculations. Orbital elements are osculating estimates.</small></details></>}
 <div className="row" style={{flexWrap:'wrap',marginTop:8}}>{!b?<button onClick={()=>showObjectInfo(object.id)}>Info</button>:<button onClick={()=>ui.update({infoCollapsed:!ui.infoCollapsed})}>{ui.infoCollapsed?'Expand':'Collapse'}</button>}
 <button onClick={()=>focusCamera(object.id)}>Focus</button><button onClick={()=>focusCamera(object.id,'follow')}>Follow</button>
 <button onClick={()=>{sim.configureView({selected:object.id,panel:'inspector'});ui.workspace({right:true});}}>Inspect</button>
 <button onClick={clearSelection}>Clear Selection</button></div>
 {s.view.cameraMode!=='free'&&<button style={{marginTop:8}} onClick={()=>setCameraMode('free')}>Return to Free Camera</button>}
 </Card>;
}
