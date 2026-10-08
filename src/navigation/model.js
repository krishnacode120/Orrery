import {Quaternion,Vector3,Matrix4} from 'three';
import {AU,norm,sub,add,scale,unit,dot,cross,DAY,J2000} from '../physics/units.js';
import {rotateAxis} from '../physics/vehicles.js';
export {CAMERA_MODES,CAMERA_DEFAULTS,cameraMode,validateNavigation,validPose} from './settings.js';
export const toRender=v=>new Vector3(v[0],v[2],-v[1]);
export const toSI=v=>[v.x,-v.z,v.y];
export const damping=(rate,dt)=>rate<=0?1:1-Math.exp(-rate*Math.max(0,dt));
export function lookQuaternion(position,target,up=[0,0,1]){
 const m=new Matrix4().lookAt(toRender(position),toRender(target),toRender(up));return new Quaternion().setFromRotationMatrix(m);
}
export function safeFocusDistance(radius,fov=42,coverage=.55,aspect=1){
 const half=Math.atan(Math.tan(fov*Math.PI/360)*Math.min(1,Math.max(.2,aspect)));
 return Math.max(radius*1.08,radius/Math.sin(half*Math.max(.1,Math.min(.9,coverage))));
}
export function nearestClearance(position,bodies){
 let closest=Infinity;
 for(const b of bodies)if(b.visible&&!b.disrupted)closest=Math.min(closest,Math.max(1,norm(sub(position,b.position))-b.radius));
 return Number.isFinite(closest)?closest:AU;
}
export function surfacePosition(body,jd,latitude=0,longitude=0,altitude=100){
 const k=unit(body.spin.axis);let zero=unit(cross([0,1,0],k));if(norm(cross([0,1,0],k))<.1)zero=[1,0,0];
 const east=unit(cross(k,zero)),lat=latitude*Math.PI/180,lon=longitude*Math.PI/180;
 let local=add(scale(add(scale(zero,Math.cos(lon)),scale(east,Math.sin(lon))),Math.cos(lat)),scale(k,Math.sin(lat)));
 local=rotateAxis(local,k,(jd-J2000)*DAY*2*Math.PI/body.spin.period);
 return add(body.position,scale(local,body.radius+Math.max(0,altitude)));
}
export function barycenter(bodies,ids=null){
 const list=bodies.filter(b=>!b.massless&&b.mass>0&&(!ids||ids.includes(b.id))),mass=list.reduce((n,b)=>n+b.mass,0);
 return mass?list.reduce((p,b)=>add(p,scale(b.position,b.mass/mass)),[0,0,0]):[0,0,0];
}
export function protectCamera(previous,next,bodies,settings,radiusFor=b=>b.radius){
 if(!settings.collision||settings.allowInterior)return {position:next,blocked:false};
 let result=[...next],blocked=false;
 for(const b of bodies.filter(b=>b.visible&&!b.disrupted&&!b.wormhole)){
  const radius=radiusFor(b)+settings.clearance,r=sub(previous,b.position),move=sub(result,previous),length=norm(move);
  if(norm(r)>=radius&&length>0){const a=dot(move,move),qb=2*dot(r,move),c=dot(r,r)-radius*radius,disc=qb*qb-4*a*c;
   if(disc>=0){const t=(-qb-Math.sqrt(disc))/(2*a);if(t>=0&&t<=1){result=add(previous,scale(move,Math.max(0,t-1e-8)));blocked=true;}}
  }else if(norm(sub(result,b.position))<radius){
   const escape=norm(r)>1e-6?r:sub(result,b.position);result=add(b.position,scale(norm(escape)>1e-6?unit(escape):[0,0,1],radius));blocked=true;
  }
 }
 return {position:result,blocked};
}
