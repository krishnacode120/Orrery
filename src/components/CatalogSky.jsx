import {useMemo,useEffect,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {BufferGeometry,Float32BufferAttribute,Color} from 'three';
import {STARS,catalogColor,catalogOrigin} from '../astronomy/catalog.js';
import {unit,sub,add} from '../physics/units.js';
import {useSimStore} from '../store/useSimStore.js';
import {viewSpace} from './viewSpace.js';
// Nearby-catalog directions only. No invented stars or random celestial coordinates.
export default function CatalogSky(){
 const group=useRef(),stars=useMemo(()=>STARS.filter(s=>s.id!=='hyg-0'&&s.apparentMagnitude!=null&&s.apparentMagnitude<7),[]),geometry=useMemo(()=>{const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(new Float32Array(stars.length*3),3));g.setAttribute('color',new Float32BufferAttribute(stars.flatMap(s=>new Color(catalogColor(s)).toArray()),3));return g;},[stars]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(({camera})=>{const s=useSimStore.getState().scenario,sp=viewSpace(s),observer=add(sp.inverse(camera.position.toArray()),catalogOrigin(s));stars.forEach((star,i)=>{const d=unit(sub(star.position,observer));geometry.attributes.position.array.set([d[0]*50000,d[2]*50000,-d[1]*50000],i*3);});geometry.attributes.position.needsUpdate=true;group.current?.position.copy(camera.position);});
 return <points ref={group} geometry={geometry} frustumCulled={false}><pointsMaterial size={1.8} sizeAttenuation={false} vertexColors transparent opacity={.65} depthWrite={false}/></points>;
}
