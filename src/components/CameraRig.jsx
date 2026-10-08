import {useEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {PerspectiveCamera,Vector3,Quaternion} from 'three';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {useCameraStore} from '../store/useCameraStore.js';
import {NavigationController} from '../navigation/controller.js';
import {CAMERA_DEFAULTS,cameraMode,toRender,toSI,validPose,surfacePosition,lookQuaternion,barycenter} from '../navigation/model.js';
import {setRenderFrame,getRenderFrame,clearRenderFrame} from '../navigation/renderFrame.js';
import {viewSpace,displayRadius} from './viewSpace.js';
import {renderScenario} from '../rendering/frame.js';
import {schwarzschild} from '../physics/exotic.js';
import {AU,add,sub,scale,norm,unit} from '../physics/units.js';
const blocked=e=>e.target?.closest?.('input,textarea,select,[contenteditable=true],[role=dialog]');
export default function CameraRig(){
 const {camera,gl,size}=useThree(),controller=useRef(new NavigationController()),orbit=useRef(null),proxy=useRef(new PerspectiveCamera()),keys=useRef(new Set()),look=useRef([0,0]),drag=useRef(null),last=useRef({revision:-1,mode:null,scale:null,command:0,focus:null,sample:0,persist:0}),programmatic=useRef(false);
 const context=()=>{
  const s=renderScenario(useSimStore.getState().scenario),sp=viewSpace(s),bodies=s.bodies.filter(b=>!b.massless||b.rocket||b.spacecraft);
  return {bodies,jd:s.jd,scale:s.view.scale,keyframes:s.view.keyframes,reducedMotion:s.view.reducedMotion,aspect:size.width/size.height,
   radiusFor:b=>displayRadius(b.type==='blackHole'?{...b,radius:schwarzschild(b.mass,s.settings)}:b,s,sp)*sp.unit/sp.distanceScale};
 };
 const release=()=>{drag.current=null;keys.current.clear();look.current=[0,0];if(document.pointerLockElement===gl.domElement)document.exitPointerLock?.();};
 useEffect(()=>{
  const canvas=gl.domElement,c=controller.current;
  const control=new OrbitControls(proxy.current,canvas);orbit.current=control;
  control.enableDamping=false;control.enabled=false;control.minDistance=1e-12;control.maxDistance=1e25;
  control.addEventListener('change',()=>{if(programmatic.current||!control.enabled)return;const sp=viewSpace(useSimStore.getState().scenario);c.setOrbitDesired(sp.inverse(proxy.current.position.toArray()),sp.inverse(control.target.toArray()));});
  control.addEventListener('start',()=>{c.transition=null;c.velocity=[0,0,0];});
  const pointerLock=()=>{if(!canvas.requestPointerLock){useCameraStore.setState({notice:'Pointer lock is unavailable; drag-to-look remains active.'});return;}try{const result=canvas.requestPointerLock();result?.catch?.(()=>useCameraStore.setState({notice:'Pointer lock was refused by the browser; use drag-to-look.'}));}catch{useCameraStore.setState({notice:'Pointer lock is unavailable in this browser view.'});}};
  const cancelAutomatic=()=>{if(c.transition||c.mode==='cinematic'){c.cancel();useSimStore.getState().configureView({cameraMode:'free',navigation:{...useSimStore.getState().scenario.view.navigation,reference:'inertial'}});}};
  const down=e=>{
   if(blocked(e)||e.metaKey||e.ctrlKey&&!['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ControlLeft','ControlRight'].includes(e.code))return;
   if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE'].includes(e.code)){e.preventDefault();cancelAutomatic();}
   keys.current.add(e.code);
   if(e.code==='KeyC'&&!e.repeat&&['free','target-lock','surface'].includes(c.mode)){e.preventDefault();pointerLock();}
   if(e.code==='Escape'){release();c.cancel();useSimStore.getState().configureView({cameraMode:'free',navigation:{...useSimStore.getState().scenario.view.navigation,reference:'inertial'}});}
  };
  const up=e=>keys.current.delete(e.code);
  const pointerDown=e=>{
   if(e.pointerType!=='touch'&&e.button>2)return;
   cancelAutomatic();
   const settings={...CAMERA_DEFAULTS,...useSimStore.getState().scenario.view.navigation};
   if(['free','target-lock','surface'].includes(c.mode)&&useUIStore.getState().tool==='select'){
    drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,pan:e.button===1};
    canvas.setPointerCapture?.(e.pointerId);
    if(settings.pointerLock&&e.button===0&&e.pointerType!=='touch')pointerLock();
   }
  };
  const pointerMove=e=>{
   const locked=document.pointerLockElement===canvas,d=drag.current;
   if(!locked&&(!d||d.id!==e.pointerId))return;
   const dx=locked?e.movementX:e.clientX-d.x,dy=locked?e.movementY:e.clientY-d.y;
   if(d){d.x=e.clientX;d.y=e.clientY;}
   if(d?.pan){const right=new Vector3(1,0,0).applyQuaternion(c.orientation),up=new Vector3(0,1,0).applyQuaternion(c.orientation);c.position=add(c.position,toSI(right.multiplyScalar(-dx*c.speed*.001).addScaledVector(up,dy*c.speed*.001)));c.velocity=[0,0,0];}
   else {look.current[0]+=dx;look.current[1]+=dy;}
  };
  const pointerUp=e=>{if(drag.current?.id===e.pointerId){const d=drag.current;drag.current=null;if(Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>5)useCameraStore.setState({suppressPickUntil:performance.now()+120});try{canvas.releasePointerCapture(e.pointerId);}catch{}}};
  const wheel=e=>{
   last.current.zoomUntil=performance.now()+250;cancelAutomatic();
   if(['free','target-lock','surface'].includes(c.mode)){
    e.preventDefault();const sim=useSimStore.getState(),settings={...CAMERA_DEFAULTS,...sim.scenario.view.navigation};
    if(e.altKey){const f=toSI(new Vector3(0,0,-1).applyQuaternion(c.orientation));c.position=add(c.position,scale(f,-Math.sign(e.deltaY)*c.speed*.1));}
    else {const speed=Math.max(.01,Math.min(AU*10,(settings.adaptiveSpeed?c.speed:settings.speed)*Math.exp(-e.deltaY*.002)));sim.configureView({navigation:{...settings,speed,adaptiveSpeed:false}});}
   }
  };
  const noMenu=e=>e.preventDefault();
  const lockChange=()=>{if(document.pointerLockElement!==canvas)look.current=[0,0];};
  const legacy=e=>{const detail=e.detail;if(detail.type==='snapshot'){const sim=useSimStore.getState(),sp=viewSpace(sim.scenario),pose=c.snapshot(sim.scenario.view.scale,sim.scenario.view.navigation);sim.configureView({camera:{...pose,position:sp.transform(pose.positionSI),target:sp.transform(pose.targetSI)}});}
   if(detail.type==='restore'&&detail.pose)useCameraStore.getState().request('restore',{pose:detail.pose});};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',release);window.addEventListener('orrery-camera',legacy);
  canvas.addEventListener('pointerdown',pointerDown);window.addEventListener('pointermove',pointerMove);window.addEventListener('pointerup',pointerUp);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('contextmenu',noMenu);document.addEventListener('pointerlockchange',lockChange);
  return()=>{release();control.dispose();orbit.current=null;clearRenderFrame();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',release);window.removeEventListener('orrery-camera',legacy);canvas.removeEventListener('pointerdown',pointerDown);window.removeEventListener('pointermove',pointerMove);window.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('contextmenu',noMenu);document.removeEventListener('pointerlockchange',lockChange);};
 },[camera,gl]);
 useFrame((_,delta)=>{
  const c=controller.current,sim=useSimStore.getState(),s=sim.scenario,v=s.view,ui=useUIStore.getState(),store=useCameraStore.getState(),settings={...CAMERA_DEFAULTS,...v.navigation},ctx=context(),control=orbit.current;if(!control)return;
  const dt=Math.min(.1,delta),canonical=cameraMode(v.cameraMode),record=()=>{const current=useCameraStore.getState(),pose=c.snapshot(last.current.scale??v.scale,last.current.settings??settings);if(!current.history.length)current.record(pose);else useCameraStore.setState({history:current.history.map((p,i)=>i===current.index?pose:p)});};
  const modeChanged=last.current.mode!==canonical,pendingCommand=store.command&&store.command.serial!==last.current.command;
  if(c.initialized&&(modeChanged||pendingCommand)&&store.command?.history!==false)record();
  // A new scenario can restore its explicit saved pose. Ordinary edits and UI changes never reset the camera.
  if(!c.initialized){
   if(validPose(v.camera))c.restore(v.camera);else if(v.scale==='system')c.system(ctx);else if(v.scale==='planetary')c.family(s.bodies.find(b=>b.id===v.selected),ctx);else c.focus(s.bodies.find(b=>b.id===v.selected),ctx,{mode:canonical,duration:0});
   c.mode=canonical;c.initialized=true;
  }else if(modeChanged){
   c.setMode(canonical,['free'].includes(canonical)?null:(v.cameraTarget??v.selected));
   if(canonical==='free'&&settings.reference==='inertial')c.previousFrame=null;
   if(canonical==='surface')c.surfaceOffset=null;
   if(!pendingCommand)store.record(c.snapshot(v.scale,settings));
  }
  if(last.current.focus!==v.focusRevision&&last.current.focus!==null&&v.focusRevision!==undefined)c.focus(s.bodies.find(b=>b.id===v.selected),ctx,{mode:canonical});
  const command=store.command;
  if(command&&command.serial!==last.current.command){
   if(command.type==='load'){if(validPose(v.camera))c.restore(v.camera);else if(v.scale==='system')c.system(ctx);else if(v.scale==='planetary')c.family(s.bodies.find(b=>b.id===v.selected),ctx);else c.focus(s.bodies.find(b=>b.id===v.selected),ctx,{mode:canonical,duration:0});c.mode=canonical;}
   if(command.type==='family')c.family(s.bodies.find(x=>x.id===command.id),ctx);
   if(command.type==='focus')c.focus(s.bodies.find(b=>b.id===command.id),ctx,{mode:command.mode??'orbit',direction:command.direction});
   if(command.type==='system')c.system(ctx,command.direction);
   if(command.type==='mode')c.setMode(command.mode,command.targetId??v.selected);
   if(command.type==='restore'){
    if(validPose(command.pose)){c.restore(command.pose);sim.configureView({scale:command.pose.scale,cameraMode:command.pose.mode,cameraTarget:command.pose.targetId,navigation:{...settings,reference:command.pose.reference??'inertial',referenceId:command.pose.referenceId??null,fov:command.pose.fov}});}
    else if(command.pose?.position&&command.pose?.target){const sp=viewSpace(s);c.position=sp.inverse(command.pose.position);c.target=sp.inverse(command.pose.target);c.orientation.copy(lookQuaternion(c.position,c.target));c.resetMotion();}
   }
   if(command.type==='barycenter'){c.setMode('orbit');c.target=barycenter(s.bodies,command.ids);c.orbitTarget=[...c.target];const radius=Math.max(1,...s.bodies.filter(b=>command.ids?.includes(b.id)).map(b=>norm(sub(b.position,c.target))+b.radius));c.focus({id:null,position:c.target,radius},{...ctx,radiusFor:()=>radius},{mode:'orbit'});c.transition.target=[...c.target];c.baryIds=command.ids;}
   if(command.type==='surface'){c.enterSurface(s.bodies.find(b=>b.id===command.id),ctx,settings);sim.configureView({scale:'vehicle',realRadii:true,realDistances:true,scaleMode:'scientific',cameraMode:'surface',cameraTarget:command.id,navigation:{...settings,reference:'planet',referenceId:command.id,vertical:'camera'}});}
   if(command.type==='telescope'){
    const observer=s.bodies.find(b=>b.id===command.observer),target=s.bodies.find(b=>b.id===command.target);if(observer&&target){c.setMode('target-lock',target.id);c.position=surfacePosition(observer,s.jd,settings.surfaceLatitude,settings.surfaceLongitude,Math.max(settings.surfaceAltitude,1000));c.target=[...target.position];c.orientation.copy(lookQuaternion(c.position,c.target));c.fov=command.fov??1;sim.configureView({scale:'system',scaleMode:'scientific',realRadii:true,realDistances:true,cameraMode:'target-lock',cameraTarget:target.id,navigation:{...settings,fov:c.fov,reference:'planet',referenceId:observer.id}});}
   }
   last.current.command=command.serial;if(command.history!==false){const current=useSimStore.getState().scenario.view;store.record(c.snapshot(current.scale,current.navigation));}
  }
  const code=keys.current,move=[Number(code.has('KeyD'))-Number(code.has('KeyA')),Number(code.has('KeyE'))-Number(code.has('KeyQ')),Number(code.has('KeyW'))-Number(code.has('KeyS'))];
  const input={move,look:[...look.current],zooming:performance.now()<(last.current.zoomUntil??0),precision:code.has('ControlLeft')||code.has('ControlRight'),boost:code.has('ShiftLeft')||code.has('ShiftRight')};look.current=[0,0];
  const pose=c.update(dt,ctx,ui.tool==='select'?input:{},settings);
  if(c.mode!==canonical){sim.configureView({cameraMode:c.mode,...(c.mode==='free'?{navigation:{...settings,reference:'inertial'}}:{})});}
  // Camera-relative floating origin. Origin changes are display transforms; SI pose is never rounded.
  let unitSize=viewSpace({...s,view:{...v,renderFrame:null}},false).unit;
  if(['free','target-lock'].includes(c.mode))unitSize=Math.max(.1,Math.min(AU/4,Math.max(1,c.effectiveSpeed??c.speed)*.08));
  if(c.transition)unitSize=Math.max(unitSize,norm(sub(c.position,c.target))/30);
  const old=getRenderFrame(),threshold=unitSize*32;
  const origin=!old||Math.abs(Math.log(old.unit/unitSize))>.03||norm(sub(c.position,old.origin))>threshold?[...c.position]:old.origin;
  setRenderFrame({origin,unit:unitSize});
  const sp=viewSpace(s);camera.position.fromArray(sp.transform(c.position));camera.quaternion.copy(c.orientation);camera.fov=c.fov;camera.clearViewOffset();
  const minimum=Math.max(.001,Math.min(...ctx.bodies.map(b=>Math.max(.001,norm(sub(c.position,b.position))-ctx.radiusFor(b))*.01))),distance=norm(sub(c.position,c.target))/unitSize;
  camera.near=Math.max(1e-12,Math.min(.01,minimum/unitSize,distance*1e-5));camera.far=Math.max(2000,...s.bodies.filter(b=>!b.massless).map(b=>norm(sub(c.position,b.position))/unitSize*2));camera.updateProjectionMatrix();camera.updateMatrixWorld();
  control.enabled=['orbit','follow'].includes(c.mode)&&!c.transition&&ui.tool==='select'&&!ui.draggingBody;
  // OrbitControls writes only to the proxy. This bridge is the sole writer to the visible camera.
  programmatic.current=true;proxy.current.copy(camera);proxy.current.position.fromArray(sp.transform(c.orbitPosition));control.target.fromArray(sp.transform(c.orbitTarget));control.update();programmatic.current=false;
  last.current.mode=c.mode;last.current.scale=useSimStore.getState().scenario.view.scale;last.current.settings=useSimStore.getState().scenario.view.navigation;last.current.focus=v.focusRevision??null;
  last.current.sample+=dt;last.current.persist+=dt;
  if(last.current.sample>.2){last.current.sample=0;const live={pose:c.snapshot(v.scale,settings),speed:c.effectiveSpeed??c.speed,precisionLimit:norm(c.position)*Number.EPSILON*8,modifier:(input.precision?settings.precisionFactor:1)*(input.boost?settings.boostFactor:1),transition:c.transition?{targetId:c.targetId,progress:Math.min(1,c.transition.time/c.transition.duration)}:null,origin:[...origin],unit:unitSize,near:camera.near*unitSize,far:camera.far*unitSize,direction:toSI(camera.getWorldDirection(new Vector3())),collision:c.collisionWarning,pointerLocked:document.pointerLockElement===gl.domElement};store.publish(live);useUIStore.getState().update({cameraSI:[...c.position]});}
  if(last.current.persist>1){last.current.persist=0;const saved=c.snapshot(v.scale,settings);sim.configureView({camera:{...saved,position:sp.transform(saved.positionSI),target:sp.transform(saved.targetSI)}});}
 },-100);
 return null;
}
