import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useSimStore} from '../store/useSimStore.js';
import {renderScenario} from '../rendering/frame.js';
import {Vector3,Quaternion,DoubleSide} from 'three';
import {unit} from '../physics/units.js';
function SolarWing({side}) {
 return <group position={[side*1.95,0,0]}><mesh><boxGeometry args={[2.7,.045,1.65]}/><meshStandardMaterial color="#111c32" metalness={.6} roughness={.35}/></mesh>
 {Array.from({length:7},(_,i)=>[-1,0,1].map(j=><mesh key={i+':'+j} position={[-1.13+i*.38,.027,j*.52]}><boxGeometry args={[.35,.006,.49]}/><meshStandardMaterial color="#233952" metalness={.72} roughness={.24}/></mesh>))}
 <mesh position={[-side*1.55,0,0]}><cylinderGeometry args={[.04,.04,.55,8]}/><meshStandardMaterial color="#adb1b2" metalness={.8}/></mesh></group>;
}
function Engine({position,size=.22}){
 return <group position={position}><mesh><cylinderGeometry args={[size*.5,size, .45,20,1,true]}/><meshStandardMaterial color="#4e5054" metalness={.85} roughness={.4} side={DoubleSide}/></mesh><mesh position={[0,-.22,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[size,.018,6,24]}/><meshStandardMaterial color="#bbb1a2" metalness={.8}/></mesh></group>;
}
export default function VehicleModel({rocket,radius,body}) {
 const group=useRef(),stage=body.metadata?.separatedStage,attitude=body.rocket?.orientation??body.spacecraft?.orientation??stage?.orientation??unit(body.velocity);
 useFrame((_,delta)=>{const b=renderScenario(useSimStore.getState().scenario).bodies.find(b=>b.id===body.id);if(!b||!group.current)return;const axis=b.rocket?.orientation??b.spacecraft?.orientation??b.metadata?.separatedStage?.orientation??unit(b.velocity);const actual=(b.rocket??b.spacecraft)?.attitude?.quaternion;const target=actual?new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-Math.PI/2).multiply(new Quaternion(...actual)).multiply(new Quaternion().setFromAxisAngle(new Vector3(0,0,1),-Math.PI/2)):new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(axis[0],axis[2],-axis[1]).normalize());if(!actual){const roll=b.rocket?.roll??b.spacecraft?.roll??0;target.multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),roll*Math.PI/180));}group.current.quaternion.slerp(target,1-Math.exp(-30*delta));});
 const q=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(attitude[0],attitude[2],-attitude[1]).normalize());
 const r=body.rocket,upper=!!r&&r.stage>0,engineOn=r?.engineOn&&r.actualThrust>0;
 return <group ref={group} quaternion={q} scale={radius}>{stage?<group><mesh position={[0,-1.1,0]}><cylinderGeometry args={[.51,.51,3.1,32]}/><meshStandardMaterial color="#c6c9c8" metalness={.4} roughness={.5}/></mesh><Engine position={[0,-2.9,0]}/></group>:rocket?<group position={[0,upper?-1:0,0]}>
 {!upper&&<group><mesh position={[0,-1.1,0]}><cylinderGeometry args={[.51,.51,3.1,48]}/><meshStandardMaterial color="#d6d7d4" metalness={.32} roughness={.48}/></mesh>
 {[-2.4,-1.55,-.55,.35].map(y=><mesh key={y} position={[0,y,0]}><cylinderGeometry args={[.513,.513,.032,48]}/><meshStandardMaterial color="#7c8188" metalness={.55} roughness={.45}/></mesh>)}
 <mesh position={[0,-2.53,0]}><cylinderGeometry args={[.515,.52,.28,48]}/><meshStandardMaterial color="#252b33" metalness={.7}/></mesh>
 <Engine position={[0,-2.9,0]}/>{Array.from({length:6},(_,i)=><Engine key={i} position={[Math.sin(i*Math.PI/3)*.32,-2.9,Math.cos(i*Math.PI/3)*.32]} size={.135}/>)}
 {[0,1,2,3].map(i=><mesh key={i} position={[Math.cos(i*Math.PI/2)*.51,-2.12,Math.sin(i*Math.PI/2)*.51]} rotation={[0,-i*Math.PI/2,0]}><boxGeometry args={[.28,.7,.04]}/><meshStandardMaterial color="#555f68" metalness={.5}/></mesh>)}</group>}
 <mesh position={[0,.65,0]}><cylinderGeometry args={[.51,.51,.35,48]}/><meshStandardMaterial color="#252a32" metalness={.4}/></mesh>
 <mesh position={[0,1.4,0]}><cylinderGeometry args={[.49,.49,1.15,48]}/><meshStandardMaterial color="#e3e3df" metalness={.3} roughness={.45}/></mesh>
 <mesh position={[0,2.07,0]}><cylinderGeometry args={[.59,.49,.28,48]}/><meshStandardMaterial color="#d1d3d1" metalness={.3}/></mesh>
 <mesh position={[0,2.65,0]}><cylinderGeometry args={[.59,.59,.9,48]}/><meshStandardMaterial color="#e8e6e1" metalness={.23} roughness={.42}/></mesh>
 <mesh position={[0,3.45,0]}><coneGeometry args={[.59,.7,48]}/><meshStandardMaterial color="#dddeda" metalness={.25}/></mesh>
 <mesh position={[0,1.45,.495]}><boxGeometry args={[.16,.65,.015]}/><meshStandardMaterial color="#28364b" roughness={.6}/></mesh>
 {upper&&<Engine position={[0,.23,0]} size={.4}/>}
 {engineOn&&<group position={[0,upper?-.4:-3.4,0]}><mesh rotation={[Math.PI,0,0]} position={[0,-.7,0]}><coneGeometry args={[upper?.32:.55,2.8,32]}/><meshBasicMaterial color="#afcced" transparent opacity={.32} depthWrite={false}/></mesh><mesh rotation={[Math.PI,0,0]} position={[0,-.25,0]}><coneGeometry args={[upper?.2:.35,1.5,24]}/><meshBasicMaterial color="#fff1d2" transparent opacity={.8} depthWrite={false}/></mesh></group>}
 </group>:<><mesh><boxGeometry args={[1,1,1.4]}/><meshStandardMaterial color="#a58b51" metalness={.72} roughness={.43}/></mesh>
 {[-.52,.52].map(y=><mesh key={y} position={[0,y,0]}><boxGeometry args={[1.1,.035,1.5]}/><meshStandardMaterial color="#babfc0" metalness={.7} roughness={.35}/></mesh>)}
 <SolarWing side={-1}/><SolarWing side={1}/>
 <group position={[0,.72,0]} rotation={[.3,0,.3]}><mesh><cylinderGeometry args={[.035,.035,.4,12]}/><meshStandardMaterial color="#aeb7bd" metalness={.7}/></mesh><mesh position={[0,.22,0]}><sphereGeometry args={[.58,32,16,0,Math.PI*2,Math.PI*.32,Math.PI*.18]}/><meshStandardMaterial color="#d4d9d7" side={DoubleSide} metalness={.6} roughness={.4}/></mesh><mesh position={[0,.46,0]}><cylinderGeometry args={[.025,.025,.3,8]}/><meshStandardMaterial color="#56606a"/></mesh></group>
 <mesh position={[0,0,.78]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.23,.27,.2,24]}/><meshStandardMaterial color="#18242e" metalness={.6}/></mesh>
 </>}</group>;
}
