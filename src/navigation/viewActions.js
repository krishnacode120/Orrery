import {useSimStore} from '../store/useSimStore.js';
import {useCameraStore} from '../store/useCameraStore.js';
import {systemCamera} from './actions.js';
export function setViewingScale(scale){
 const sim=useSimStore.getState(),v=sim.scenario.view;
 if(scale==='system'){systemCamera();return;}
 sim.configureView({scale,cameraMode:'orbit',...(scale==='true'?{realRadii:true}:{}),camera:null});
 if(scale==='planetary')useCameraStore.getState().request('family',{id:v.selected});
 else useCameraStore.getState().request('focus',{id:scale==='earth'&&sim.scenario.bodies.some(b=>b.id==='earth')?'earth':v.selected,mode:'orbit'});
}
