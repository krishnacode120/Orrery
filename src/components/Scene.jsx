import {useBodyDrag} from './BodyInteraction.js';
import {ScienceOverlays,AdaptiveLabels} from './ScienceOverlays.jsx';
import CameraRig from './CameraRig.jsx';
import {memo,Suspense,useMemo,useRef,useEffect} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Html,Line,OrbitControls,useTexture} from '@react-three/drei';
import {Bloom,EffectComposer} from '@react-three/postprocessing';
import {Vector3,Quaternion,Color,Object3D,DoubleSide,BackSide,AdditiveBlending,ACESFilmicToneMapping,NoToneMapping,UnsignedByteType,PerspectiveCamera,WebGLRenderTarget,BufferAttribute,SRGBColorSpace} from 'three';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {schwarzschild} from '../physics/exotic.js';
import {derivedOrbit,stateFromElements} from '../physics/orbital.js';
import {G,DAY,AU,add,sub,norm,unit as unitVector} from '../physics/units.js';
import {communications,stationPosition} from '../physics/vehicles.js';
import VehicleModel from './VehicleModel.jsx';
import LaunchSite from './LaunchSite.jsx';
import {Atmosphere,PlanetRings,SolarHalo} from './CelestialEffects.jsx';
import {viewSpace,displayRadius} from './viewSpace.js';
import {vertex,planetFragment,atmosphereFragment,diskFragment,lensFragment,portalFragment} from '../shaders/materials.js';

const select=id=>useSimStore.getState().configureView({selected:id});
function Starfield() {
 const points=useMemo(()=>{const p=[],c=[];let seed=92313;const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<3200;i++){const z=rng()*2-1,a=rng()*Math.PI*2,r=Math.sqrt(1-z*z);p.push(r*Math.cos(a)*900,z*900,r*Math.sin(a)*900);
 const temperature=rng(),brightness=.12+Math.pow(rng(),8)*.72;c.push(brightness*(temperature<.3?1:.78),brightness*.85,brightness*(temperature>.7?1:.65));}return {p:new Float32Array(p),c:new Float32Array(c)};},[]);
 const ref=useRef();useFrame(({camera})=>ref.current.position.copy(camera.position));
 return <points ref={ref} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[points.p,3]}/><bufferAttribute attach="attributes-color" args={[points.c,3]}/></bufferGeometry><pointsMaterial size={.85} vertexColors sizeAttenuation={false} depthWrite={false}/></points>;
}
function PlanetMaterial({body}) {
 const mapName={earth:'earth_daymap',venus:'venus_atmosphere',mercury:'mercury',mars:'mars',jupiter:'jupiter',saturn:'saturn',uranus:'uranus',neptune:'neptune',sun:'sun',moon:'moon'}[body.id]??(body.material==='earth'?'earth_daymap':null);
 const [map,night,clouds]=useTexture(['/textures/'+(mapName??'moon')+'.jpg','/textures/earth_nightmap.jpg','/textures/earth_clouds.jpg']);
 useEffect(()=>{map.colorSpace=SRGBColorSpace;night.colorSpace=SRGBColorSpace;map.anisotropy=4;map.needsUpdate=true;night.needsUpdate=true;},[map,night]);
 const material=useRef();const uniforms=useMemo(()=>({surfaceMap:{value:map},nightMap:{value:night},cloudMap:{value:clouds},mapped:{value:mapName?1:0},cloudVisibility:{value:1},baseColor:{value:new Color(body.color)},kind:{value:body.type==='star'||body.type==='pulsar'?3:body.material==='earth'?1:body.material==='gas'?2:0},time:{value:0},lightDirection:{value:new Vector3(1,0,0)}}),[body.color,body.type,body.material,map,night,clouds,mapName]);
 useFrame(({camera})=>{const s=useSimStore.getState().scenario,sun=s.bodies.find(b=>b.type==='star'),p=body.position;
 const light=sun?sub(sun.position,p):[AU,0,0];uniforms.lightDirection.value.set(light[0],light[2],-light[1]).transformDirection(camera.matrixWorldInverse);
 const space=viewSpace(s),center=new Vector3(...space.transform(p));uniforms.cloudVisibility.value=body.id==='earth'&&camera.position.distanceTo(center)*space.unit-body.radius<15000?0:1;
 uniforms.time.value=s.jd*DAY%100000;});
 return <shaderMaterial ref={material} vertexShader={vertex} fragmentShader={planetFragment} uniforms={uniforms}/>;
}
function Portal({body,radius}) {
 const {gl,scene}=useThree(),ref=useRef(),counter=useRef(0);
 const target=useMemo(()=>new WebGLRenderTarget(256,256),[]),camera=useMemo(()=>new PerspectiveCamera(70,1,.001,100000),[]);
 const uniforms=useMemo(()=>({portal:{value:target.texture},time:{value:0}}),[target]);
 useEffect(()=>()=>target.dispose(),[target]);
 useFrame(({clock})=>{
 uniforms.time.value=clock.elapsedTime;if(++counter.current%8)return;
 const s=useSimStore.getState().scenario,other=s.bodies.find(b=>b.id===body.wormhole?.pairId);if(!other)return;
 const space=viewSpace(s),p=space.transform(other.position);camera.position.fromArray(p);camera.position.z+=displayRadius(other,s,space)*1.1;camera.lookAt(...p);
 const hidden=[];scene.traverse(x=>{if(x.name==='portal-surface'){hidden.push([x,x.visible]);x.visible=false;}});
 const previous=gl.getRenderTarget();gl.setRenderTarget(target);gl.render(scene,camera);gl.setRenderTarget(previous);hidden.forEach(([x,v])=>x.visible=v);
 });
 return <mesh ref={ref} name="portal-surface"><sphereGeometry args={[radius,32,24]}/><shaderMaterial uniforms={uniforms} vertexShader={vertex} fragmentShader={portalFragment}/></mesh>;
}
function BodyMesh({body}) {
 const s=useSimStore.getState().scenario,space=viewSpace(s),radius=displayRadius(body.type==='blackHole'?{...body,radius:Math.max(Number.EPSILON,schwarzschild(body.mass,s.settings))}:body,s,space),selected=s.view.selected===body.id;
 const dragHandlers=useBodyDrag(body);
 const surface=useRef(),group=useRef(),disk=useRef(),beam=useRef();
 const diskUniforms=useMemo(()=>({time:{value:0},doppler:{value:body.blackHole?.doppler?1:0},temperature:{value:body.blackHole?.temperature??15000}}),[body.blackHole?.doppler,body.blackHole?.temperature]);
 useFrame(({clock})=>{if(!group.current)return;const state=useSimStore.getState().scenario,b=state.bodies.find(x=>x.id===body.id);if(!b)return;
 group.current.position.fromArray(viewSpace(state).transform(b.position));
 if(surface.current)surface.current.rotation.y=(state.jd*DAY/b.spin.period%1)*Math.PI*2;
 diskUniforms.time.value=clock.elapsedTime;if(beam.current)beam.current.rotation.y=clock.elapsedTime*8;});
 if(!body.visible)return null;
 const dark=body.type==='blackHole',vehicle=!!body.rocket||!!body.spacecraft;
 const nearestStar=s.bodies.filter(b=>b.type==='star').sort((a,b)=>norm(sub(a.position,body.position))-norm(sub(b.position,body.position)))[0];
 const tail=unitVector(nearestStar?sub(body.position,nearestStar.position):[1,0,0]),tailDirection=new Vector3(tail[0],tail[2],-tail[1]);
 return <group name={'body-'+body.id} {...dragHandlers} ref={group} position={space.transform(body.position)} onClick={e=>{e.stopPropagation();select(body.id);}}>
 <group quaternion={new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(Math.sin(body.axialTilt*Math.PI/180)*Math.cos(Math.atan2(body.spin.axis[1],body.spin.axis[0])),Math.cos(body.axialTilt*Math.PI/180),-Math.sin(body.axialTilt*Math.PI/180)*Math.sin(Math.atan2(body.spin.axis[1],body.spin.axis[0]))))}>
 {dark?<><mesh><sphereGeometry args={[radius,40,32]}/><meshBasicMaterial color="#000000"/></mesh>
 <mesh rotation={[Math.PI/2,0,0]}><planeGeometry args={[radius*(body.blackHole?.diskSize??12)*2,radius*(body.blackHole?.diskSize??12)*2]}/><shaderMaterial vertexShader={vertex} fragmentShader={diskFragment} uniforms={diskUniforms} side={DoubleSide} transparent depthWrite={false}/></mesh>
 <mesh><sphereGeometry args={[radius*1.8,40,24]}/><shaderMaterial vertexShader={vertex} fragmentShader={lensFragment} uniforms={{time:{value:0}}}/></mesh>
 {body.blackHole?.photonSphere&&<mesh rotation={[Math.PI/2,0,0]}><ringGeometry args={[radius*1.49,radius*1.51,100]}/><meshBasicMaterial color="#ab9372" side={DoubleSide}/></mesh>}</>
 :body.wormhole?<Portal body={body} radius={radius}/>
 :vehicle?<VehicleModel body={body} rocket={!!body.rocket} radius={radius}/>
 :<mesh ref={surface}><sphereGeometry args={[radius,radius>1000?256:s.view.quality==='low'?20:64,radius>1000?128:s.view.quality==='low'?12:40]}/><PlanetMaterial body={body}/></mesh>}
 {body.atmosphere&&<Atmosphere body={body} radius={radius}/>}
 {body.rings&&<PlanetRings body={body} radius={radius}/>}
 {body.type==='pulsar'&&<group ref={beam} rotation={[.4,0,0]}>{[-1,1].map(sign=><mesh key={sign} position={[0,sign*radius*6,0]} rotation={[sign>0?Math.PI:0,0,0]}><coneGeometry args={[radius*2,radius*10,24]}/><meshBasicMaterial color="#6891b2" transparent opacity={.13} depthWrite={false} blending={AdditiveBlending}/></mesh>)}</group>}
 </group>
 {body.type==='star'&&<><pointLight intensity={3} decay={0}/><SolarHalo radius={radius}/></>}
 {body.type==='comet'&&<mesh quaternion={new Quaternion().setFromUnitVectors(new Vector3(0,-1,0),tailDirection)} position={tailDirection.clone().multiplyScalar(radius*20)}><coneGeometry args={[radius*3,radius*40,16]}/><meshBasicMaterial color="#98bdc6" transparent opacity={.15} depthWrite={false}/></mesh>}

 </group>;
}
function Particles({bodies}) {
 const mesh=useRef(),dummy=useMemo(()=>new Object3D(),[]),color=useMemo(()=>new Color(),[]);
 useFrame(()=>{const s=useSimStore.getState().scenario,space=viewSpace(s),list=s.bodies.filter(isParticle);if(!mesh.current)return;
 mesh.current.count=list.length;list.forEach((b,i)=>{dummy.position.fromArray(space.transform(b.position));dummy.scale.setScalar(b.visible?(s.view.realRadii?b.radius/space.unit*space.distanceScale:Math.max(displayRadius(b,s,space),.016)):0);dummy.updateMatrix();mesh.current.setMatrixAt(i,dummy.matrix);mesh.current.setColorAt(i,color.set(b.color));});
 mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;
 });
 return <instancedMesh ref={mesh} args={[null,null,20000]} frustumCulled={false} onClick={e=>{e.stopPropagation();const list=useSimStore.getState().scenario.bodies.filter(isParticle);if(list[e.instanceId])select(list[e.instanceId].id);}}><icosahedronGeometry args={[1,0]}/><meshBasicMaterial color="#ffffff"/></instancedMesh>;
}
const isParticle=b=>(b.type==='asteroid'||b.disrupted)&&!b.rocket&&!b.spacecraft;
function Paths() {
 const sim=useSimStore(),s=sim.scenario,space=viewSpace(s),b=s.bodies.find(x=>x.id===s.view.selected),paths=[];
 const history=useRef(new Map(Object.entries(structuredClone(s.view.trailHistory??{})))),last=useRef(null),persisted=useRef(0);
 useFrame(({clock})=>{if(clock.elapsedTime-persisted.current<2)return;persisted.current=clock.elapsedTime;
 const trails=Object.fromEntries([...history.current].filter(([id])=>useSimStore.getState().scenario.bodies.some(b=>b.id===id)));
 useSimStore.getState().configureView({trailHistory:structuredClone(trails)});useSimStore.setState({activeTrailPoints:Object.values(trails).reduce((sum,a)=>sum+a.length,0)});
 });
 if(last.current!==s.jd){for(const x of s.bodies.filter(x=>!isParticle(x)).slice(0,40)){const list=history.current.get(x.id)??[];list.push({jd:s.jd,position:[...x.position]});const max=Math.min(x.trail.length,sim.qualityLevel==='low'?128:1024);
 history.current.set(x.id,list.filter(p=>Math.abs(s.jd-p.jd)*DAY<(x.trail.duration??DAY*100)).slice(-max));}last.current=s.jd;}
 useEffect(()=>{history.current=new Map(Object.entries(structuredClone(useSimStore.getState().scenario.view.trailHistory??{})));last.current=null;},[sim.revision]);
 if(s.view.orbits&&(!['vehicle','true'].includes(s.view.scale)||b?.spacecraft||b?.rocket))for(const x of s.bodies.filter(x=>!isParticle(x)&&(s.view.scale==='system'||s.view.scale==='earth'||s.view.scale==='planetary'||x.id===b?.id)).slice(0,50)) {
 const d=derivedOrbit(x,s.bodies,s.settings),o=d.elements;if(!o||o.e>=1||!d.primary)continue;
 const points=Array.from({length:129},(_,i)=>space.transform(add(d.primary.position,stateFromElements({...o,M:i/128*Math.PI*2},G*s.settings.gMultiplier*(d.primary.mass+(x.massless?0:x.mass))).position)));
 paths.push(<Line key={'orbit'+x.id} points={points} color={x.id===b?.id?'#a68d65':'#3d4b59'} transparent opacity={x.id===b?.id?.8:.42} lineWidth={x.id===b?.id?1:.6}/>);
 if(x.id===b?.id&&s.view.markers&&(s.view.scale!=='system'||x.spacecraft||x.rocket)&&s.view.scale!=='vehicle'&&s.view.scale!=='true')for(const [label,M] of [['Pe',0],['Ap',Math.PI],['AN',-o.omega],['DN',Math.PI-o.omega]]) {
 // Node locations use true anomaly, converted to eccentric/mean anomaly.
 let anomaly=M;if(label==='AN'||label==='DN'){const E=2*Math.atan2(Math.sqrt(1-o.e)*Math.sin(M/2),Math.sqrt(1+o.e)*Math.cos(M/2));anomaly=E-o.e*Math.sin(E);}
 const p=space.transform(add(d.primary.position,stateFromElements({...o,M:anomaly},G*s.settings.gMultiplier*d.primary.mass).position));
 paths.push(<Html key={label} position={p} center zIndexRange={[10,0]}><span className="body-label">{label}</span></Html>);
 }
 if(x.id===b?.id&&s.view.plane)paths.push(<mesh key="plane" position={space.transform(d.primary.position)} quaternion={new Quaternion().setFromUnitVectors(new Vector3(0,0,1),new Vector3(o.h[0],o.h[2],-o.h[1]).normalize())}><circleGeometry args={[o.a/space.unit,96]}/><meshBasicMaterial color="#6d8397" transparent opacity={.045} side={DoubleSide} depthWrite={false}/></mesh>);
 }
 if(s.view.trails)for(const [id,list] of history.current)if(list.length>1){const body=s.bodies.find(b=>b.id===id);if(!body||body.trail.mode==='orbit')continue;
 const points=list.map(x=>space.transform(x.position));paths.push(<Line key={'trail'+id} points={points} color={body.trail.color} vertexColors={points.map((_,i)=>new Color(body.trail.color).multiplyScalar(.08+.6*i/points.length))} lineWidth={(body.trail.width??1)*(s.view.trailScale??1)} transparent opacity={.65}/>);}
 if(sim.prediction&&s.view.predictionPaths!==false)for(const [id,list] of Object.entries(sim.prediction.paths))if(list.length>1)paths.push(<Line key={'prediction'+id} points={list.map(x=>space.transform(x.position))} color="#bca4d2" dashed dashSize={.3} gapSize={.2} lineWidth={1}/>);
 if(b){
 const d=derivedOrbit(b,s.bodies,s.settings);
 if(s.view.showHill&&d.hill)paths.push(<Guide key="hill" position={space.transform(b.position)} radius={d.hill/space.unit*space.distanceScale} color="#749d88"/>);
 if(s.view.showRoche&&d.roche&&d.primary)paths.push(<Guide key="roche" position={space.transform(d.primary.position)} radius={d.roche/space.unit*space.distanceScale} color="#b68077"/>);
 if(s.view.vectors){const origin=space.transform(b.position),v=unitVector(b.velocity),endpoint=add(origin,[v[0]*3,v[2]*3,-v[1]*3]);paths.push(<Line key="velocity" points={[origin,endpoint]} color="#90b8c3"/>);}
 if(s.view.links&&(b.spacecraft||b.rocket))for(const link of communications(b,s.bodies,s.stations,s.jd))paths.push(<Line key={'link'+link.id} points={[space.transform(b.position),space.transform(link.position)]} color={link.status==='connected'?'#80a696':'#885e5b'} transparent opacity={.55} dashed={link.status!=='connected'}/>);
 for(const node of s.maneuvers.filter(n=>n.bodyId===b.id&&!n.executed)){const pred=sim.prediction?.paths[b.id],point=pred?.reduce((a,c)=>Math.abs(c.jd-node.jd)<Math.abs(a.jd-node.jd)?c:a,pred[0]);if(point)paths.push(<Html key={node.id} position={space.transform(point.position)}><span className="badge">Δv</span></Html>);}
 }
 return <>{paths}</>;
}
function Guide({position,radius,color}){const p=useMemo(()=>Array.from({length:129},(_,i)=>[Math.cos(i/128*Math.PI*2)*radius,0,Math.sin(i/128*Math.PI*2)*radius]),[radius]);return <group position={position}><Line points={p} color={color} transparent opacity={.6}/></group>;}
function Placement() {
 const start=useRef(null),[preview,setPreview]=[useUIStore(s=>s.placementPreview),v=>useUIStore.getState().update({placementPreview:v})],tool=useUIStore(s=>s.tool),kind=useUIStore(s=>s.spawnKind);
 const {camera}=useThree(),dragging=useUIStore(s=>s.draggingBody);
 if(dragging)return preview?<Line points={preview.map(p=>viewSpace(useSimStore.getState().scenario).transform(p))} color="#d6b27d" lineWidth={2}/>:null;
 if(!['spawn','throw','move'].includes(tool))return null;
 const point=e=>viewSpace(useSimStore.getState().scenario).inverse(e.point.toArray());
 return <><mesh rotation={[-Math.PI/2,0,0]} onPointerDown={e=>{e.stopPropagation();start.current=point(e);e.target.setPointerCapture(e.pointerId);}}
 onPointerMove={e=>{if(start.current)setPreview([start.current,point(e)]);}}
 onPointerUp={e=>{if(!start.current)return;e.stopPropagation();const sim=useSimStore.getState(),p=point(e),space=viewSpace(sim.scenario),velocity=sub(p,start.current).map(x=>x/(space.unit/10000));
 try{if(tool==='spawn')sim.spawn(kind,start.current,velocity);else sim.edit(s=>{const b=s.bodies.find(b=>b.id===s.view.selected);if(b){if(tool==='move')b.position=p;else b.velocity=add(b.velocity,velocity);}});}catch(error){sim.fail(error.message);}
 start.current=null;setPreview(null);e.target.releasePointerCapture(e.pointerId);useUIStore.getState().update({tool:'select'});}}>
 <planeGeometry args={[1e6,1e6]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} side={DoubleSide}/></mesh>
 {preview&&<Line points={preview.map(p=>viewSpace(useSimStore.getState().scenario).transform(p))} color="#d6b27d" lineWidth={2}/>}</>;
}
function Performance() {
 const {gl,setDpr}=useThree(),sample=useRef({time:0,frames:0}),last=useRef(0);
 useFrame((state,dt)=>{
 sample.current.time+=dt;sample.current.frames++;if(sample.current.time<1)return;
 const sim=useSimStore.getState(),s=sim.scenario,fps=sample.current.frames/sample.current.time,frames=sample.current;sample.current={time:0,frames:0};
 let quality=s.view.quality==='auto'?sim.qualityLevel:s.view.quality;
 if(s.view.quality==='auto'&&state.clock.elapsedTime-last.current>5){const levels=['low','medium','high','ultra'];let index=levels.indexOf(quality);if(fps<35)index=Math.max(0,index-1);else if(fps>57&&s.bodies.length<1000)index=Math.min(2,index+1);quality=levels[index];last.current=state.clock.elapsedTime;}
 const desiredDpr={low:1,medium:1.25,high:1.5,ultra:Math.min(window.devicePixelRatio,2)}[quality]??1;
 if(state.viewport.dpr!==desiredDpr)setDpr(desiredDpr);
 gl.toneMappingExposure=s.view.exposure;
 useSimStore.setState({fps,frameMs:1000/fps,qualityLevel:quality,drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles});
 });return null;
}
function World() {
 const composer=useRef();
 const s=useSimStore(x=>x.scenario),quality=useSimStore(x=>x.qualityLevel),major=s.bodies.filter(b=>!isParticle(b)&&(s.view.showMoons!==false||b.type!=='moon'));
 return <><ambientLight intensity={.16}/>{!s.bodies.some(b=>b.type==='star')&&<directionalLight position={[100,30,10]} intensity={2.5}/>}<Starfield/>{major.map(b=><BodyMesh key={b.id} body={b}/>)}<LaunchSite/><Particles bodies={s.bodies}/><Paths/><ScienceOverlays/><AdaptiveLabels/><CameraRig/><Placement/><Performance/><SceneCompositor composer={composer}/>
 <EffectComposer ref={composer} enabled={false} frameBufferType={UnsignedByteType} multisampling={0}><Bloom luminanceThreshold={.9} intensity={.3} mipmapBlur/></EffectComposer></>;
}
const Scene=memo(function Scene(){return <Canvas id="orrery-viewport" dpr={[1,1.5]} camera={{position:[0,35,60],fov:42,near:.00001,far:1e10}}
 gl={{antialias:true,logarithmicDepthBuffer:true,toneMapping:ACESFilmicToneMapping,preserveDrawingBuffer:true}}
 fallback={<div className="canvas-fallback">WebGL is unavailable. Physics, analysis, and export remain available.</div>}><color attach="background" args={['#030509']}/><Suspense fallback={null}><World/></Suspense></Canvas>;});
export default Scene;

// A single WebGL context owns both views. A second Canvas can suspend the main
// renderer on browsers with tight context/resource limits.
function SceneCompositor({composer}){
 const secondary=useMemo(()=>new PerspectiveCamera(40,1,.01,1e10),[]);
 useFrame(({gl,scene,camera,size},dt)=>{
  const sim=useSimStore.getState(),s=sim.scenario;
  gl.setRenderTarget(null);gl.setScissorTest(false);gl.setViewport(0,0,size.width,size.height);
  const useBloom=s.view.bloom&&sim.qualityLevel!=='low'&&composer.current;
  gl.toneMapping=useBloom?NoToneMapping:ACESFilmicToneMapping;
  if(useBloom)composer.current.render(dt);else gl.render(scene,camera);
  const pane=document.querySelector('.pip-view'),b=s.bodies.find(x=>x.id===s.view.selected);
  if(!s.view.pip||!pane||!b||useUIStore.getState().hidden)return;
  const rect=pane.getBoundingClientRect(),canvas=gl.domElement.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const space=viewSpace(s),p=new Vector3(...space.transform(b.position)),r=Math.max(displayRadius(b,s,space),1e-8)*(b.rings?b.rings.outer/b.radius:1);
  const distance=r*(b.rocket?13:b.spacecraft?11:4);
  secondary.aspect=rect.width/rect.height;secondary.position.copy(p).add(new Vector3(.3,.4,1).normalize().multiplyScalar(distance));
  secondary.near=Math.max(1e-12,r*.001);secondary.far=Math.max(1000,r*100);secondary.lookAt(p);secondary.updateProjectionMatrix();secondary.updateMatrixWorld();
  const hidden=[],uniforms=[];
  scene.traverse(object=>{
   if(object.name?.startsWith('body-')){
    if(object.name!=='body-'+b.id&&!s.bodies.some(star=>star.type==='star'&&object.name==='body-'+star.id)){hidden.push([object,object.visible]);object.visible=false;}
    else object.traverse(mesh=>{const u=mesh.material?.uniforms?.lightDirection;if(u){uniforms.push([u,u.value.clone()]);u.value.transformDirection(camera.matrixWorld).transformDirection(secondary.matrixWorldInverse);}});
   }
  });
  const autoClear=gl.autoClear;
  try{
   gl.setScissorTest(true);gl.setScissor(rect.left-canvas.left,canvas.bottom-rect.bottom,rect.width,rect.height);
   gl.setViewport(rect.left-canvas.left,canvas.bottom-rect.bottom,rect.width,rect.height);gl.autoClear=true;gl.render(scene,secondary);
  }finally{
   hidden.forEach(([object,visible])=>object.visible=visible);uniforms.forEach(([u,value])=>u.value.copy(value));
   gl.autoClear=autoClear;gl.setScissorTest(false);gl.setViewport(0,0,size.width,size.height);
  }
 },2);
 return null;
}
export function PictureInPicture(){const s=useSimStore(x=>x.scenario),b=s.bodies.find(x=>x.id===s.view.selected);if(!s.view.pip||!b)return null;return <div className="pip-view"><span>{b.name} · tracking camera</span></div>;}
