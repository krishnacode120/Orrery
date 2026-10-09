import {OVERVIEW_DIRECTION} from './settings.js';
import {useSimStore} from '../store/useSimStore.js';
import {useCameraStore} from '../store/useCameraStore.js';
export function focusCamera(id,mode='orbit'){
 const sim=useSimStore.getState();if(!sim.scenario.bodies.some(b=>b.id===id))return;
 sim.configureView({selected:id,scale:'vehicle',cameraMode:mode,cameraTarget:id,camera:null});
 useCameraStore.getState().request('focus',{id,mode});
}
export function systemCamera(direction=OVERVIEW_DIRECTION,region='all'){
 useSimStore.getState().configureView({scale:'system',cameraMode:'orbit',camera:null,cameraTarget:null});
 useCameraStore.getState().request('system',{direction,region});
}
export function setCameraMode(mode,targetId){
 const sim=useSimStore.getState();sim.configureView({cameraMode:mode,cameraTarget:targetId??sim.scenario.view.selected,navigation:{...sim.scenario.view.navigation,...(mode==='free'?{reference:'inertial'}:{})}});
 useCameraStore.getState().request(mode==='surface'?'surface':'mode',{mode,id:targetId??sim.scenario.view.selected,targetId:targetId??sim.scenario.view.selected});
}
export function cameraPreset(name){
 const map={
  'Solar System Overview':()=>systemCamera(),'Inner Planets':()=>systemCamera(OVERVIEW_DIRECTION,'inner'),
  'Solar System Top':()=>systemCamera([0,0,1]),'Solar System Side':()=>systemCamera([0,-1,.08]),
  'Sun Overview':()=>focusCamera('sun'),'Earth Orbit':()=>focusCamera('earth'),'Moon Orbit':()=>focusCamera('moon'),
  'Mars Orbit':()=>focusCamera('mars'),'Jupiter System':()=>{useSimStore.getState().configureView({selected:'jupiter',scale:'planetary',cameraMode:'orbit'});useCameraStore.getState().request('family',{id:'jupiter'});},'Saturn Rings':()=>focusCamera('saturn'),
  'Ecliptic Plane':()=>systemCamera([1,0,.02]),'North Ecliptic':()=>systemCamera([0,0,1]),
 };
 map[name]?.();
}
export const CAMERA_PRESETS=['Solar System Overview','Inner Planets','Solar System Top','Solar System Side','Sun Overview','Earth Orbit','Moon Orbit','Mars Orbit','Jupiter System','Saturn Rings','Ecliptic Plane','North Ecliptic'];
