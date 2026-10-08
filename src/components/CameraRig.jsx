import {useRef,useEffect} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {Vector3} from 'three';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {viewSpace,displayRadius} from './viewSpace.js';
import {sub,unit,norm} from '../physics/units.js';
const V=v=>new Vector3(v[0],v[2],-v[1]);
export default function CameraRig(){
 const controls=useRef(),previous=useRef(null),transition=useRef(null),keys=useRef(new Set()),elapsed=useRef(0),sample=useRef(0);
 const {camera,size}=useThree(),tool=useUIStore(s=>s.tool);
 useEffect(()=>{
 const down=e=>{if(!e.target.closest('input,textarea,select'))keys.current.add(e.key.toLowerCase());},up=e=>keys.current.delete(e.key.toLowerCase());
 const command=e=>{if(!controls.current)return;if(e.detail.type==='snapshot')useSimStore.getState().configureView({camera:{position:camera.position.toArray(),target:controls.current.target.toArray(),scale:useSimStore.getState().scenario.view.scale}});
 if(e.detail.type==='restore'&&e.detail.pose){camera.position.fromArray(e.detail.pose.position);controls.current.target.fromArray(e.detail.pose.target);transition.current=null;}};
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('orrery-camera',command);
 return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('orrery-camera',command);};
 },[camera]);
 useFrame((_,dt)=>{
 const sim=useSimStore.getState(),s=sim.scenario,v=s.view,b=s.bodies.find(x=>x.id===v.selected),space=viewSpace(s),control=controls.current;if(!control)return;
 const workspace=useUIStore.getState(),mobile=size.width<=800,left=workspace.hidden?0:workspace.left?230:workspace.rail?46:0,right=workspace.hidden||!workspace.right||!v.panel||mobile?0:340;
 const usableWidth=Math.max(220,size.width-left-right);
 camera.setViewOffset(size.width,size.height,(right-left)/2,0,size.width,size.height);
 const key=[left,right,v.selected,v.scale,v.scaleMode,v.realDistances,v.realRadii,v.exaggeration,v.distanceScale,v.planetScale,v.moonScale,v.spacecraftScale,v.focusRevision,size.width,size.height].join(':');
 if(previous.current?.key!==key){
  const old=previous.current;
  if(old)camera.position.fromArray(space.transform(old.space.inverse(camera.position.toArray())));
  const target=new Vector3(...(v.scale==='system'?[0,0,0]:space.transform(b?.position??space.origin)));
  const radius=b?displayRadius(b,s,space):2,ring=radius*(b?.rings?b.rings.outer/b.radius:b?.blackHole?.diskSize??1);
  let extent=v.scale==='system'?Math.max(12,...s.bodies.filter(x=>!x.massless&&x.type!=='moon').map(x=>norm(space.transform(x.position)))):v.scale==='planetary'?Math.max(10,...s.bodies.filter(x=>x.parentId===b?.id).map(x=>new Vector3(...space.transform(x.position)).distanceTo(target))):0;
  const local=['vehicle','true'].includes(v.scale),distance=(v.scale==='system'?extent*3:v.scale==='planetary'?extent*2.2:v.scale==='earth'?16:Math.max(b?.rocket?radius*15:b?.spacecraft?radius*12:7.5,ring*3.8))*Math.max(1,1/(usableWidth/size.height));
  let direction=new Vector3(.3,.5,1).normalize();
  const star=s.bodies.find(x=>x.type==='star'&&x.id!==b?.id);
  if(local&&b&&star){direction=V(unit(sub(star.position,b.position))).applyAxisAngle(new Vector3(0,1,0),.6);direction.y+=b.rings?.8:.25;direction.normalize();}
  if(v.reducedMotion||!old){camera.position.copy(target).addScaledVector(direction,distance);transition.current=null;}
  else {const from=camera.position.clone().sub(target);transition.current={target,from:from.clone().normalize(),to:direction,r0:Math.max(.001,from.length()),r1:distance,t:0};}
  control.target.copy(target);camera.up.set(0,1,0);elapsed.current=0;
  if(!old&&v.camera?.scale===v.scale){camera.position.fromArray(v.camera.position);control.target.fromArray(v.camera.target);}
 }
 previous.current={key,space};elapsed.current+=dt;
 if(transition.current){
  const t=transition.current;t.t=Math.min(1,t.t+dt/1.6);const e=t.t*t.t*(3-2*t.t),direction=t.from.clone().lerp(t.to,e).normalize(),radius=Math.exp(Math.log(t.r0)*(1-e)+Math.log(t.r1)*e);
  camera.position.copy(t.target).addScaledVector(direction,radius);control.target.copy(t.target);if(t.t===1)transition.current=null;
 }else if(b){
  const target=new Vector3(...space.transform(b.position)),parent=s.bodies.find(x=>x.id===b.parentId),mode=v.cameraMode;
  const relative=sub(b.velocity,parent?.velocity??[0,0,0]),direction=V(unit(relative)),up=V(unit(sub(b.position,parent?.position??[0,0,0])));
  if(['follow','chase','rocket chase','satellite chase','side','nose'].includes(mode)){
   camera.position.add(target.clone().sub(control.target));control.target.copy(target);
   if(mode!=='follow'){
    const heading=V(b.rocket?.orientation??b.spacecraft?.orientation??unit(relative)),radius=Math.max(displayRadius(b,s,space),.01),distance=radius*(b.rocket?13:7);
    let offset=direction.clone().multiplyScalar(-distance).addScaledVector(up,distance*.3);
    if(mode==='side')offset=new Vector3().crossVectors(direction,up).normalize().multiplyScalar(distance);
    if(mode==='nose'){offset=heading.clone().multiplyScalar(radius*2);control.target.copy(target).addScaledVector(heading,100*radius);}
    camera.position.lerp(target.clone().add(offset),1-Math.exp(-dt*3));camera.up.copy(up);
   }
  }
  if(mode==='destination'){
   const dest=s.bodies.find(x=>x.id===v.targetId);if(dest){const other=new Vector3(...space.transform(dest.position)),center=other.clone().add(target).multiplyScalar(.5),distance=other.distanceTo(target);control.target.lerp(center,1-Math.exp(-dt*3));camera.position.lerp(center.clone().add(new Vector3(0,distance*.6,distance*.9)),1-Math.exp(-dt*2));}
  }
  if(mode==='cinematic'||mode==='flyby'){
   const r=Math.max(8,camera.position.distanceTo(target)),a=elapsed.current*.1;
   control.target.copy(target);camera.position.copy(target).add(new Vector3(Math.sin(a)*r,r*.3,Math.cos(a)*r));
   const frames=v.keyframes;if(mode==='cinematic'&&frames.length>1){const t=(elapsed.current/8)%(frames.length-1),i=Math.floor(t);camera.position.fromArray(frames[i].position).lerp(new Vector3(...frames[i+1].position),t-i);control.target.fromArray(frames[i].target).lerp(new Vector3(...frames[i+1].target),t-i);}
  }
 }
 if(v.cameraMode==='free'){
  const dir=new Vector3();camera.getWorldDirection(dir);const right=new Vector3().crossVectors(dir,camera.up).normalize(),move=new Vector3();
  if(keys.current.has('w'))move.add(dir);if(keys.current.has('s'))move.sub(dir);if(keys.current.has('a'))move.sub(right);if(keys.current.has('d'))move.add(right);if(keys.current.has('q'))move.y-=1;if(keys.current.has('e'))move.y+=1;
  move.multiplyScalar(dt*(keys.current.has('shift')?40:8));camera.position.add(move);control.target.add(move);
 }
 const distance=camera.position.distanceTo(control.target);camera.near=Math.max(1e-7,Math.min(.01,distance*1e-5));camera.far=Math.max(2000,distance*10,...s.bodies.filter(x=>!x.massless).map(x=>new Vector3(...space.transform(x.position)).distanceTo(camera.position)*2));camera.updateProjectionMatrix();
 control.update();
 sample.current+=dt;if(sample.current>1){sample.current=0;useUIStore.getState().update({cameraSI:space.inverse(camera.position.toArray())});}
 });
 return <OrbitControls ref={controls} makeDefault enabled={tool==='select'} enableDamping minDistance={1e-5} maxDistance={1e20} onStart={()=>{transition.current=null;const sim=useSimStore.getState();if(!['orbit','follow','free'].includes(sim.scenario.view.cameraMode))sim.configureView({cameraMode:'orbit'});}}/>;
}
