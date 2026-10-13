import {useEffect} from 'react';
import {useThree} from '@react-three/fiber';
import {Vector3,Raycaster,Vector2} from 'three';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {useCameraStore} from '../store/useCameraStore.js';
import {viewSpace,displayRadius} from './viewSpace.js';
import {renderScenario} from '../rendering/frame.js';
import {focusCamera} from '../navigation/actions.js';
import {canSelect,selectObject} from '../interaction/selection.js';
import {pickBody} from '../interaction/picking.js';

export default function Picking(){
 const {camera,gl}=useThree();
 useEffect(()=>{
  const canvas=gl.domElement,ray=new Raycaster();let press=null,moved=false,lastHover=0;
  const allowed=()=>canSelect(useUIStore.getState())&&document.pointerLockElement!==canvas&&performance.now()>=(useCameraStore.getState().suppressPickUntil??0);
  const pick=e=>{
   const s=renderScenario(useSimStore.getState().scenario),sp=viewSpace(s),rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
   ray.setFromCamera(new Vector2(x/rect.width*2-1,1-y/rect.height*2),camera);
   const candidates=[];
   for(const b of s.bodies){
    if(!b.visible||s.view.showMoons===false&&b.type==='moon')continue;
    const position=sp.transform(b.position),p=new Vector3(...position).project(camera);
    candidates.push({id:b.id,position,radius:displayRadius(b,s,sp),inFront:p.z>=-1&&p.z<=1,screen:[(p.x+1)*rect.width/2,(1-p.y)*rect.height/2]});
   }
   return pickBody(candidates,ray.ray.origin.toArray(),ray.ray.direction.toArray(),[x,y],e.pointerType==='touch'?18:11);
  };
  const down=e=>{press={id:e.pointerId,x:e.clientX,y:e.clientY,allowed:allowed()};moved=false;};
  const move=e=>{
   if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>5)moved=true;
   if(!e.buttons&&allowed()&&performance.now()-lastHover>50){lastHover=performance.now();const hit=pick(e);canvas.style.cursor=hit?'pointer':'default';}
  };
  const click=e=>{
   if(moved||press&&!press.allowed||!allowed())return;
   const hit=pick(e);selectObject(hit?.id??null);
   useUIStore.getState().update({pickDebug:hit});
  };
  const double=e=>{if(!moved&&allowed()){const hit=pick(e);if(hit)focusCamera(hit.id);}};
  const context=e=>{if(!moved&&allowed()){const hit=pick(e);if(hit){e.preventDefault();useUIStore.getState().update({context:{id:hit.id,x:e.clientX,y:e.clientY}});}}};
  const cancel=()=>{moved=true;press=null;};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointercancel',cancel);
  canvas.addEventListener('click',click);canvas.addEventListener('dblclick',double);canvas.addEventListener('contextmenu',context);
  return()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('click',click);canvas.removeEventListener('dblclick',double);canvas.removeEventListener('contextmenu',context);canvas.style.cursor='';};
 },[camera,gl]);return null;
}
