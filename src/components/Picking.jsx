import {useEffect} from 'react';
import {useThree} from '@react-three/fiber';
import {Vector3} from 'three';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {useCameraStore} from '../store/useCameraStore.js';
import {viewSpace} from './viewSpace.js';
import {focusCamera} from '../navigation/actions.js';
// Screen-space targets do not change rendered radii. Only visible, front-facing
// body centres within 10 pixels are eligible; the nearest projected target wins.
export default function Picking(){
 const {camera,gl}=useThree();
 useEffect(()=>{
  const canvas=gl.domElement;
  const pick=e=>{
   if(useUIStore.getState().tool!=='select'||document.pointerLockElement===canvas||performance.now()<(useCameraStore.getState().suppressPickUntil??0))return null;
   const s=useSimStore.getState().scenario,sp=viewSpace(s),rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;let best=null,distance=11;
   for(const b of s.bodies){if(!b.visible||b.disrupted||b.type==='asteroid'||s.view.showMoons===false&&b.type==='moon')continue;
    const p=new Vector3(...sp.transform(b.position)).project(camera);if(p.z>1||p.z< -1)continue;
    const d=Math.hypot((p.x+1)*rect.width/2-x,(1-p.y)*rect.height/2-y);if(d<distance){best=b;distance=d;}
   }
   return best;
  };
  const click=e=>{const b=pick(e);if(b)useSimStore.getState().configureView({selected:b.id});};
  const double=e=>{const b=pick(e);if(b)focusCamera(b.id);};
  const context=e=>{const b=pick(e);if(b){e.preventDefault();useUIStore.getState().update({context:{id:b.id,x:e.clientX,y:e.clientY}});}};
  const move=e=>{if(!e.buttons)canvas.style.cursor=pick(e)?'pointer':'default';};
  canvas.addEventListener('click',click);canvas.addEventListener('dblclick',double);canvas.addEventListener('contextmenu',context);canvas.addEventListener('pointermove',move);
  return()=>{canvas.removeEventListener('click',click);canvas.removeEventListener('dblclick',double);canvas.removeEventListener('contextmenu',context);canvas.removeEventListener('pointermove',move);canvas.style.cursor='';};
 },[camera,gl]);return null;
}
