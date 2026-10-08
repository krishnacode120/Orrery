import {useRef,useEffect} from 'react';
import {useThree} from '@react-three/fiber';
import {Plane,Vector3} from 'three';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {viewSpace} from './viewSpace.js';
import {sub,add} from '../physics/units.js';
export function useBodyDrag(body){
 const drag=useRef(null),{camera}=useThree();
 useEffect(()=>{
  const cancel=()=>{const d=drag.current;if(!d)return;drag.current=null;useSimStore.setState({paused:d.paused});useUIStore.getState().update({tool:'select',placementPreview:null,draggingBody:false});try{d.target.releasePointerCapture(d.pointerId);}catch{}};
  const key=e=>{if(e.key==='Escape')cancel();};
  const unsubscribe=useUIStore.subscribe((state)=>{if(state.tool==='select'&&drag.current)cancel();});
  window.addEventListener('keydown',key);window.addEventListener('blur',cancel);
  return()=>{unsubscribe();window.removeEventListener('keydown',key);window.removeEventListener('blur',cancel);cancel();};
 },[]);
 return {
 onContextMenu:e=>{e.stopPropagation();e.nativeEvent?.preventDefault();useUIStore.getState().update({context:{id:body.id,x:e.clientX,y:e.clientY}});},
 onPointerDown:e=>{
  if(!(e.ctrlKey||e.shiftKey))return;
  const sim=useSimStore.getState();if(sim.scenario.mode!=='sandbox')return;e.stopPropagation();
  const space=viewSpace(sim.scenario),plane=new Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new Vector3()),new Vector3(...space.transform(body.position)));
  const hit=e.ray.intersectPlane(plane,new Vector3());if(!hit)return;
  drag.current={plane,space,point:space.inverse(hit.toArray()),position:[...body.position],velocity:[...body.velocity],throwing:e.shiftKey,paused:sim.paused,target:e.target,pointerId:e.pointerId};
  useSimStore.setState({paused:true});sim.configureView({selected:body.id});useUIStore.getState().update({tool:e.shiftKey?'throw':'move',draggingBody:true});e.target.setPointerCapture(e.pointerId);
 },
 onPointerMove:e=>{
  const d=drag.current;if(!d)return;e.stopPropagation();const hit=e.ray.intersectPlane(d.plane,new Vector3());if(!hit)return;
  const p=d.space.inverse(hit.toArray()),end=add(d.position,sub(p,d.point));
  useUIStore.getState().update({placementPreview:[d.position,end]});
 },
 onPointerUp:e=>{
  const d=drag.current;if(!d)return;e.stopPropagation();const preview=useUIStore.getState().placementPreview;
  try{if(preview)useSimStore.getState().edit(s=>{const b=s.bodies.find(x=>x.id===body.id);if(!b)return;if(d.throwing)b.velocity=add(d.velocity,sub(preview[1],preview[0]).map(x=>x/(d.space.unit/10000)));else b.position=preview[1];});}
  catch(error){useSimStore.getState().fail(error.message);}
  drag.current=null;useSimStore.setState({paused:d.paused});useUIStore.getState().update({tool:'select',placementPreview:null,draggingBody:false});e.target.releasePointerCapture(e.pointerId);
 },
 };
}
