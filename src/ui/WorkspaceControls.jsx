import {useState,useMemo} from 'react';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {scalePreset} from '../components/viewSpace.js';
import {measure,sphereOfInfluence,transferPlan} from '../physics/transfers.js';
import {deltaVBudget} from '../physics/flight.js';
import {defaultRocket,rocketMass} from '../physics/vehicles.js';
import {body} from '../physics/body.js';
import {spacecraftAt} from '../physics/catalog.js';
import {G,AU,DAY,add,sub,scale,norm,unit,cross,fromJulianDate} from '../physics/units.js';
import {uid} from '../store/actions.js';
import {Select,Toggle,NumberField,Readouts,fmt} from './Fields.jsx';
import {Field} from './styles.js';
import {focusBody} from './Workspace.jsx';
export function systemView(){const sim=useSimStore.getState();useUIStore.getState().remember({scale:'system',selected:sim.scenario.view.selected,cameraMode:'orbit'});sim.configureView({scale:'system',cameraMode:'orbit',camera:null,focusRevision:(sim.scenario.view.focusRevision??0)+1});}
export function navigation(direction){const pose=useUIStore.getState().navigate(direction);if(pose)useSimStore.getState().configureView({...pose,camera:null});}
export function LayoutControls(){
 const sim=useSimStore(),s=sim.scenario,ui=useUIStore(),[open,setOpen]=useState(false);
 const choose=layout=>{ui.setLayout(layout);const panel={physics:'inspector',mission:'mission',satellite:'mission',god:'god'}[layout];if(panel)sim.configureView({panel});};
 return <><div className="workspace-switch"><button aria-label="Navigate back" disabled={ui.navigationIndex<=0} onClick={()=>navigation(-1)}>←</button><button aria-label="Navigate forward" disabled={ui.navigationIndex>=ui.navigation.length-1} onClick={()=>navigation(1)}>→</button><select aria-label="Workspace layout" value={ui.layout} onChange={e=>choose(e.target.value)}>{['explore','physics','mission','satellite','god','minimal','presentation','cinema'].map(x=><option key={x}>{x}</option>)}</select><button onClick={()=>setOpen(!open)} aria-expanded={open}>View</button><button title="Hide all interface (H)" onClick={ui.toggleInterface}>Hide UI <kbd>H</kbd></button></div>
 {open&&<section className="view-menu" aria-label="Visibility controls"><div className="row spread"><strong>Workspace</strong><button onClick={()=>setOpen(false)}>×</button></div>{[['top','Top controls'],['left','Object navigator'],['right','Inspector'],['bottom','Time / diagnostics'],['rail','Tool rail'],['hud','Viewport HUD']].map(([k,label])=><Toggle key={k} label={label} value={ui[k]} commit={v=>ui.workspace({[k]:v})}/>)}<Toggle label="Labels" value={s.view.labels} commit={x=>sim.configureView({labels:x})}/><Toggle label="Orbit paths" value={s.view.orbits} commit={x=>sim.configureView({orbits:x})}/><button onClick={()=>choose('explore')}>Restore Explore layout</button></section>}
 </>;
}
export function ScaleControls(){
 const sim=useSimStore(),v=sim.scenario.view,change=patch=>sim.configureView({...patch,camera:null,focusRevision:(v.focusRevision??0)+1});
 return <div className="stack"><Select label="Scale model" value={v.scaleMode??'visibility'} options={['scientific','visibility','educational','custom']} commit={m=>change(scalePreset(m))}/><Toggle label="Real distances" value={v.realDistances!==false} commit={x=>change({realDistances:x,scaleMode:'custom'})}/><Toggle label="Actual planet size" value={v.realRadii===true} commit={x=>change({realRadii:x,scaleMode:'custom'})}/>
 {v.scaleMode==='custom'&&[['distanceScale','Distance multiplier'],['planetScale','Planet / star radius'],['moonScale','Moon radius'],['spacecraftScale','Vehicle radius'],['trailScale','Trail thickness'],['labelScale','Label size']].map(([k,label])=><NumberField key={k} label={label} value={v[k]??1} commit={x=>change({[k]:Math.max(.01,Math.min(1e6,x))})}/>)}
 <small>{v.realDistances===false?'Compressed display distances. ': 'Physical orbital distance ratios. '}{v.realRadii?'Physical radii; use markers and Focus to find distant bodies.':'Body sizes are visually exaggerated at system scale.'} Physics always uses SI.</small></div>;
}
