import {useRef,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {Line} from '@react-three/drei';
import {DoubleSide} from 'three';
import {useSimStore} from '../store/useSimStore.js';
import {viewSpace,displayRadius} from './viewSpace.js';
import {renderScenario} from '../rendering/frame.js';
import {unit,cross,add,scale} from '../physics/units.js';
// Illustrative dipole field / radiation shells. These do not source any force.
export default function EnvironmentLayers(){
 const s=useSimStore(x=>x.scenario),b=s.bodies.find(b=>b.id===s.view.selected),group=useRef();const lines=useMemo(()=>{if(!b)return [];const axis=unit(b.spin.axis),east=unit(cross(axis,[1,.01,0])),north=unit(cross(axis,east)),list=[];for(let phi=0;phi<8;phi++){const d=add(scale(east,Math.cos(phi*Math.PI/4)),scale(north,Math.sin(phi*Math.PI/4)));for(const extent of [3,6,10]){list.push(Array.from({length:80},(_,k)=>{const t=.22+(Math.PI-.44)*k/79,r=extent*b.radius*Math.sin(t)**2;return add(scale(d,r*Math.sin(t)),scale(axis,r*Math.cos(t)));}));}}return list;},[b?.id,b?.radius]);
 useFrame(()=>{if(!group.current||!b)return;const current=renderScenario(useSimStore.getState().scenario),body=current.bodies.find(x=>x.id===b.id);if(!body)return;const sp=viewSpace(current);group.current.position.fromArray(sp.transform(body.position));group.current.scale.setScalar(displayRadius(body,current,sp)/body.radius);});
 if(!b||(!s.view.environment&&!s.view.interior))return null;const rocky=['earth','mars','moon','mercury','venus'].includes(b.id),layers=rocky?[[1,'#9c8c79'],[.98,'#9f6651'],[.55,'#c28b5a'],[.19,'#dfb477']]:[[1,'#b5a284'],[.85,'#a69c91'],[.55,'#858b94'],[.18,'#c1a58b']];
 return <group ref={group}>{s.view.environment&&lines.map((points,k)=><Line key={k} points={points.map(p=>[p[0],p[2],-p[1]])} color="#657e96" transparent opacity={.3} lineWidth={.7}/>)}
 {s.view.environment==='radiation'&&[2,4].map(r=><mesh key={r} rotation={[Math.PI/2,0,0]}><torusGeometry args={[r*b.radius,.3*b.radius,16,64]}/><meshBasicMaterial color="#a0886b" wireframe transparent opacity={.15}/></mesh>)}
 {s.view.interior&&layers.map(([r,color],k)=><group key={k}><mesh><sphereGeometry args={[r*b.radius,48,24,Math.PI/2,Math.PI*1.5]}/><meshStandardMaterial color={color} roughness={.9} side={DoubleSide}/></mesh><mesh rotation={[0,Math.PI/2,0]}><circleGeometry args={[r*b.radius,64,0,Math.PI/2]}/><meshBasicMaterial color={color} side={DoubleSide}/></mesh></group>)}</group>;
}
