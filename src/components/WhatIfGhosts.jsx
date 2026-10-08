import {useRef,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {Line} from '@react-three/drei';
import {useWhatIfStore} from '../store/useWhatIfStore.js';
import {useSimStore} from '../store/useSimStore.js';
import {viewSpace} from './viewSpace.js';
export default function WhatIfGhosts(){
 const store=useWhatIfStore(),view=useSimStore(s=>s.scenario.view),compressedJD=useSimStore(s=>s.scenario.view.realDistances===false?s.scenario.jd:null),group=useRef();
 const built=useMemo(()=>{const space=viewSpace(useSimStore.getState().scenario),paths=[];for(const label of ['baseline','experiment'])for(const [id,list] of Object.entries(store.result?.paths?.[label]??{}))if(list.length>1)paths.push({label,id,points:list.map(p=>space.transform(p.position))});return {space,paths};},[store.result,view.scale,view.realDistances,view.distanceScale,compressedJD]);
 useFrame(()=>{if(!group.current)return;const active=viewSpace(useSimStore.getState().scenario);if(active.compressed||built.space.compressed){group.current.position.set(0,0,0);group.current.scale.setScalar(1);}else{group.current.position.fromArray(active.transform(built.space.origin));group.current.scale.setScalar(built.space.unit/active.unit*active.distanceScale/built.space.distanceScale);}});
 if(!store.active||!store.overlay)return null;
 return <group ref={group}>{built.paths.filter(p=>p.label==='baseline'?store.baselinePaths:store.experimentPaths).map(p=><Line key={p.label+p.id} points={p.points} color={p.label==='baseline'?'#8795a3':'#c6aa73'} lineWidth={p.label==='baseline'?.65:1.1} dashed={p.label==='baseline'} dashSize={.2} gapSize={.1} transparent opacity={p.label==='baseline'?.35:.8} depthWrite={false}/>)}</group>;
}
