import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useSimStore} from '../store/useSimStore.js';
import {viewSpace} from './viewSpace.js';
// Static lines and HTML labels retain the frame in which their buffers were built.
// Rebase them as one group, so a floating-origin update never tears a camera frame.
export default function FrameGroup({children}){
 const group=useRef(),space=viewSpace(useSimStore.getState().scenario),base={origin:[...space.origin],unit:space.unit,distanceScale:space.distanceScale,compressed:space.compressed};
 useFrame(()=>{if(!group.current)return;const active=viewSpace(useSimStore.getState().scenario);if(base.compressed||active.compressed){group.current.position.set(0,0,0);group.current.scale.setScalar(1);return;}group.current.position.fromArray(active.transform(base.origin));group.current.scale.setScalar(base.unit/active.unit*active.distanceScale/base.distanceScale);});
 return <group ref={group}>{children}</group>;
}
