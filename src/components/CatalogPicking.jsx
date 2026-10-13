import {useEffect} from 'react';
import {useThree} from '@react-three/fiber';
import {Vector3,Raycaster,Vector2} from 'three';
import {pickBody} from '../interaction/picking.js';
import {relativeRender} from '../astronomy/coordinates.js';
import {useExplorerStore} from '../store/useExplorerStore.js';
import {useUIStore} from '../store/useUIStore.js';

// One canvas listener for the whole point catalog. Hit size is in pixels, not
// changing world units; array order cannot choose a distant star over a near one.
export default function CatalogPicking({objects,frame}){
 const {camera,gl}=useThree();
 useEffect(()=>{
  const canvas=gl.domElement;let start=null,moved=false;
  const down=e=>{start=[e.clientX,e.clientY];moved=false;};
  const move=e=>{if(start&&e.buttons&&Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)moved=true;};
  const pick=e=>{
   const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,f=frame.current;
   const ray=new Raycaster();ray.setFromCamera(new Vector2(x/rect.width*2-1,1-y/rect.height*2),camera);
   const system=useExplorerStore.getState().section==='system';
   const candidates=objects.map(o=>{const position=relativeRender(o.position,f.origin,f.unit),p=new Vector3(...position).project(camera);return {id:o.id,position,radius:system?(o.radius??0)/f.unit:0,inFront:p.z>-1&&p.z<1,screen:[(p.x+1)*rect.width/2,(1-p.y)*rect.height/2]};});
   return pickBody(candidates,ray.ray.origin.toArray(),ray.ray.direction.toArray(),[x,y],e.pointerType==='touch'?18:10);
  };
  const allowed=()=>!moved&&!useUIStore.getState().dialog&&performance.now()>=(useExplorerStore.getState().suppressPickUntil??0);
  const click=e=>{if(allowed())useExplorerStore.getState().select(pick(e)?.id??null);};
  const double=e=>{if(allowed()){const o=pick(e);if(o)useExplorerStore.getState().focus(o.id);}};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('click',click);canvas.addEventListener('dblclick',double);
  return()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('click',click);canvas.removeEventListener('dblclick',double);};
 },[camera,gl,objects,frame]);return null;
}
