import {it,expect} from 'vitest';
import {PerspectiveCamera,Vector3} from 'three';
import {NavigationController} from '../navigation/controller.js';
import {CAMERA_DEFAULTS,toRender,toSI,lookQuaternion,validPose} from '../navigation/model.js';
import {viewportWindow,windowFov,overviewPoints,OVERVIEW_DIRECTION} from '../navigation/framing.js';
import {viewSpace} from '../components/viewSpace.js';
import {makePreset} from '../physics/catalog.js';
import {body} from '../physics/body.js';
import {AU,norm,sub,dot,unit} from '../physics/units.js';

const settings={...CAMERA_DEFAULTS,adaptiveSpeed:false,collision:false,speed:100};
const context=s=>({bodies:s.bodies,settings:s.settings,orbits:true,scale:'system',jd:s.jd,radiusFor:b=>b.radius,aspect:16/9,reducedMotion:true});

it('fits every sampled Solar System orbit inside the unobscured viewport',()=>{
 const s=makePreset('solar-now'),before=JSON.stringify(s),insets={left:230,right:340,top:60,bottom:100};
 const frame=viewportWindow(1280,720,insets),ctx={...context(s),...frame,focusFov:windowFov(42,frame.heightFraction)};
 for(const direction of [OVERVIEW_DIRECTION,[0,0,1],[0,-1,.08]]){
  const c=new NavigationController();c.system(ctx,direction);c.update(.1,ctx,{},settings);
  const camera=new PerspectiveCamera(42,1280/720,1,1e18);
  camera.position.copy(toRender(c.position));camera.quaternion.copy(c.orientation);
  camera.setViewOffset(1280,720,-c.screenCenter[0]*640,-c.screenCenter[1]*360,1280,720);
  camera.updateProjectionMatrix();camera.updateMatrixWorld();
  for(const p of overviewPoints(ctx).points){
   const projected=toRender(p.position).project(camera),x=(projected.x+1)*640,y=(1-projected.y)*360;
   expect(x).toBeGreaterThanOrEqual(insets.left);expect(x).toBeLessThanOrEqual(1280-insets.right);
   expect(y).toBeGreaterThanOrEqual(insets.top);expect(y).toBeLessThanOrEqual(720-insets.bottom);
  }
 }
 expect(JSON.stringify(s)).toBe(before);
});
it('system framing fits logarithmically compressed display coordinates without changing SI physics',()=>{
 const s=makePreset('solar-now');s.view={...s.view,realDistances:false,scale:'system',scaleMode:'educational'};
 const before=JSON.stringify(s),sp=viewSpace(s,false);
 const ctx={...context(s),fitSpace:{toDisplay:p=>toSI(new Vector3().fromArray(sp.transform(p))),
  toPhysical:p=>sp.inverse(toRender(p).toArray()),radiusScale:1/sp.unit}};
 const c=new NavigationController();c.system(ctx);c.update(.1,ctx,{},settings);
 const camera=new PerspectiveCamera(42,16/9,.001,1e9);
 camera.position.fromArray(sp.transform(c.position));camera.quaternion.copy(c.orientation);camera.updateMatrixWorld();
 for(const p of overviewPoints(ctx).points){
  const projected=new Vector3().fromArray(sp.transform(p.position)).project(camera);
  expect(Math.abs(projected.x)).toBeLessThan(1);expect(Math.abs(projected.y)).toBeLessThan(1);
 }
 expect(JSON.stringify(s)).toBe(before);
});
it('inner-planets framing is genuinely closer without changing or deleting outer planets',()=>{
 const s=makePreset('solar-now'),ctx=context(s),all=new NavigationController(),inner=new NavigationController();
 all.system(ctx);inner.system(ctx,OVERVIEW_DIRECTION,{region:'inner'});
 all.update(.1,ctx,{},settings);inner.update(.1,ctx,{},settings);
 expect(norm(sub(inner.position,inner.target))).toBeLessThan(norm(sub(all.position,all.target))*.2);
 expect(s.bodies.some(b=>b.id==='neptune')).toBe(true);
});
it('overview travel escapes an expanded planet without getting trapped by the swept collision barrier',()=>{
 const s=makePreset('solar-now'),earth=s.bodies.find(b=>b.id==='earth'),ctx={...context(s),reducedMotion:false,
  radiusFor:b=>b.radius*(b.type==='star'?Math.sqrt(1500)*2:1500)};
 const c=new NavigationController();c.position=[earth.position[0]+earth.radius*5,earth.position[1],earth.position[2]];
 c.target=[...earth.position];c.orientation=lookQuaternion(c.position,c.target);
 c.system(ctx,OVERVIEW_DIRECTION,{region:'inner'});
 for(let k=0;k<180;k++)c.update(1/60,ctx,{}, {...settings,collision:true});
 expect(c.transition).toBeNull();expect(c.collisionWarning).toBe(false);
 const expected=new NavigationController();expected.system({...ctx,reducedMotion:true},OVERVIEW_DIRECTION,{region:'inner'});
 expected.update(.1,ctx,{},settings);
 expect(norm(sub(c.position,expected.position))).toBeLessThan(.1);
});
it('overview includes a highly eccentric orbit even when its body is near periapsis',()=>{
 const s=makePreset('comet'),ctx=context(s),points=overviewPoints(ctx).points;
 const c=new NavigationController();c.system(ctx);c.update(.1,ctx,{},settings);
 const forward=unit(sub(c.target,c.position));
 for(const p of points)expect(dot(sub(p.position,c.position),forward)).toBeGreaterThan(0);
});
it('top-down look has a stable north axis and no singular quaternion',()=>{
 const q=lookQuaternion([0,0,AU],[0,0,0]),up=new Vector3(0,1,0).applyQuaternion(q);
 expect(q.toArray().every(Number.isFinite)).toBe(true);expect(up.z).toBeCloseTo(-1,10);
});
it('damped orbit always aims at its target instead of lagging behind its position',()=>{
 const s=makePreset('solar-now'),ctx=context(s),c=new NavigationController();c.system(ctx);c.update(.1,ctx,{},settings);
 c.setOrbitDesired([AU*20,AU*40,AU*20],c.target);
 c.update(1/60,ctx,{},settings);
 const f=new Vector3(0,0,-1).applyQuaternion(c.orientation);
 expect(f.dot(toRender(sub(c.target,c.position)).normalize())).toBeCloseTo(1,12);
});
it('focus pose interpolation agrees at 30 and 120 FPS without an endpoint rotation snap',()=>{
 const b=body({id:'earth',radius:6371000,position:[AU,0,0]}),ctx={...context({bodies:[b]}),reducedMotion:false};
 const cameras=[new NavigationController(),new NavigationController()];
 for(const [k,fps] of [30,120].entries()){
  cameras[k].focus(b,ctx,{duration:2});
  for(let i=0;i<fps;i++)cameras[k].update(1/fps,ctx,{},settings);
 }
 expect(norm(sub(cameras[0].position,cameras[1].position))).toBeLessThan(.01);
 expect(Math.abs(cameras[0].orientation.dot(cameras[1].orientation))).toBeCloseTo(1,12);
});
it('camera history preserves framing and rejects malformed projection offsets',()=>{
 const c=new NavigationController();c.screenCenter=[-.25,.1];const pose=c.snapshot();
 const restored=new NavigationController();restored.restore(pose);
 expect(restored.screenCenter).toEqual([-.25,.1]);
 expect(validPose({...pose,screenCenter:[2,0]})).toBe(false);
 expect(validPose({...pose,screenCenter:[NaN,0]})).toBe(false);
 expect(validPose({...pose,screenCenter:[0]})).toBe(false);
});
it('adaptive navigation speed changes with the visible clearance even while orbiting',()=>{
 const b=body({id:'earth',position:[0,0,0],radius:10}),c=new NavigationController();
 c.position=[100,0,0];c.target=[0,0,0];c.orbitPosition=[100,0,0];c.orbitTarget=[0,0,0];c.speed=1;
 const ctx={...context({bodies:[b]}),radiusFor:()=>50};
 c.update(.1,ctx,{}, {...settings,adaptiveSpeed:true});
 expect(c.speed).toBeGreaterThan(1);expect(c.effectiveSpeed).toBeLessThanOrEqual(25);
});
