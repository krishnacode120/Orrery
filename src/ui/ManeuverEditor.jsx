import {useState} from 'react';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {burnVector,rocketMass,G0} from '../physics/vehicles.js';
import {norm,DAY} from '../physics/units.js';
import {uid} from '../store/actions.js';
import {NumberField,Readouts,fmt,Select} from './Fields.jsx';
export default function ManeuverEditor({body,parent,run}){
 const sim=useSimStore(),s=sim.scenario,ui=useUIStore(),[components,setComponents]=useState([100,0,0]),[delay,setDelay]=useState(120),[active,setActive]=useState('');
 const node=s.maneuvers.find(n=>n.id===active),draft={components,direction:'vector',vector:[0,0,0],deltaV:norm(components)},dv=burnVector(body,parent,node??draft),stage=body.rocket?.stages[body.rocket.stage],mass=body.rocket?rocketMass(body.rocket):body.mass,propellant=stage?mass*(1-Math.exp(-norm(dv)/(stage.isp*G0))):null,duration=stage?propellant/(stage.thrust*(stage.engineCount??1)/(stage.isp*G0)):null;
 const edit=(key,value)=>run(()=>sim.edit(d=>{const n=d.maneuvers.find(n=>n.id===active);if(n.executed)throw new Error('Executed burns are immutable');n[key]=value;if(key==='components')n.deltaV=norm(value);d.view.predictionEnabled=true;}));
 const add=()=>run(()=>sim.edit(d=>{const id=uid('node');d.maneuvers.push({id,bodyId:body.id,jd:d.jd+delay/DAY,components:[...components],direction:'vector',vector:[0,0,0],deltaV:norm(components),executed:false,fuelAware:!!body.rocket});d.view.predictionEnabled=true;d.view.predictionDuration=Math.max(3600,delay*2);setActive(id);}));
 return <details open><summary>Vector maneuver editor</summary><div className="stack"><small>Components are resolved in the vehicle's local orbital basis at execution. Burns are ideal impulses. Finite-duration engines remain available through manual throttle; duration below is a thrust-based estimate.</small>
 <Select label="Existing maneuver" value={active} options={[['','New node'],...s.maneuvers.filter(n=>n.bodyId===body.id).map(n=>[n.id,n.failed?'Rejected':n.executed?'Executed':'T+'+fmt((n.jd-s.jd)*DAY,1)+' s'])]} commit={setActive}/>
 <div className="triple">{['Prograde','Normal','Radial'].map((label,i)=><NumberField key={label} label={label+' · m/s'} value={node?.components?.[i]??components[i]} commit={value=>{const values=(node?.components??components).map((x,k)=>k===i?value:x);node?edit('components',values):setComponents(values);}}/>)}</div>
 <NumberField label="Burn time from now · s" value={node?(node.jd-s.jd)*DAY:delay} commit={value=>node?edit('jd',s.jd+Math.max(0,value)/DAY):setDelay(Math.max(0,value))}/>
 <Readouts values={[['Δv at current basis',fmt(norm(dv),3)+' m/s'],['Propellant estimate',propellant==null?'Ideal satellite impulse':fmt(propellant,2)+' kg'],['Full-thrust duration estimate',duration==null?'No engine configured':fmt(duration,2)+' s']]}/>
 {propellant!=null&&propellant>stage.fuel&&<small className="warning">! Active stage has insufficient fuel for this estimate.</small>}
 {!node&&<><button disabled={s.mode!=='sandbox'} onClick={add}>Schedule node and predict</button><button disabled={s.mode!=='sandbox'} onClick={()=>{ui.update({nodePick:{bodyId:body.id,components}});sim.configureView({orbits:true});}}>Place burn time on selected orbit</button></>}
 {ui.nodePick&&<small className="warning">Click the selected orbit line to choose burn epoch. Placement uses its current osculating ellipse. Esc cancels.</small>}
 {node&&!node.executed&&<button onClick={()=>run(()=>sim.edit(d=>d.maneuvers=d.maneuvers.filter(n=>n.id!==node.id)))}>Delete selected node</button>}
 {sim.prediction?.closestApproach&&<Readouts values={[['Predicted closest approach',fmt(sim.prediction.closestApproach.distance/1000,3)+' km'],['Encounter UTC JD',fmt(sim.prediction.closestApproach.jd,8)],['Encounter speed',fmt(sim.prediction.closestApproach.relativeSpeed/1000,3)+' km/s']]}/>}
 </div></details>;
}
