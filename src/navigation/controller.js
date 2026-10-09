import {Quaternion,Vector3} from 'three';
import {rotateAxis} from '../physics/vehicles.js';
import {AU,add,sub,scale,norm,unit,dot,cross} from '../physics/units.js';
import {CAMERA_DEFAULTS,cameraMode,toRender,toSI,damping,lookQuaternion,safeFocusDistance,nearestClearance,barycenter,surfacePosition,protectCamera,validPose} from './model.js';
import {OVERVIEW_DIRECTION,fitPoints,overviewPoints} from './framing.js';
const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t),ease=t=>t*t*(3-2*t);
const forward=q=>toSI(new Vector3(0,0,-1).applyQuaternion(q));
export class NavigationController {
 constructor(){this.screenCenter=[0,0];this.mode='orbit';this.position=[0,AU,AU*2];this.orientation=lookQuaternion(this.position,[0,0,0]);this.target=[0,0,0];this.targetId=null;this.velocity=[0,0,0];this.speed=CAMERA_DEFAULTS.speed;this.fov=42;this.transition=null;this.previousPrimary=null;this.previousFrame=null;this.orbitPosition=[...this.position];this.orbitTarget=[...this.target];this.elapsed=0;this.surfaceOffset=null;this.initialized=false;this.collisionWarning=false;}
 snapshot(scaleName='system',settings=CAMERA_DEFAULTS){
  return {screenCenter:[...this.screenCenter],positionSI:[...this.position],targetSI:[...this.target],orientation:this.orientation.toArray(),mode:this.mode,targetId:this.targetId,barycenterIds:this.baryIds??null,fov:this.fov,scale:scaleName,reference:settings.reference,referenceId:settings.referenceId};
 }
 restore(pose){if(!validPose(pose))throw new Error('Invalid camera pose');this.position=[...pose.positionSI];this.target=[...pose.targetSI];this.orientation.fromArray(pose.orientation).normalize();this.fov=pose.fov;this.screenCenter=[...(pose.screenCenter??[0,0])];this.mode=pose.mode;this.targetId=pose.targetId??null;this.resetMotion();this.baryIds=pose.barycenterIds??null;this.initialized=true;}
 resetMotion(){this.transition=null;this.velocity=[0,0,0];this.orbitPosition=[...this.position];this.orbitTarget=[...this.target];this.previousPrimary=null;this.previousFrame=null;this.surfaceOffset=null;this.lookGoal=null;this.baryIds=null;this.elapsed=0;}
 setMode(mode,targetId=null){
  const normalized=cameraMode(mode);if(normalized==='free')targetId=null;if(normalized===this.mode&&targetId===this.targetId)return;
  this.mode=normalized;this.targetId=targetId;this.resetMotion();
  // Switching owners preserves the exact pose. Free must not retain follow velocity.
 }
 cancel(){this.mode='free';this.targetId=null;this.resetMotion();}
 focus(body,context,{mode='orbit',direction=null,coverage=.55,duration=2.4,distance:requestedDistance=null}={}){
  if(!body)return;
  const extent=context.radiusFor(body)*(body.rings?body.rings.outer/body.radius:body.rocket?3:body.spacecraft?1.8:body.blackHole?.diskSize??1);
  const distance=requestedDistance??safeFocusDistance(extent,context.focusFov??this.fov,coverage,context.aspect);
  if(context.screenCenter)this.screenCenter=[...context.screenCenter];
  let dir=direction;
  if(!dir){const star=context.bodies.find(b=>b.type==='star'&&b.id!==body.id);dir=star?unit(add(unit(sub(star.position,body.position)),[0,.35,.4])):[.3,-1,.4];}
  dir=unit(dir);this.mode=cameraMode(mode);this.targetId=body.id;this.velocity=[0,0,0];this.baryIds=null;this.lookGoal=null;this.surfaceOffset=null;
  const from=[...this.position],travel=norm(sub(body.position,from)),oldTarget=[...this.target],lift=Math.min(AU*3,travel*.15);
  this.transition={fromOrientation:this.orientation.clone(),from,oldTarget,targetId:body.id,toDirection:dir,distance,duration:context.reducedMotion?0:duration,time:0,lift,crossScale:travel>Math.max(extent*100,1e8)};
  this.previousPrimary=null;this.initialized=true;
 }
 enterSurface(body,context,settings){if(!body)return;this.focus(body,context,{mode:'surface'});this.transition.distance=body.radius+Math.max(settings.clearance,settings.surfaceAltitude);this.transition.surface=true;this.surfaceOffset=null;}
 family(body,context){if(!body)return;const primary=body.type==='moon'||body.rocket||body.spacecraft?context.bodies.find(b=>b.id===body.parentId)??body:body;const radius=Math.max(context.radiusFor(primary),...context.bodies.filter(b=>b.parentId===primary.id).map(b=>norm(sub(b.position,primary.position))+context.radiusFor(b)));this.focus({...primary,radius},{...context,radiusFor:()=>radius},{mode:'orbit',coverage:.7});}
 system(context,direction=OVERVIEW_DIRECTION,{region='all'}={}){
  const {bodies,points}=overviewPoints(context,region),target=barycenter(bodies);
  const extent=Math.max(AU*.01,...points.map(p=>norm(sub(p.position,target))+(p.radius??0)));
  let distance=points.length?fitPoints(points,target,direction,context.focusFov??this.fov,context.aspect):safeFocusDistance(extent,this.fov,.8,context.aspect);
  if(context.fitSpace&&points.length){
   const {toDisplay,toPhysical,radiusScale}=context.fitSpace,center=toDisplay(target);
   const displayDistance=fitPoints(points.map(p=>({position:toDisplay(p.position),radius:(p.radius??0)*radiusScale})),center,direction,context.focusFov??this.fov,context.aspect);
   const endpoint=toPhysical(add(center,scale(unit(direction),displayDistance))),offset=sub(endpoint,target);
   direction=unit(offset);distance=norm(offset);
  }
  this.focus({id:null,position:target,radius:extent},{...context,radiusFor:()=>extent},{direction,distance});
  this.targetId=null;this.transition.target=target;
 }
 setOrbitDesired(position,target){this.orbitPosition=[...position];this.orbitTarget=[...target];}
 look(dx,dy,settings,up=[0,0,1]){
  if(this.mode==='target-lock')this.setMode('free');
  const yaw=new Quaternion().setFromAxisAngle(toRender(unit(up)),-dx*settings.sensitivity);
  const current=this.orientation.clone();if(this.lookGoal)this.orientation.copy(this.lookGoal);
  this.orientation.premultiply(yaw);
  const right=new Vector3(1,0,0).applyQuaternion(this.orientation),angle=-dy*settings.sensitivity*(settings.invertY?-1:1);
  const pitch=Math.asin(Math.max(-1,Math.min(1,dot(forward(this.orientation),unit(up)))));
  const limited=settings.unrestricted?angle:Math.max(-Math.PI/2+.015-pitch,Math.min(Math.PI/2-.015-pitch,angle));
  this.orientation.premultiply(new Quaternion().setFromAxisAngle(right,limited)).normalize();this.lookGoal=this.orientation.clone();this.orientation.copy(current);
 }
 update(dt,context,input={},settings=CAMERA_DEFAULTS){
  dt=Math.max(0,Math.min(.1,dt));this.elapsed+=dt;this.fov=settings.fov;
  const body=context.bodies.find(b=>b.id===this.targetId),positionBefore=[...this.position],automaticTravel=Boolean(this.transition);
  const clearance=nearestClearance(this.position,context.bodies,context.radiusFor);
  const desiredSpeed=settings.adaptiveSpeed?Math.max(.1,Math.min(AU*2,clearance*.3)):settings.speed;
  this.speed=settings.adaptiveSpeed?this.speed+(desiredSpeed-this.speed)*damping(3,dt):settings.speed;
  this.effectiveSpeed=settings.adaptiveSpeed?Math.min(this.speed,clearance*.5):this.speed;
  const moving=Boolean(input.move?.some(x=>x!==0)),manual=moving||input.look?.some(x=>x!==0)||input.dolly;
  if(this.transition&&manual)this.cancel();
  if(moving&&['orbit','follow','chase','rocket','satellite','cinematic'].includes(this.mode))this.cancel();
  if(input.look?.some(x=>x!==0)&&['cinematic','chase','rocket','satellite'].includes(this.mode))this.cancel();
  // A reference frame changes visualization coordinates only. Selection is never a frame anchor.
  const ref=context.bodies.find(b=>b.id===settings.referenceId)??(settings.reference==='sun'?context.bodies.find(b=>b.type==='star'):null);
  if(settings.reference!=='inertial'&&ref&&this.previousFrame?.id===ref.id&&this.mode!=='surface'&&!['follow','chase','rocket','satellite'].includes(this.mode)){
   const shift=sub(ref.position,this.previousFrame.position);this.position=add(this.position,shift);this.target=add(this.target,shift);this.orbitPosition=add(this.orbitPosition,shift);this.orbitTarget=add(this.orbitTarget,shift);
  }
  if(settings.reference==='velocity'&&ref&&this.previousFrame?.velocity&&norm(ref.velocity)>0){const rotation=new Quaternion().setFromUnitVectors(toRender(unit(this.previousFrame.velocity)),toRender(unit(ref.velocity)));this.position=add(ref.position,toSI(toRender(sub(this.position,ref.position)).applyQuaternion(rotation)));this.target=add(ref.position,toSI(toRender(sub(this.target,ref.position)).applyQuaternion(rotation)));this.orientation.premultiply(rotation);this.orbitPosition=[...this.position];this.orbitTarget=[...this.target];}
  this.previousFrame=ref?{id:ref.id,position:[...ref.position],velocity:[...ref.velocity]}:null;
  if(this.transition){
   const tr=this.transition;tr.time+=dt;const t=tr.duration?Math.min(1,tr.time/tr.duration):1,end=body?.position??tr.target??this.target;
   if(tr.surface&&body)tr.toDirection=unit(sub(surfacePosition(body,context.jd,settings.surfaceLatitude,settings.surfaceLongitude,settings.surfaceAltitude),body.position));
   if(tr.crossScale){
    const pull=add(tr.from,scale(unit(sub(tr.from,tr.oldTarget)),tr.lift));
    const approach=add(end,scale(tr.toDirection,Math.max(tr.distance,tr.lift)));
    if(t<.22)this.position=mix(tr.from,pull,ease(t/.22));
    else if(t<.68){const u=ease((t-.22)/.46);this.position=add(mix(pull,approach,u),[0,0,tr.lift*Math.sin(u*Math.PI)]);}
    else {const u=ease((t-.68)/.32),r=Math.exp(Math.log(Math.max(tr.distance,tr.lift))*(1-u)+Math.log(tr.distance)*u);this.position=add(end,scale(tr.toDirection,r));}
   }else this.position=mix(tr.from,add(end,scale(tr.toDirection,tr.distance)),ease(t));
   this.target=mix(tr.oldTarget,end,ease(t));this.orientation.copy(tr.fromOrientation).slerp(lookQuaternion(this.position,this.target),ease(t));
   if(t===1){this.transition=null;this.target=[...end];this.orientation.copy(lookQuaternion(this.position,end));this.orbitPosition=[...this.position];this.orbitTarget=[...end];}
  }else if(this.mode==='orbit'||this.mode==='follow'){
   if(this.baryIds){const center=barycenter(context.bodies,this.baryIds),shift=sub(center,this.orbitTarget);this.position=add(this.position,shift);this.orbitPosition=add(this.orbitPosition,shift);this.target=center;this.orbitTarget=center;}
   if(this.mode==='follow'&&body){
    if(this.previousPrimary?.id===body.id){const shift=sub(body.position,this.previousPrimary.position);this.position=add(this.position,shift);this.orbitPosition=add(this.orbitPosition,shift);}
    this.target=[...body.position];this.orbitTarget=[...body.position];
   }
   const offset=toRender(sub(this.position,this.target)),desired=toRender(sub(this.orbitPosition,this.orbitTarget)),r0=Math.max(1e-12,offset.length()),r1=Math.max(1e-12,desired.length());
   const rotation=new Quaternion().setFromUnitVectors(offset.clone().normalize(),desired.clone().normalize()),partial=new Quaternion().slerp(rotation,damping(settings.rotationDamping,dt)),direction=offset.normalize().applyQuaternion(partial);
   const radial=Math.exp(Math.log(r0)*(1-damping(settings.zoomDamping,dt))+Math.log(r1)*damping(settings.zoomDamping,dt));
   this.target=mix(this.target,this.orbitTarget,damping(settings.followDamping,dt));this.position=add(this.target,toSI(direction.multiplyScalar(radial)));
   this.orientation.copy(lookQuaternion(this.position,this.target));
  }else if(['chase','rocket','satellite'].includes(this.mode)&&body){
   const parent=context.bodies.find(b=>b.id===body.parentId),heading=unit(settings.chaseOrientation==='attitude'?(body.rocket?.orientation??body.spacecraft?.orientation??sub(body.velocity,parent?.velocity??[0,0,0])):sub(body.velocity,parent?.velocity??[0,0,0]));
   const up=parent?unit(sub(body.position,parent.position)):[0,0,1],radius=context.radiusFor(body);
   const desired=add(add(body.position,scale(heading,-radius*settings.chaseDistance)),scale(up,radius*settings.chaseHeight));
   this.position=mix(this.position,desired,damping(settings.followDamping,dt));this.target=mix(this.target,add(body.position,scale(heading,radius*2)),damping(settings.followDamping,dt));
   this.orientation.slerp(lookQuaternion(this.position,this.target,up),damping(settings.rotationDamping,dt));
  }else if(this.mode==='cinematic'){
   if(context.keyframes?.length>1){
    const t=(this.elapsed/8)%(context.keyframes.length-1),i=Math.floor(t),a=context.keyframes[i],b=context.keyframes[i+1];
    if(validPose(a)&&validPose(b)){this.position=mix(a.positionSI,b.positionSI,ease(t-i));this.orientation.fromArray(a.orientation).slerp(new Quaternion().fromArray(b.orientation),ease(t-i));this.target=mix(a.targetSI,b.targetSI,ease(t-i));}
   }else if(body){const radius=Math.max(context.radiusFor(body)*8,norm(sub(this.position,body.position))),angle=this.elapsed*.08;this.position=add(body.position,[radius*Math.cos(angle),radius*Math.sin(angle),radius*.25]);this.target=[...body.position];this.orientation.copy(lookQuaternion(this.position,this.target));}
  }
  if(this.mode==='surface'&&body&&!this.transition){
   const surfaceKey=[settings.surfaceLatitude,settings.surfaceLongitude,settings.surfaceAltitude].join(':');if(this.surfaceKey!==surfaceKey){this.surfaceKey=surfaceKey;this.surfaceOffset=null;}
   if(!this.surfaceOffset){this.position=surfacePosition(body,context.jd,settings.surfaceLatitude,settings.surfaceLongitude,settings.surfaceAltitude);this.surfaceOffset=sub(this.position,body.position);const up=unit(this.surfaceOffset),east=unit(cross(body.spin.axis,up));this.orientation.slerp(lookQuaternion(this.position,add(this.position,add(east,scale(up,.15))),up),damping(settings.rotationDamping,dt));}
   else if(this.previousPrimary?.id===body.id){const old=sub(this.position,this.previousPrimary.position),angle=(context.jd-this.previousPrimary.jd)*86400*2*Math.PI/body.spin.period,rotation=new Quaternion().setFromAxisAngle(toRender(unit(body.spin.axis)),angle);this.position=add(body.position,rotateAxis(old,body.spin.axis,angle));this.orientation.premultiply(rotation);if(this.lookGoal)this.lookGoal.premultiply(rotation);this.surfaceOffset=sub(this.position,body.position);}
  }
  if(['free','target-lock','surface'].includes(this.mode)){
   let up=this.mode==='surface'&&body?unit(sub(this.position,body.position)):[0,0,1];
   if(input.look?.some(x=>x!==0))this.look(...input.look,settings,up);
   if(this.lookGoal)this.orientation.slerp(this.lookGoal,damping(settings.rotationDamping,dt));
   const axes=[new Vector3(1,0,0).applyQuaternion(this.orientation),settings.vertical==='camera'?new Vector3(0,1,0).applyQuaternion(this.orientation):toRender([0,0,1]),new Vector3(0,0,-1).applyQuaternion(this.orientation)];
   const move=new Vector3();(input.move??[0,0,0]).forEach((x,i)=>move.addScaledVector(axes[i],x));if(move.lengthSq()>1)move.normalize();
   const modifier=(input.precision?settings.precisionFactor:1)*(input.boost?settings.boostFactor:1);
   const safeSpeed=this.effectiveSpeed;
   this.effectiveSpeed=safeSpeed;
   if(norm(this.velocity)>safeSpeed*modifier)this.velocity=scale(unit(this.velocity),safeSpeed*modifier);
   const desiredVelocity=toSI(move.multiplyScalar(safeSpeed*modifier));
   // Precision clamps residual momentum immediately, without changing the base setting.
   if(input.precision&&norm(this.velocity)>this.speed*modifier)this.velocity=scale(unit(this.velocity),this.speed*modifier);
   const oldVelocity=[...this.velocity],rate=settings.translationDamping,alpha=damping(rate,dt);
   this.velocity=mix(oldVelocity,desiredVelocity,alpha);
   const displacement=rate>0?add(scale(desiredVelocity,dt),scale(sub(oldVelocity,desiredVelocity),alpha/rate)):scale(desiredVelocity,dt);
   this.position=add(this.position,displacement);
   if(input.dolly)this.position=add(this.position,scale(forward(this.orientation),input.dolly*this.speed*.02));
   if(this.mode==='target-lock'&&body){this.target=[...body.position];this.orientation.slerp(lookQuaternion(this.position,this.target),damping(settings.rotationDamping,dt));}
   else this.target=add(this.position,scale(forward(this.orientation),Math.max(1,this.speed)));
  }
  // Focus travel is a display navigation path, not a flight through every intervening surface.
  // Keep each automated pose outside bodies without a swept barrier trapping it at a surface.
  // Manual movement retains swept collision protection, including high-speed crossings.
  const protectedPose=protectCamera(positionBefore,this.position,context.bodies,settings,context.radiusFor,{sweep:!automaticTravel});
  this.position=protectedPose.position;this.collisionWarning=protectedPose.blocked;
  if(this.collisionWarning){this.velocity=[0,0,0];this.orbitPosition=[...this.position];}
  this.previousPrimary=body?{id:body.id,position:[...body.position],jd:context.jd}:null;
  return this.snapshot(context.scale,settings);
 }
}
