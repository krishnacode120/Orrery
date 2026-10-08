import {useRef,useMemo} from 'react';
import {focusCamera} from '../navigation/actions.js';
import {useFrame,useThree} from '@react-three/fiber';
import {Html,Line} from '@react-three/drei';
import {Vector3,Color} from 'three';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {viewSpace,displayRadius} from './viewSpace.js';
import {renderScenario} from '../rendering/frame.js';
import {sphereOfInfluence} from '../physics/transfers.js';
import {lagrangePoints} from '../physics/observations.js';
import {primaryFor} from '../physics/orbital.js';
import {norm,sub,add,unit,G,cross,scale} from '../physics/units.js';
export function AdaptiveLabels(){
 const s=useSimStore(x=>x.scenario),ui=useUIStore(),refs=useRef(new Map()),groups=useRef(new Map()),last=useRef(0);
 const built=viewSpace(s);
 const {camera,size}=useThree();
 const bodies=s.bodies.filter(b=>b.visible&&!b.disrupted&&(!b.massless||b.spacecraft||b.rocket)&&(s.view.showMoons!==false||b.type!=='moon')).sort((a,b)=>(b.id===s.view.selected)-(a.id===s.view.selected)||(a.type==='moon')-(b.type==='moon')).slice(0,100);
 useFrame(({clock})=>{
  const visual=renderScenario(useSimStore.getState().scenario);for(const b of visual.bodies){const group=groups.current.get(b.id);if(group)group.position.fromArray(built.transform(b.position));}
  if(clock.elapsedTime-last.current<.12)return;last.current=clock.elapsedTime;
  const current=visual,space=viewSpace(current),boxes=[];
  for(const b of bodies){
   const el=refs.current.get(b.id);if(!el)continue;const actual=current.bodies.find(x=>x.id===b.id);if(!actual)continue;
   const point=new Vector3(...space.transform(actual.position)),distance=point.distanceTo(camera.position),radius=displayRadius(actual,current,space),selected=b.id===current.view.selected;
   point.project(camera);let visible=point.z<1&&point.z>-1&&Math.abs(point.x)<.98&&Math.abs(point.y)<.95;
   if(!selected&&b.type==='moon'&&distance/radius>8000)visible=false;
   if(!selected&&['vehicle','true'].includes(current.view.scale))visible=false;
   const x=(point.x+1)/2*size.width,y=(1-point.y)/2*size.height,box=[x-35,y-12,x+70,y+12];
   if(!selected&&boxes.some(r=>box[0]<r[2]&&box[2]>r[0]&&box[1]<r[3]&&box[3]>r[1]))visible=false;
   if(visible)boxes.push(box);el.style.opacity=visible?'1':'0';el.style.pointerEvents=visible?'auto':'none';
  }
 });
 if(!s.view.labels||ui.hidden||!ui.hud)return null;
 const space=viewSpace(s);
 return <>{bodies.map(b=><Html ref={g=>g?groups.current.set(b.id,g):groups.current.delete(b.id)} key={b.id} position={space.transform(b.position)} center zIndexRange={[12,0]} style={{pointerEvents:'none'}}>
 <button ref={el=>el?refs.current.set(b.id,el):refs.current.delete(b.id)} className={'body-label '+(b.id===s.view.selected?'selected':'')} style={{pointerEvents:'auto',fontSize:10*(s.view.labelScale??1),transform:'translate(18px,-15px)'}} onClick={()=>useSimStore.getState().configureView({selected:b.id})} onDoubleClick={()=>{focusCamera(b.id);}}>{b.id===s.view.selected?'⌖ ':'· '}{b.name}</button></Html>)}</>;
}
export function ScienceOverlays(){
 const sim=useSimStore(),s=sim.scenario,space=viewSpace(s),b=s.bodies.find(x=>x.id===s.view.selected),ui=useUIStore();
 const grid=useMemo(()=>{
  if(s.view.gravityGrid==='off'||!s.view.gravityGrid)return [];
  const n={low:12,medium:20,high:32}[s.view.gravityGrid],extent=60,lines=[],sources=s.bodies.filter(x=>!x.massless).slice(0,64);
  const point=(x,z)=>{let depth=0;for(const p of sources){const q=space.transform(p.position);depth+=Math.log1p(p.mass/1e24)/Math.sqrt((x-q[0])**2+(z-q[2])**2+4);}return [x,-Math.min(14,depth*.8),z];};
  for(let i=0;i<=n;i++){const a=-extent+2*extent*i/n;lines.push(Array.from({length:n+1},(_,j)=>point(a,-extent+2*extent*j/n)));lines.push(Array.from({length:n+1},(_,j)=>point(-extent+2*extent*j/n,a)));}
  return lines;
 },[s.view.gravityGrid,sim.revision,Math.floor(s.jd),s.view.scale,s.view.selected]);
 const a=s.bodies.find(x=>x.id===ui.measurementFrom),other=s.bodies.find(x=>x.id===ui.measurementTo);
 const total=s.bodies.filter(x=>!x.massless&&x.mass>0).reduce((m,x)=>m+x.mass,0),center=[0,0,0];
 if(s.view.showBarycenter&&total)for(const x of s.bodies)if(!x.massless)for(let k=0;k<3;k++)center[k]+=x.position[k]*(x.mass/total);
 const primary=b?primaryFor(b,s.bodies):null,star=s.bodies.find(x=>x.type==='star');
 const terminators=s.view.terminator&&star?s.bodies.filter(x=>!x.massless&&x.type!=='star'&&(x.id===b?.id||x.id===b?.parentId)).map(x=>{const n=unit(sub(star.position,x.position)),up=Math.abs(n[2])<.9?[0,0,1]:[1,0,0],u=unit(cross(n,up)),w=unit(cross(n,u)),radius=displayRadius(x,s,space)*space.unit/space.distanceScale*1.002;return {id:x.id,points:Array.from({length:129},(_,i)=>space.transform(add(x.position,add(scale(u,Math.cos(i/128*Math.PI*2)*radius),scale(w,Math.sin(i/128*Math.PI*2)*radius)))))};}):[];
 return <>
 {s.view.showLagrange&&b&&primary&&lagrangePoints(primary,b).map(p=><Html key={p.name} position={space.transform(p.position)} center><span className="body-label" title={p.model}>+ {p.name} · CR3BP</span></Html>)}
 {terminators.map(t=><Line key={'terminator'+t.id} points={t.points} color="#c0c7b4" transparent opacity={.55} lineWidth={1}/>)}
 {s.view.showSOI&&s.bodies.filter(x=>!x.massless&&(x.id===b?.id||x.id===b?.parentId||x.id===s.view.targetId)).map(x=>{const soi=sphereOfInfluence(x,s.bodies,s.settings);return soi?<group key={x.id} position={space.transform(x.position)}><mesh><sphereGeometry args={[soi/space.unit*space.distanceScale,32,16]}/><meshBasicMaterial wireframe color="#688a9c" transparent opacity={.08} depthWrite={false}/></mesh><Html position={[soi/space.unit,0,0]}><span className="body-label">{x.name} SOI</span></Html></group>:null;})}
 {s.view.transferPath&&s.view.transferPreview?.path?.length>1&&<Line points={s.view.transferPreview.path.map(space.transform)} color="#e0bb7e" dashed lineWidth={1.2}/>}
 {s.view.showAcceleration&&b&&norm(b.acceleration??[])>0&&<arrowHelper args={[new Vector3(...[b.acceleration[0],b.acceleration[2],-b.acceleration[1]]).normalize(),new Vector3(...space.transform(b.position)),3,0xd5a585,.4,.2]}/>}
 {s.view.showBarycenter&&total>0&&<Html position={space.transform(center)} center><span className="body-label">⊕ Barycenter</span></Html>}
 {a&&other&&<Line points={[space.transform(a.position),space.transform(other.position)]} color="#a2bcb8" dashed lineWidth={1}/>}
 {grid.map((points,i)=><Line key={i} points={points} color="#6c8091" transparent opacity={.18} lineWidth={.5}/>)}
 {grid.length>0&&<Html position={[0,-15,0]}><span className="body-label">Gravity grid · visual analogy</span></Html>}
 </>;
}
