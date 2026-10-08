import {useSimStore} from '../store/useSimStore.js';
import {deltaVBudget} from '../physics/flight.js';
import {burnVector} from '../physics/vehicles.js';
import {norm,sub,unit,cross,dot,DAY,add,scale,G} from '../physics/units.js';
import {Select,Toggle,Readouts,fmt} from './Fields.jsx';
import {uid} from '../store/actions.js';
export function FlightInstruments({body:b,parent,s,run}){
 const sim=useSimStore(),vehicle=b.rocket??b.spacecraft,budget=deltaVBudget(b.rocket),target=s.bodies.find(x=>x.id===(s.view.targetId??s.mission.targetId));
 const forward=unit(vehicle.orientation),radial=unit(sub(b.position,parent.position));
 let right=unit(cross(forward,radial));if(norm(right)<.1)right=unit(cross(forward,[0,0,1]));const up=unit(cross(right,forward));
 const markers=[['prograde','P'],['retrograde','R'],['normal','N'],['antinormal','−N'],['out','+r'],['in','−r']].map(([direction,label])=>{const axis=unit(burnVector(b,parent,{direction,deltaV:1}));return {label,x:70+dot(axis,right)*53,y:70-dot(axis,up)*53,front:dot(axis,forward)>=0};});
 const set=(key,value)=>run(()=>sim.edit(d=>(d.bodies.find(x=>x.id===b.id).rocket??d.bodies.find(x=>x.id===b.id).spacecraft)[key]=value));
 const circularize=()=>run(()=>sim.edit(d=>{
 const body=d.bodies.find(x=>x.id===b.id),r=sub(body.position,parent.position),v=sub(body.velocity,parent.velocity),tangent=unit(cross(cross(r,v),r)),goal=scale(tangent,Math.sqrt(G*d.settings.gMultiplier*parent.mass/norm(r))),dv=sub(goal,v);
 d.maneuvers.push({id:uid('circularize'),bodyId:b.id,jd:d.jd,deltaV:norm(dv),vector:dv,direction:'vector',executed:false,fuelAware:!!body.rocket});d.view.predictionEnabled=true;
 }));
 return <div className="stack"><svg viewBox="0 0 140 140" className="navball" role="img" aria-label="Attitude indicator; solid markers forward, hollow markers aft"><circle cx="70" cy="70" r="62" fill="#142332" stroke="#607080"/><path d="M8 70A62 62 0 0 0 132 70Z" fill="#3b3327"/><path d="M8 70H132M70 8V132" stroke="#7d8a96" strokeWidth=".5"/><circle cx="70" cy="70" r="4" fill="none" stroke="#f1d198"/>{markers.map(m=><g key={m.label}><circle cx={m.x} cy={m.y} r="7" fill={m.front?'#1b2732':'none'} stroke={m.front?'#a9c6b6':'#778596'}/><text x={m.x} y={m.y+3} fill="#e5e8eb" textAnchor="middle">{m.label}</text></g>)}</svg>
 <Select label="Attitude autopilot" value={vehicle.attitudeMode??(b.rocket?'launch':'hold')} options={[...(b.rocket?[['launch','Launch guidance']]:[]),['hold','Hold attitude'],'prograde','retrograde','normal','antinormal',['in','Radial in'],['out','Radial out']]} commit={v=>set('attitudeMode',v)}/>
 <button onClick={circularize}>Plan circularization burn</button>
 {b.rocket&&<Readouts values={[['Active stage Δv',fmt(budget.stages[0]/1000,3)+' km/s'],['Remaining staged Δv',fmt(budget.total/1000,3)+' km/s'],['Mass flow',fmt((b.rocket.actualThrust??0)/(b.rocket.stages[b.rocket.stage].isp*9.80665),2)+' kg/s']]}/>}
 {target&&<Readouts values={[['Destination',target.name],['Distance to target',fmt(norm(sub(target.position,b.position))/1000)+' km'],['Relative speed',fmt(norm(sub(target.velocity,b.velocity))/1000,3)+' km/s']]}/>}
 <Select label="Vehicle camera" value={s.view.cameraMode} options={['orbit','follow','rocket chase','satellite chase','chase','side','nose','destination','cinematic']} commit={cameraMode=>sim.configureView({cameraMode})}/>
 <Toggle label="Detect landing / impact" value={vehicle.landingEnabled??false} commit={v=>set('landingEnabled',v)}/><small>Landing is a surface-contact model with a 5 m/s safe-touchdown threshold. A powered descent requires manual throttle and attitude control.</small>
 <button onClick={()=>sim.configureView({panel:'planner'})}>Plan interplanetary transfer</button>
 </div>;
}
