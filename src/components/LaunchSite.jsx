import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Vector3,Quaternion} from 'three';
import {useSimStore} from '../store/useSimStore.js';
import {viewSpace} from './viewSpace.js';
import {sub,norm,scale,add,unit,EARTH_AXIS,DAY} from '../physics/units.js';
import {rotateAxis,EARTH_ROTATION} from '../physics/vehicles.js';
export default function LaunchSite(){
 const group=useRef(),anchor=useRef(null);
 useFrame(()=>{
  const s=useSimStore.getState().scenario,rocket=s.bodies.find(b=>b.rocket),earth=s.bodies.find(b=>b.id===rocket?.parentId);
  if(!group.current)return;
  if(!rocket||!earth||!['vehicle','true'].includes(s.view.scale)){group.current.visible=false;return;}
  if(rocket.rocket.phase==='prelaunch'||anchor.current?.id!==rocket.id)anchor.current={id:rocket.id,jd:s.jd,up:unit(sub(rocket.position,earth.position))};
  const up=rotateAxis(anchor.current.up,EARTH_AXIS,(s.jd-anchor.current.jd)*DAY*EARTH_ROTATION),space=viewSpace(s);
  const position=add(earth.position,scale(up,earth.radius));
  group.current.visible=norm(sub(rocket.position,position))<20000;
  group.current.position.fromArray(space.transform(position));
  group.current.quaternion.setFromUnitVectors(new Vector3(0,1,0),new Vector3(up[0],up[2],-up[1]));
  group.current.scale.setScalar(1/space.unit);
 });
 return <group ref={group} visible={false}>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,.2,0]}><circleGeometry args={[125,96]}/><meshStandardMaterial color="#363c3c" roughness={.97}/></mesh>
 <mesh position={[0,1.5,0]}><boxGeometry args={[38,3,38]}/><meshStandardMaterial color="#7b7f7b" roughness={.94}/></mesh>
 <mesh position={[0,13.8,0]}><boxGeometry args={[13,1.4,13]}/><meshStandardMaterial color="#555b5b" metalness={.55} roughness={.55}/></mesh>
 {[-1,1].flatMap(x=>[-1,1].map(z=><group key={x+':'+z}><mesh position={[x*5.5,7,z*5.5]}><boxGeometry args={[1.4,13,1.4]}/><meshStandardMaterial color="#747c7b" metalness={.6}/></mesh><mesh position={[x*5.5,8,0]} rotation={[Math.PI/4,0,0]}><boxGeometry args={[.6,.6,15]}/><meshStandardMaterial color="#818885" metalness={.5}/></mesh></group>))}
 <group position={[-18,0,-7]}>
 {[-2.5,2.5].flatMap(x=>[-2.5,2.5].map(z=><mesh key={x+':'+z} position={[x,29,z]}><boxGeometry args={[.6,58,.6]}/><meshStandardMaterial color="#a4aaa7" metalness={.5}/></mesh>))}
 {Array.from({length:9},(_,i)=><group key={i} position={[0,4+i*6,0]}><mesh><boxGeometry args={[6,.3,6]}/><meshStandardMaterial color="#687270" metalness={.5}/></mesh><mesh rotation={[0,0,Math.PI/4]} position={[0,3,-2.5]}><boxGeometry args={[.24,8,.24]}/><meshStandardMaterial color="#939d99"/></mesh></group>)}
 <mesh position={[7,36,0]}><boxGeometry args={[14,.8,1.3]}/><meshStandardMaterial color="#9caaa6" metalness={.5}/></mesh></group>
 {[35,48].map(z=><mesh key={z} position={[0,.4,z]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[90,1]}/><meshBasicMaterial color="#afa78d"/></mesh>)}
 </group>;
}
