import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Color,Vector3} from 'three';
import {vertex,planetFragment} from '../shaders/materials.js';
import {relativeRender} from '../astronomy/coordinates.js';
import {useExplorerStore} from '../store/useExplorerStore.js';
// Unknown surfaces are procedural illustrations; physical catalog radius is retained.
export default function CatalogBody({object,frame}){
 const group=useRef(),uniforms=useMemo(()=>({baseColor:{value:new Color(object.color)},lightDirection:{value:new Vector3(1,0,0)},kind:{value:object.type==='star'?3:object.radius>2e7?2:0},time:{value:0},surfaceMap:{value:null},nightMap:{value:null},cloudMap:{value:null},mapped:{value:0},cloudVisibility:{value:0}}),[object]);
 useFrame(({camera})=>{if(!group.current)return;group.current.position.fromArray(relativeRender(object.position,frame.current.origin,frame.current.unit));group.current.scale.setScalar(object.radius/frame.current.unit);uniforms.lightDirection.value.set(-object.position[0],-object.position[2],object.position[1]).transformDirection(camera.matrixWorldInverse);});
 if(!(object.radius>0))return null;
 return <group ref={group}><mesh onClick={e=>{e.stopPropagation();if(performance.now()>(useExplorerStore.getState().suppressPickUntil??0))useExplorerStore.getState().select(object.id);}} onDoubleClick={e=>{e.stopPropagation();useExplorerStore.getState().focus(object.id);}}><sphereGeometry args={[1,48,32]}/><shaderMaterial vertexShader={vertex} fragmentShader={planetFragment} uniforms={uniforms}/></mesh></group>;
}
