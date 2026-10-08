import {useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import {useSimStore} from '../store/useSimStore.js';
import {RenderInterpolator} from '../rendering/interpolation.js';
import {setVisualFrame,clearVisualFrame} from '../rendering/frame.js';
export default function MotionFrame(){
 const interpolation=useRef(new RenderInterpolator());useEffect(()=>()=>clearVisualFrame(),[]);
 useFrame((_,dt)=>{const sim=useSimStore.getState(),now=performance.now()/1000;interpolation.current.publish(sim.scenario,sim.revision,now);const visual=interpolation.current.sample(sim.scenario,{now,revision:sim.revision,paused:sim.paused,reducedMotion:!sim.scenario.view.smoothMotion});setVisualFrame(sim.scenario,visual,dt,sim.paused);},-200);
 return null;
}
