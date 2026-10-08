import {it,expect} from 'vitest';
import {Vector3,Quaternion} from 'three';
import {NavigationController} from '../navigation/controller.js';
import {CAMERA_DEFAULTS,lookQuaternion,safeFocusDistance,protectCamera,validPose,validateNavigation,toRender,surfacePosition} from '../navigation/model.js';
import {setRenderFrame,clearRenderFrame} from '../navigation/renderFrame.js';
import {viewSpace} from '../components/viewSpace.js';
import {makePreset} from '../physics/catalog.js';
import {body} from '../physics/body.js';
import {AU,norm,sub,add,G,DAY} from '../physics/units.js';
const settings={...CAMERA_DEFAULTS,adaptiveSpeed:false,speed:100,collision:false,translationDamping:0,rotationDamping:0,zoomDamping:0};
const ctx=(bodies=[])=>({bodies,jd:2451545,scale:'system',radiusFor:b=>b.radius,aspect:1,keyframes:[]});
function free(){const c=new NavigationController();c.initialized=true;c.position=[0,0,0];c.orientation.copy(lookQuaternion([0,0,0],[1,0,0]));c.target=[1,0,0];c.setMode('free');return c;}
it('free translation uses camera forward, right and selectable up',()=>{
 const c=free();c.update(.1,ctx(),{move:[0,0,1]},settings);expect(c.position[0]).toBeCloseTo(10,8);expect(Math.abs(c.position[1])).toBeLessThan(1e-9);
 const d=free();d.update(.1,ctx(),{move:[1,0,0]},settings);expect(norm(d.position)).toBeCloseTo(10,8);expect(Math.abs(d.position[0])).toBeLessThan(1e-9);
 d.update(.1,ctx(),{move:[0,1,0]},settings);expect(d.position[2]).toBeCloseTo(10,8);
});
it('selection changes cannot affect free coordinates or orientation',()=>{
 const c=free(),before=c.snapshot(),b=body({id:'earth',position:[AU,0,0]});for(let i=0;i<60;i++)c.update(1/60,{...ctx([b]),selected:i%2?'earth':'mars'},{},settings);
 expect(c.position).toEqual(before.positionSI);expect(c.orientation.toArray()).toEqual(before.orientation);expect(c.transition).toBe(null);
});
it('manual WASD cancels focus immediately and hands ownership to free',()=>{
 const c=free(),b=body({id:'earth',position:[AU,0,0],radius:6371000});c.focus(b,ctx([b]));c.update(.1,ctx([b]),{},settings);const before=[...c.position];
 c.update(.1,ctx([b]),{move:[0,0,1]},settings);expect(c.transition).toBe(null);expect(c.mode).toBe('free');expect(norm(sub(c.position,before))).toBeCloseTo(10,4);
});
it('follow translates the camera with its body while preserving orbit offset',()=>{
 const b=body({id:'earth',position:[0,0,0]});const c=free();c.position=[100,200,300];c.target=[0,0,0];c.setMode('follow','earth');c.update(.1,ctx([b]),{},settings);
 const initial=sub(c.position,b.position);b.position=[50,60,70];c.update(.1,ctx([b]),{},settings);expect(norm(sub(sub(c.position,b.position),initial))).toBeLessThan(1e-9);
 c.setOrbitDesired(add(b.position,[400,500,600]),b.position);c.update(.1,ctx([b]),{},settings);expect(norm(sub(sub(c.position,b.position),[400,500,600]))).toBeLessThan(1e-9);
});
it('exiting follow or chase to free preserves the exact pose and stops body tracking',()=>{
 for(const mode of ['follow','chase','rocket','satellite']){const b=body({id:'probe',radius:2,velocity:[1,0,0]});const c=free();c.setMode(mode,'probe');c.update(.1,ctx([b]),{},settings);const p=[...c.position],q=c.orientation.toArray();c.setMode('free');b.position=[1000,2000,0];c.update(.1,ctx([b]),{},settings);expect(c.position).toEqual(p);expect(c.orientation.toArray()).toEqual(q);}
});
it('precision and boost are temporary and do not change the base speed',()=>{
 const c=free();c.update(.1,ctx(),{move:[0,0,1],boost:true},settings);expect(c.position[0]).toBeCloseTo(100,8);c.update(.1,ctx(),{move:[0,0,1],precision:true},settings);expect(c.position[0]).toBeCloseTo(100.01,8);expect(settings.speed).toBe(100);
});
it('mouse look clamps pitch and supports inverted Y without orbit controls',()=>{
 const c=free();c.update(.1,ctx(),{look:[0,-1e6]},settings);const f=new Vector3(0,0,-1).applyQuaternion(c.orientation);expect(f.y).toBeGreaterThan(.99);expect(f.y).toBeLessThan(1);
 const d=free();d.update(.1,ctx(),{look:[0,-100]}, {...settings,invertY:true});expect(new Vector3(0,0,-1).applyQuaternion(d.orientation).y).toBeLessThan(0);
});
it('target lock allows free position movement while pointing toward target',()=>{
 const b=body({id:'mars',position:[1000,0,0]});const c=free();c.setMode('target-lock','mars');c.update(.1,ctx([b]),{move:[1,0,0]},settings);
 const actual=new Vector3(0,0,-1).applyQuaternion(c.orientation),desired=toRender(sub(b.position,c.position)).normalize();expect(actual.dot(desired)).toBeCloseTo(1,10);expect(norm(c.position)).toBeGreaterThan(0);
});
it('translation damping is frame-rate independent over the same elapsed interval',()=>{
 const a=free(),b=free(),n={...settings,translationDamping:8};for(let i=0;i<30;i++)a.update(1/30,ctx(),{move:[0,0,1]},n);for(let i=0;i<120;i++)b.update(1/120,ctx(),{move:[0,0,1]},n);
 expect(norm(sub(a.velocity,b.velocity))).toBeLessThan(1e-10);expect(norm(sub(a.position,b.position))).toBeLessThan(1e-8);
});
it('focus fits object extent to FOV and finishes safely without a hardcoded distance',()=>{
 const a=safeFocusDistance(2,42),b=safeFocusDistance(6371000,42);expect(b/a).toBeCloseTo(6371000/2,5);
 const c=free(),earth=body({id:'earth',radius:6371000,position:[AU,0,0]});c.focus(earth,ctx([earth]),{duration:1});for(let i=0;i<11;i++)c.update(.1,ctx([earth]),{},settings);expect(c.transition).toBe(null);expect(norm(sub(c.position,earth.position))).toBeCloseTo(b,2);
});
it('camera protection prevents segment tunneling and permits explicit interior views',()=>{
 const b=body({id:'planet',radius:10});const n={...settings,collision:true,clearance:1};const p=protectCamera([-30,0,0],[30,0,0],[b],n);expect(p.blocked).toBe(true);expect(p.position[0]).toBeLessThanOrEqual(-11);
 expect(protectCamera([-30,0,0],[30,0,0],[b],{...n,allowInterior:true}).position).toEqual([30,0,0]);
 expect(norm(protectCamera([0,0,0],[0,0,0],[b],n).position)).toBeCloseTo(11,10);
});
it('camera snapshots retain pose, mode, FOV and target on restoration',()=>{
 const c=free();c.position=[AU*30,1,2];c.fov=.5;c.mode='target-lock';c.targetId='earth';const pose=c.snapshot('vehicle',settings),d=new NavigationController();expect(validPose(pose)).toBe(true);d.restore(pose);expect(d.snapshot('vehicle',settings)).toEqual(pose);
 expect(()=>d.restore({...pose,orientation:[0,0,0,0]})).toThrow();
});
it('floating-origin rendering preserves metre offsets at Neptune without editing physics',()=>{
 const s=makePreset('solar-now'),p=[30*AU,2*AU,3*AU],before=structuredClone(s.bodies);setRenderFrame({origin:p,unit:1});
 try{const sp=viewSpace(s),q=add(p,[1,2,3]);expect(sp.transform(q)).toEqual([1,3,-2]);expect(sp.inverse(sp.transform(q))).toEqual(q);expect(s.bodies).toEqual(before);}finally{clearRenderFrame();}
});
it('spherical surface camera uses the primary spin and exact requested altitude',()=>{
 const b=body({id:'mars',radius:3389500,spin:{axis:[0,0,1],period:DAY},position:[AU,0,0]});
 expect(norm(sub(surfacePosition(b,2451545,20,30,100),b.position))).toBeCloseTo(b.radius+100,4);
 expect(norm(sub(surfacePosition(b,2451545.5,0,0,100),surfacePosition(b,2451545,0,0,100)))).toBeCloseTo(2*(b.radius+100),4);
});
it('invalid navigation configuration is rejected at the persistence boundary',()=>{
 for(const x of [{speed:NaN},{speed:-1},{fov:0},{sensitivity:0},{vertical:'banana'},{translationDamping:-1}])expect(()=>validateNavigation(x)).toThrow();
});

it('surface travel is cancellable and finishes at a rotating spherical site',()=>{
 const b=body({id:'mars',radius:3389500,position:[AU,0,0],spin:{axis:[0,0,1],period:DAY}}),c=free(),n={...settings,surfaceAltitude:100,surfaceLatitude:20,surfaceLongitude:30};c.enterSurface(b,ctx([b]),n);
 c.update(.1,ctx([b]),{},n);expect(c.transition).not.toBe(null);const before=[...c.position];c.update(.1,ctx([b]),{move:[0,0,1]},n);expect(c.mode).toBe('free');expect(norm(sub(c.position,before))).toBeCloseTo(10,3);
 c.enterSurface(b,{...ctx([b]),reducedMotion:true},n);c.update(.1,ctx([b]),{},n);expect(c.mode).toBe('surface');expect(norm(sub(c.position,b.position))).toBeCloseTo(b.radius+100,3);
});
it('an explicit planet-relative free frame translates without modifying the system',()=>{
 const b=body({id:'earth',position:[0,0,0]}),c=free(),n={...settings,reference:'planet',referenceId:'earth'};c.update(.1,ctx([b]),{},n);const original=[...c.position];b.position=[30,40,50];c.update(.1,ctx([b]),{},n);expect(sub(c.position,original)).toEqual([30,40,50]);expect(b.position).toEqual([30,40,50]);
});
it('barycenter bookmarks retain the chosen physical pair',()=>{
 const c=free();c.mode='orbit';c.baryIds=['earth','moon'];const pose=c.snapshot(),d=new NavigationController();d.restore(pose);expect(d.baryIds).toEqual(['earth','moon']);
});

it('SOI arrival automation cannot take control from free, orbit, surface or target lock',async()=>{
 const {useSimStore}=await import('../store/useSimStore.js'),{useCameraStore}=await import('../store/useCameraStore.js'),before=useSimStore.getState(),cameraBefore=useCameraStore.getState();
 try{for(const mode of ['free','orbit','surface','target-lock','follow','chase']){
  const s=makePreset('leo'),vehicle=s.bodies.find(b=>b.spacecraft);s.view={...s.view,selected:vehicle.id,cameraMode:mode,cameraTarget:vehicle.id,autoArrival:true,targetId:vehicle.parentId};s.eventSerial=0;
  useSimStore.setState({scenario:s});useCameraStore.setState({command:null});
  const state=new Float64Array(s.bodies.flatMap(b=>[...b.position,...b.velocity]));
  useSimStore.getState().frame({jd:s.jd,count:s.bodies.length,state,events:[{id:1,kind:'soi',bodyIds:[vehicle.id]}],eventSerial:1});
  if(['follow','chase'].includes(mode)){expect(useCameraStore.getState().command).toMatchObject({type:'focus',id:vehicle.parentId,mode:'follow'});}
  else {expect(useSimStore.getState().scenario.view.cameraMode).toBe(mode);expect(useCameraStore.getState().command).toBe(null);}
 }}finally{useSimStore.setState(before,true);useCameraStore.setState(cameraBefore,true);}
});
