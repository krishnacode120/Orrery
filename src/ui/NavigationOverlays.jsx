import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {focusBody} from './Workspace.jsx';
import {spacecraftAt} from '../physics/catalog.js';
import {uid} from '../store/actions.js';
import {sphereOfInfluence} from '../physics/transfers.js';
import {norm,sub} from '../physics/units.js';
export function BodyContext(){
 const ui=useUIStore(),sim=useSimStore(),s=sim.scenario,c=ui.context,b=s.bodies.find(x=>x.id===c?.id);if(!c||!b)return null;
 const action=fn=>{try{fn();}catch(e){sim.fail(e.message);}ui.update({context:null});};
 const sandbox=s.mode==='sandbox';
 return <div className="context-menu" role="menu" aria-label={b.name+' actions'} style={{left:Math.min(c.x,window.innerWidth-190),top:Math.min(c.y,window.innerHeight-390)}} onKeyDown={e=>{if(e.key==='Escape')ui.update({context:null});}}>
 {[['Focus',()=>{focusBody(b.id);sim.configureView({cameraMode:'orbit'});}],['Follow',()=>focusBody(b.id)],['Inspect',()=>{sim.configureView({selected:b.id,panel:'inspector'});ui.workspace({right:true});}],['Predict orbit',()=>{sim.configureView({selected:b.id,predictionEnabled:true,panel:'analysis'});ui.workspace({right:true});}],['Set as target',()=>sim.configureView({targetId:b.id})],['Measure from',()=>{ui.update({measurementFrom:b.id});ui.workspace({right:true});sim.configureView({panel:'measure'});}]].map(([label,fn])=><button role="menuitem" key={label} onClick={()=>action(fn)}>{label}</button>)}
 {sandbox&&<>{!b.massless&&<button role="menuitem" onClick={()=>action(()=>sim.edit(d=>{const sat=spacecraftAt(b,{altitude:400000},0,d.jd);sat.id=uid('satellite');d.bodies.push(sat);d.view.selected=sat.id;}))}>Create satellite</button>}{[['duplicate','Duplicate'],['pin',b.locked?'Unfreeze':'Freeze'],['delete','Delete']].map(([key,label])=><button role="menuitem" key={key} onClick={()=>action(()=>sim.action(b.id,key))}>{label}</button>)}</>}
 <button role="menuitem" onClick={()=>ui.update({context:null})}>Close</button></div>;
}
export function MiniMap(){
 const sim=useSimStore(),s=sim.scenario,ui=useUIStore(),selected=s.bodies.find(x=>x.id===s.view.selected);
 if(!s.view.miniMap)return null;
 const mode=s.view.miniMapMode??'system',primary=s.bodies.find(x=>x.id===selected?.parentId),center=mode==='system'?s.bodies.find(x=>x.id==='sun'):mode==='planetary'?(selected?.type==='planet'?selected:primary):primary??selected;
 const bodies=s.bodies.filter(x=>x.visible&&!x.disrupted&&(mode==='system'?x.type!=='moon'&&!x.massless:x.id===center?.id||x.parentId===center?.id));
 const origin=center?.position??[0,0,0],extent=Math.max(1,...bodies.map(b=>norm(sub(b.position,origin))))*1.1;
 const map=p=>[100+(p[0]-origin[0])/extent*85,70-(p[1]-origin[1])/extent*62],cam=ui.cameraSI?map(ui.cameraSI):null;
 return <section className="mini-map" aria-label="Navigation map"><div className="row"><select aria-label="Map reference frame" value={mode} onChange={e=>sim.configureView({miniMapMode:e.target.value})}>{[['system','Solar System'],['planetary','Planetary system'],['local','Local orbit']].map(([k,label])=><option key={k} value={k}>{label}</option>)}</select><button aria-label="Close minimap" onClick={()=>sim.configureView({miniMap:false})}>×</button></div><svg viewBox="0 0 200 140"><path d="M15 70H185M100 8V132" stroke="#384557" strokeWidth=".5"/>{[20,40,60].map(r=><ellipse key={r} cx="100" cy="70" rx={r*1.3} ry={r} fill="none" stroke="#253446"/>)}{bodies.slice(0,100).map(b=>{const [x,y]=map(b.position);return <g key={b.id} role="button" tabIndex="0" aria-label={'Focus '+b.name} onKeyDown={e=>{if(e.key==='Enter')focusBody(b.id);}} onClick={()=>focusBody(b.id)}><circle cx={x} cy={y} r={b.id===selected?.id?4:2} fill={b.color}/><title>{b.name}</title></g>;})}{cam&&Math.abs(cam[0]-100)<100&&Math.abs(cam[1]-70)<70&&<path d={'M'+cam[0]+' '+(cam[1]-4)+'l-3 7h6Z'} fill="none" stroke="#f2d39f"/>}</svg><small>J2000 ecliptic top-down · △ camera</small></section>;
}
