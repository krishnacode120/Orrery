import {catalogVertex,catalogFragment} from '../shaders/catalog.js';
import CatalogBody from './CatalogBody.jsx';
import {useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Html,Line} from '@react-three/drei';
import {BufferGeometry,Float32BufferAttribute,Color,PerspectiveCamera,Vector3,Quaternion,DoubleSide} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {useExplorerStore} from '../store/useExplorerStore.js';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {STARS,GALAXIES,SYSTEMS,catalogColor} from '../astronomy/catalog.js';
import {LY,PC,relativeRender,galacticToEcliptic} from '../astronomy/coordinates.js';
import {habitableZone} from '../astronomy/systems.js';
import {AU,add,sub,scale,norm,unit} from '../physics/units.js';
import {NavigationController} from '../navigation/controller.js';
import {CAMERA_DEFAULTS,lookQuaternion,toSI} from '../navigation/model.js';
const defaultFrame={origin:[0,0,0],unit:PC};
import {validUniversePose} from '../astronomy/session.js';
function sceneObjects(section,systemId){if(section==='system'){const s=SYSTEMS.find(s=>s.id===systemId);if(!s)return [];return [{id:s.id,name:s.name,type:'star',position:[0,0,0],radius:s.host.radius??0,color:catalogColor({temperature:s.host.temperature})},...s.planets.map((p,k)=>{const a=p.a??(p.period&&s.host.mass?(6.6743e-11*s.host.mass*(p.period/(2*Math.PI))**2)**(1/3):null);return a?{...p,position:[a*Math.cos(k*2.399),a*Math.sin(k*2.399),0],radius:p.radius??0,color:'#96b7c1'}:null;}).filter(Boolean)];}return section==='milky'? [...STARS,...GALAXIES.filter(g=>['milky-way','sgr-a'].includes(g.id))]:section==='group'?GALAXIES:STARS;}
function Navigator({objects,frame}){
 const {camera,gl,size}=useThree(),c=useRef(new NavigationController()),last=useRef(-1),keys=useRef(new Set()),drag=useRef(null),look=useRef([0,0]),guard=useRef(false),controls=useRef(null),sample=useRef(0),frames=useRef(0),contextBodies=useMemo(()=>objects.map(o=>({...o,visible:true,massless:true,velocity:[0,0,0]})),[objects]);
 useEffect(()=>{const canvas=gl.domElement,control=new OrbitControls(new PerspectiveCamera(),canvas);control.enableDamping=false;control.minDistance=1e-8;control.maxDistance=1e10;controls.current=control;
 const manual=()=>{if(c.current.transition)c.current.cancel();};
 const down=e=>{if(e.target.closest?.('input,select,textarea,[contenteditable=true],[role=dialog]'))return;if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE'].includes(e.code)){e.preventDefault();c.current.cancel();}if(e.code==='Escape')c.current.cancel();if(e.altKey&&e.code==='ArrowLeft'){e.preventDefault();useExplorerStore.getState().travel(-1);}if(e.altKey&&e.code==='ArrowRight'){e.preventDefault();useExplorerStore.getState().travel(1);}if(e.code==='KeyF'){const s=useExplorerStore.getState();s.focus(s.selected);}keys.current.add(e.code);};
 const up=e=>keys.current.delete(e.code),start=e=>{manual();if(c.current.mode==='free'){drag.current={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);}},move=e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;useExplorerStore.setState({suppressPickUntil:performance.now()+250});look.current[0]+=e.clientX-d.x;look.current[1]+=e.clientY-d.y;d.x=e.clientX;d.y=e.clientY;},end=()=>drag.current=null,blur=()=>{keys.current.clear();drag.current=null;},wheel=e=>{manual();if(c.current.mode==='free'){e.preventDefault();useExplorerStore.setState({navigationSpeed:Math.max(1,Math.min(1e23,(c.current.speed||PC)*Math.exp(-e.deltaY*.002)))});}},noMenu=e=>e.preventDefault();
 const changed=()=>{if(guard.current||!control.enabled)return;const f=frame.current,inv=v=>[f.origin[0]+v.x*f.unit,f.origin[1]-v.z*f.unit,f.origin[2]+v.y*f.unit];c.current.setOrbitDesired(inv(control.object.position),inv(control.target));};
 control.addEventListener('change',changed);canvas.addEventListener('pointerdown',start);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('contextmenu',noMenu);window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);window.addEventListener('blur',blur);
 return()=>{control.dispose();controls.current=null;canvas.removeEventListener('pointerdown',start);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('contextmenu',noMenu);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('blur',blur);};
 },[gl]);
 useFrame((_,dt)=>{const state=useExplorerStore.getState(),ctrl=c.current,control=controls.current;if(!control)return;const system=state.section==='system',span=system?Math.max(AU*.01,...objects.map(o=>norm(o.position)*2)):state.section==='milky'?120000*LY:state.section==='group'?7e6*LY:state.span;
 const ctx={bodies:contextBodies,radiusFor:b=>system?Math.max(1,b.radius||span*.002):b.type==='galaxy'?b.radius:b.id==='sgr-a'?LY*500:Math.max(b.radius??0,span*.012),aspect:size.width/size.height,scale:'system',jd:useSimStore.getState().scenario.jd,reducedMotion:useSimStore.getState().scenario.view.reducedMotion};
 const cmd=state.command;
 if(!ctrl.initialized||state.serial!==last.current){if(cmd?.type==='restore'&&validUniversePose(cmd.pose)){const p=cmd.pose;ctrl.position=[...p.positionSI];ctrl.target=[...p.targetSI];ctrl.orientation.fromArray(p.orientation).normalize();ctrl.fov=p.fov??42;ctrl.mode=p.mode;ctrl.targetId=p.targetId;useExplorerStore.setState({navigationSpeed:p.navigationSpeed??Math.max(1,norm(sub(p.positionSI,p.targetSI))*.2)});ctrl.resetMotion();ctrl.initialized=true;}
 else if(cmd?.type==='focus'){const b=ctx.bodies.find(b=>b.id===cmd.id);if(b){ctrl.focus(b,ctx,{duration:2.4});useExplorerStore.setState({navigationSpeed:Math.max(1,ctrl.transition.distance*.35)});}}
 else{useExplorerStore.setState({navigationSpeed:null});const center=state.section==='milky'?GALAXIES[0].position:[0,0,0],extent=cmd?.type==='scale'?cmd.span:span;ctrl.focus({id:null,position:center,radius:extent*.3},{...ctx,radiusFor:()=>extent*.3},{direction:[.2,-1,1.1],duration:ctrl.initialized?2.4:0});ctrl.transition.target=center;ctrl.targetId=null;useExplorerStore.setState({navigationSpeed:Math.max(1,extent*.35)});}
 ctrl.initialized=true;last.current=state.serial;}
 const k=keys.current,input={move:[+k.has('KeyD')-+k.has('KeyA'),+k.has('KeyE')-+k.has('KeyQ'),+k.has('KeyW')-+k.has('KeyS')],look:[...look.current],boost:k.has('ShiftLeft')||k.has('ShiftRight'),precision:k.has('ControlLeft')||k.has('ControlRight')};look.current=[0,0];
 ctrl.update(dt,ctx,input,{...CAMERA_DEFAULTS,collision:false,adaptiveSpeed:false,speed:useExplorerStore.getState().navigationSpeed??PC,fov:ctrl.fov});
 const distance=Math.max(1,norm(sub(ctrl.position,ctrl.target))),unitSize=Math.max(1,distance/30);frame.current={origin:[...ctrl.position],unit:unitSize};camera.position.set(0,0,0);camera.quaternion.copy(ctrl.orientation);camera.fov=ctrl.fov;camera.near=.000001;camera.far=1e7;camera.aspect=size.width/size.height;camera.updateProjectionMatrix();
 guard.current=true;control.enabled=ctrl.mode==='orbit'&&!ctrl.transition;control.object.position.set(0,0,0);control.object.quaternion.copy(camera.quaternion);control.target.fromArray(relativeRender(ctrl.target,frame.current.origin,unitSize));control.update();guard.current=false;
 sample.current+=dt;frames.current++;if(sample.current>.4){useSimStore.setState({fps:frames.current/sample.current,frameMs:1000*sample.current/frames.current,renderMs:null});frames.current=0;sample.current=0;const current=useExplorerStore.getState(),pose={...ctrl.snapshot('system',CAMERA_DEFAULTS),navigationSpeed:current.navigationSpeed??ctrl.speed};useExplorerStore.setState({pose,liveSpeed:current.navigationSpeed??ctrl.speed,liveMode:ctrl.mode,liveSpan:distance,...(!ctrl.transition&&current.index>=0?{history:current.history.map((entry,index)=>index===current.index?{...entry,pose}:entry)}:{})});}
 },-10);
 return null;
}
function CatalogPoints({objects,frame}){
 const geometry=useMemo(()=>{const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(new Float32Array(objects.length*3),3));g.setAttribute('color',new Float32BufferAttribute(objects.flatMap(s=>new Color(s.color??catalogColor(s)).toArray()),3));return g;},[objects]);useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(()=>{const a=geometry.attributes.position.array,f=frame.current;objects.forEach((o,i)=>a.set(relativeRender(o.position,f.origin,f.unit),i*3));geometry.attributes.position.needsUpdate=true;},-5);
 return <points geometry={geometry} frustumCulled={false} onClick={e=>{e.stopPropagation();if(performance.now()<(useExplorerStore.getState().suppressPickUntil??0))return;if(objects[e.index])useExplorerStore.getState().select(objects[e.index].id);}} onDoubleClick={e=>{e.stopPropagation();if(objects[e.index])useExplorerStore.getState().focus(objects[e.index].id);}}><shaderMaterial vertexShader={catalogVertex} fragmentShader={catalogFragment} uniforms={{pointSize:{value:5},opacity:{value:.9},tint:{value:new Color('#d6dce4')}}} transparent depthWrite={false}/></points>;
}
function GalaxyCloud({galaxy,frame}){
 const positions=useMemo(()=>{let seed=17;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};return Array.from({length:galaxy.id==='milky-way'?10000:4500},(_,i)=>{const r=galaxy.radius*Math.sqrt(random()),a=(i%4)*Math.PI/2+3.5*Math.log(1+r/(galaxy.radius*.08))+(random()-.5)*.5,p=[r*Math.cos(a),r*Math.sin(a),(random()-.5)*galaxy.radius*.035];return add(galaxy.position,galacticToEcliptic(p));});},[galaxy]);
 const geometry=useMemo(()=>{const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(new Float32Array(positions.length*3),3));return g;},[positions]);useEffect(()=>()=>geometry.dispose(),[geometry]);useFrame(()=>{positions.forEach((p,i)=>geometry.attributes.position.array.set(relativeRender(p,frame.current.origin,frame.current.unit),i*3));geometry.attributes.position.needsUpdate=true;},-5);
 return <points geometry={geometry} frustumCulled={false}><shaderMaterial vertexShader={catalogVertex} fragmentShader={catalogFragment} uniforms={{pointSize:{value:3},opacity:{value:.34},tint:{value:new Color(galaxy.id==='milky-way'?'#b8aea4':'#929cac')}}} transparent depthWrite={false}/></points>;
}
function Marker({object,frame,selected}){
 const ref=useRef();useFrame(()=>ref.current?.position.fromArray(relativeRender(object.position,frame.current.origin,frame.current.unit)),-4);
 return <group ref={ref}><Html center zIndexRange={[10,0]} style={{pointerEvents:'auto'}}><button className={'universe-marker '+(selected?'selected':'')} aria-label={'Select '+object.name} onClick={()=>useExplorerStore.getState().select(object.id)} onDoubleClick={()=>useExplorerStore.getState().focus(object.id)}>{object.name}</button></Html></group>;
}
function SystemGeometry({objects,frame}){
 const group=useRef(),system=SYSTEMS.find(s=>s.id===useExplorerStore.getState().systemId),hz=system?habitableZone(system.host.luminosity):null,show=useExplorerStore(s=>s.hz);
 useFrame(()=>{if(!group.current)return;group.current.position.fromArray(relativeRender([0,0,0],frame.current.origin,frame.current.unit));group.current.scale.setScalar(AU/frame.current.unit);},-5);
 return <group ref={group}>{objects.filter(o=>o.type==='exoplanet').map(o=><Line key={o.id} points={Array.from({length:129},(_,k)=>{const a=norm(o.position)/AU,t=k*Math.PI/64;return [a*Math.cos(t),0,-a*Math.sin(t)];})} color="#46545f" lineWidth={.7}/>)}
 {show&&hz&&<mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[hz.inner/AU,hz.outer/AU,128]}/><meshBasicMaterial color="#7d9d87" transparent opacity={.15} side={DoubleSide} depthWrite={false}/></mesh>}</group>;
}
function UniverseWorld(){
 const hidden=useUIStore(s=>s.hidden||!s.hud),section=useExplorerStore(s=>s.section),systemId=useExplorerStore(s=>s.systemId),selected=useExplorerStore(s=>s.selected),labels=useExplorerStore(s=>s.labels),frame=useRef(defaultFrame),objects=useMemo(()=>sceneObjects(section,systemId),[section,systemId]),important=objects.filter(o=>o.id===selected||section==='system'||section==='group'||section==='milky'&&['hyg-0','milky-way','sgr-a'].includes(o.id)||section==='nearby'&&['hyg-0','hyg-70666','hyg-71456','hyg-87665','hyg-32263'].includes(o.id));
 return <><Navigator objects={objects} frame={frame}/><CatalogPoints objects={objects} frame={frame}/>{labels&&!hidden&&important.slice(0,16).map(o=><Marker key={o.id} object={o} frame={frame} selected={selected===o.id}/>)}
 {section==='system'&&<><SystemGeometry objects={objects} frame={frame}/>{objects.map(o=><CatalogBody key={o.id} object={o} frame={frame}/>)}</>}
 {['milky','group'].includes(section)&&GALAXIES.filter(g=>g.type==='galaxy'&&(section==='group'||g.id==='milky-way')).map(g=><GalaxyCloud key={g.id} galaxy={g} frame={frame}/>)}</>;
}
export default function UniverseScene(){return <Canvas id="orrery-universe" dpr={[1,1.5]} gl={{antialias:true,logarithmicDepthBuffer:true,preserveDrawingBuffer:true}} camera={{fov:42,near:.000001,far:1e7}} raycaster={{params:{Points:{threshold:.15}}}}><color attach="background" args={['#030509']}/><UniverseWorld/></Canvas>;}
