import {add,sub,scale,norm,unit,dot,cross} from './units.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const qMultiply=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
export const qNormalize=q=>{const n=Math.hypot(...q);if(!(n>0))throw new Error('Nonzero attitude quaternion required');return q.map(x=>x/n);};
export function qRotate(q,v){const p=qMultiply(qMultiply(q,[...v,0]),[-q[0],-q[1],-q[2],q[3]]);return p.slice(0,3);}
export function quaternionFromForward(direction){
 const f=unit(direction),d=clamp(f[0],-1,1);if(d<-.999999)return [0,0,1,0];
 return qNormalize([0,-f[2],f[1],1+d]);
}
export function attitudeStep(body,desired,dt){
 const vehicle=body.rocket??body.spacecraft,a=vehicle?.attitude;if(!a)return desired;
 a.quaternion=qNormalize(a.quaternion??quaternionFromForward(desired));a.angularVelocity??=[0,0,0];
 if(a.mode!=='rigid'){a.quaternion=quaternionFromForward(desired);return qRotate(a.quaternion,[1,0,0]);}
 const inertia=a.inertia??[.4*body.mass*body.radius**2,.4*body.mass*body.radius**2,.4*body.mass*body.radius**2];
 if(!inertia.every(x=>Number.isFinite(x)&&x>0))throw new Error('Positive principal moments of inertia required');
 if(!Number.isFinite(dt)||dt<0||dt>60)throw new Error('Attitude timestep exceeds 60 s; use smaller dynamics steps');
 const steps=Math.max(1,Math.ceil(dt/.1)),h=dt/steps;
 for(let k=0;k<steps;k++){
  let torque=add(a.torque??[0,0,0],a.rcsTorque??[0,0,0]);
  if(a.autopilot){const forward=qRotate(a.quaternion,[1,0,0]),error=cross(forward,unit(desired)),local=qRotate([-a.quaternion[0],-a.quaternion[1],-a.quaternion[2],a.quaternion[3]],error);
   torque=add(torque,local.map((x,i)=>clamp(x*(a.stiffness??2)*inertia[i]-a.angularVelocity[i]*(a.damping??2)*inertia[i],-(a.maxTorque??1e5),a.maxTorque??1e5)));
  }
  const momentum=a.angularVelocity.map((x,i)=>x*inertia[i]),gyroscopic=cross(a.angularVelocity,momentum),acceleration=torque.map((x,i)=>(x-gyroscopic[i])/inertia[i]);
  a.angularVelocity=add(a.angularVelocity,scale(acceleration,h));const speed=norm(a.angularVelocity);
  if(speed>0){const axis=unit(a.angularVelocity),half=speed*h/2;a.quaternion=qNormalize(qMultiply(a.quaternion,[...scale(axis,Math.sin(half)),Math.cos(half)]));}
 }
 return unit(qRotate(a.quaternion,[1,0,0]));
}
export function gimballedDirection(vehicle,axis){
 const q=quaternionFromForward(axis),limit=(vehicle.gimbalRange??0)*Math.PI/180,gimbal=vehicle.gimbal??[0,0];
 const yaw=clamp(gimbal[0]*Math.PI/180,-limit,limit),pitch=clamp(gimbal[1]*Math.PI/180,-limit,limit);
 return unit(qRotate(q,[Math.cos(pitch)*Math.cos(yaw),Math.cos(pitch)*Math.sin(yaw),Math.sin(pitch)]));
}
export function rcsStep(body,dt){
 const v=body.rocket??body.spacecraft,r=v?.rcs;if(!r||dt<=0)return [0,0,0];
 if(r.fuel<=0){if(v.attitude?.mode==='rigid')v.attitude.rcsTorque=[0,0,0];return [0,0,0];}
 const translation=(r.translation??[0,0,0]).map(x=>clamp(x,-1,1)),rotation=(r.rotation??[0,0,0]).map(x=>clamp(x,-1,1));
 const force=scale(translation,r.thrust??20),torque=scale(rotation,r.torque??5),equivalentForce=norm(force)+norm(torque)/Math.max(.1,r.leverArm??1);
 const required=equivalentForce*dt/((r.isp??220)*9.80665),used=Math.min(r.fuel,required),fraction=required>0?used/required:0;
 r.fuel-=used;r.used=(r.used??0)+used;body.mass=Math.max(1e-6,body.mass-used);
 const q=v.attitude?.quaternion??quaternionFromForward(v.orientation??[1,0,0]);
 body.velocity=add(body.velocity,scale(qRotate(q,force),dt*fraction/body.mass));
 if(v.attitude?.mode==='rigid')v.attitude.rcsTorque=scale(torque,fraction);
 return scale(qRotate(q,force),fraction/body.mass);
}
export function dockingMetrics(a,b){
 const av=a.rocket??a.spacecraft,bv=b.rocket??b.spacecraft;
 if(!av||!bv)throw new Error('Docking requires two vehicles');
 const aq=av.attitude?.quaternion??quaternionFromForward(av.orientation),bq=bv.attitude?.quaternion??quaternionFromForward(bv.orientation);
 const forward=qRotate(aq,[1,0,0]),otherForward=qRotate(bq,[1,0,0]);
 const aPort=add(a.position,qRotate(aq,av.docking?.port??[a.radius,0,0])),bPort=add(b.position,qRotate(bq,bv.docking?.port??[b.radius,0,0]));
 const relative=sub(bPort,aPort),velocity=sub(b.velocity,a.velocity);
 return {range:norm(relative),closingRate:-dot(velocity,unit(relative)),relativeSpeed:norm(velocity),lateralOffset:norm(sub(relative,scale(forward,dot(relative,forward)))),
  alignment:Math.acos(clamp(-dot(forward,otherForward),-1,1)),relativeOrientation:Math.acos(clamp(Math.abs(aq.reduce((s,x,i)=>s+x*bq[i],0)),-1,1))*2};
}
export function dockingStep(bodies,notify){
 for(const a of bodies){const v=a.rocket??a.spacecraft,d=v?.docking;if(!d?.armed||d.connected)continue;
  const b=bodies.find(x=>x.id===d.targetId);if(!b)continue;const m=dockingMetrics(a,b);d.metrics=m;
  if(m.range>(d.distanceTolerance??.5)||m.relativeSpeed>(d.speedTolerance??.1)||m.lateralOffset>(d.lateralTolerance??.25)||m.alignment>(d.angleTolerance??.05))continue;
  const mass=a.mass+b.mass,velocity=scale(add(scale(a.velocity,a.mass),scale(b.velocity,b.mass)),1/mass);
  a.velocity=[...velocity];b.velocity=[...velocity];d.connected=true;d.offset=sub(a.position,b.position);d.model='Point-mass kinematic latch; angular compound-body dynamics omitted';
  notify('mission',a.name+' docked with '+b.name+' at port range '+m.range.toFixed(3)+' m',[a.id,b.id]);
 }
 for(const a of bodies){const d=(a.rocket??a.spacecraft)?.docking;if(!d?.connected)continue;const b=bodies.find(x=>x.id===d.targetId);if(b){a.position=add(b.position,d.offset);a.velocity=[...b.velocity];}}
}
