import {G,AU,SOLAR_RADIUS,add,sub,scale,norm,unit,dot,cross} from './units.js';
import {orbitalElements,primaryFor} from './orbital.js';
const clamp=(x,a=-1,b=1)=>Math.max(a,Math.min(b,x));
const angle=(a,b)=>Math.acos(clamp(dot(unit(a),unit(b))));
export function observingStar(s,observer){
 const stars=s.bodies.filter(b=>b.type==='star');return stars.sort((a,b)=>norm(sub(a.position,observer.position))-norm(sub(b.position,observer.position)))[0]
 ??{id:'assumed-sun',name:'Assumed Sun direction',radius:SOLAR_RADIUS,position:add(s.bodies.find(b=>b.id==='earth')?.position??[0,0,0],[AU,0,0]),luminosity:3.828e26};
}
function circleOverlap(a,b,d){
 if(d>=a+b)return 0;if(d<=Math.abs(a-b))return Math.PI*Math.min(a,b)**2;
 const x=clamp((d*d+a*a-b*b)/(2*d*a)),y=clamp((d*d+b*b-a*a)/(2*d*b));
 return a*a*Math.acos(x)+b*b*Math.acos(y)-.5*Math.sqrt(Math.max(0,(-d+a+b)*(d+a-b)*(d-a+b)*(d+a+b)));
}
// Finite apparent discs, with the strongest single occulter. Spherical opaque
// bodies; no atmospheric refraction, scattered light, or multi-disc union model.
export function sunlight(observer,star,bodies){
 const ray=sub(star.position,observer.position),distance=norm(ray);
 if(distance<=star.radius)return {state:'sunlight',fraction:1,occluder:null};
 const solarAngle=Math.asin(clamp(star.radius/distance,0,1));let fraction=1,occluder=null;
 for(const b of bodies){if(b.id===observer.id||b.id===star.id||b.massless||b.radius<=0)continue;const r=sub(b.position,observer.position),d=norm(r);
  if(dot(r,ray)<=0||d>=distance)continue;
  const angularRadius=Math.asin(clamp(b.radius/Math.max(d,b.radius),0,1)),separation=angle(r,ray);
  const visible=1-circleOverlap(solarAngle,angularRadius,separation)/(Math.PI*solarAngle*solarAngle);
  if(visible<fraction){fraction=clamp(visible,0,1);occluder=b.id;}
 }
 return {state:fraction<=1e-6?'umbra':fraction<1-1e-6?'penumbra':'sunlight',fraction,occluder};
}
export function observation(observer,target,star,c=299792458){
 const r=sub(target.position,observer.position),v=sub(target.velocity,observer.velocity),distance=norm(r);
 const phase=star&&star.id!==target.id?angle(sub(observer.position,target.position),sub(star.position,target.position)):null;
 return {distance,relativeSpeed:norm(v),closingSpeed:distance?-dot(r,v)/distance:0,lightTime:distance/c,
 angularSize:distance?2*Math.asin(clamp(target.radius/distance,0,1)):Math.PI,phaseAngle:phase,
 illuminatedFraction:phase==null?null:(1+Math.cos(phase))/2};
}
export function signalLink(from,to,bodies,{range=4e7,c=299792458,frequency=8.4e9,power=20,transmitGain=30,receiveGain=30}={}){
 const distance=norm(sub(to.position,from.position)),d=sub(to.position,from.position);let blockedBy=null;
 for(const b of bodies){if(b.id===from.id||b.id===to.id||b.massless)continue;const t=clamp(dot(sub(b.position,from.position),d)/(distance*distance||1),0,1);if(norm(sub(add(from.position,scale(d,t)),b.position))<b.radius*.999999){blockedBy=b.id;break;}}
 const freeSpaceLoss=20*Math.log10(Math.max(1,4*Math.PI*distance*frequency/c)),receivedDBW=10*Math.log10(Math.max(power,1e-30))+transmitGain+receiveGain-freeSpaceLoss;
 return {distance,delay:distance/c,status:power===0?'unavailable':distance>range?'out-of-range':blockedBy?'blocked':'connected',blockedBy,freeSpaceLoss,receivedDBW,
 model:'Geometric LOS and free-space loss; antenna gains assumed aligned. No modulation, noise, atmosphere or link-margin model.'};
}
export function lagrangePoints(primary,secondary){
 if(!(primary.mass>0&&secondary.mass>0))return [];
 const r=sub(secondary.position,primary.position),distance=norm(r),mu=secondary.mass/(primary.mass+secondary.mass),x=unit(r);
 let z=unit(cross(r,sub(secondary.velocity,primary.velocity)));if(norm(cross(r,sub(secondary.velocity,primary.velocity)))<1e-9)z=[0,0,1];
 const y=unit(cross(z,x)),center=add(primary.position,scale(r,mu)),epsilon=1e-10;
 const f=t=>t-(1-mu)*(t+mu)/Math.abs(t+mu)**3-mu*(t-1+mu)/Math.abs(t-1+mu)**3;
 const root=(lo,hi)=>{for(let i=0;i<120;i++){const mid=(lo+hi)/2;if(f(mid)>0)hi=mid;else lo=mid;}return (lo+hi)/2;};
 return [['L1',root(-mu+epsilon,1-mu-epsilon),0],['L2',root(1-mu+epsilon,10),0],['L3',root(-10,-mu-epsilon),0],['L4',.5-mu,Math.sqrt(3)/2],['L5',.5-mu,-Math.sqrt(3)/2]]
 .map(([name,a,b])=>({name,position:add(center,add(scale(x,a*distance),scale(y,b*distance))),model:'Idealized circular restricted three-body equilibrium; not a live-force equilibrium.'}));
}
export function resonance(a,b,bodies,settings){
 const p=primaryFor(a,bodies),q=primaryFor(b,bodies);if(!p||p.id!==q?.id)return null;
 const first=orbitalElements(sub(a.position,p.position),sub(a.velocity,p.velocity),G*settings.gMultiplier*p.mass),second=orbitalElements(sub(b.position,p.position),sub(b.velocity,p.velocity),G*settings.gMultiplier*p.mass);
 if(!first?.period||!second?.period)return null;const ratio=first.period/second.period;let best=null;
 for(let n=1;n<=8;n++)for(let d=1;d<=8;d++){if(n===d&&Math.abs(ratio-1)>.01)continue;const error=Math.abs(ratio/(n/d)-1);if(error<.01&&(!best||error<best.error))best={n,d,error,ratio};}
 return best?{...best,label:best.n+':'+best.d+' period ratio',model:'Instantaneous period commensurability; resonance libration is not established.'}:null;
}
export function rendezvous(body,target){
 const r=sub(target.position,body.position),v=sub(target.velocity,body.velocity),distance=norm(r),a=body.rocket?.orientation??body.spacecraft?.orientation,b=target.rocket?.orientation??target.spacecraft?.orientation;
 return {relativePosition:r,relativeVelocity:v,distance,speed:norm(v),closingSpeed:distance?-dot(r,v)/distance:0,alignment:a&&b?angle(a,b):null,
 dockable:distance<=20&&norm(v)<=.2&&a&&b&&angle(a,b)<5*Math.PI/180};
}
export function rendezvousBurn(body,target,mode,holdDistance=100){
 const r=sub(target.position,body.position),v=sub(target.velocity,body.velocity),distance=norm(r);
 return mode==='match'?v:add(v,scale(unit(r),Math.max(-10,Math.min(10,(distance-holdDistance)/120))));
}
export function orbitChange(body,primary,settings,{escape=false,periapsis=200000,apoapsis=200000}={}){
 const r=sub(body.position,primary.position),v=sub(body.velocity,primary.velocity),distance=norm(r),mu=G*settings.gMultiplier*primary.mass;
 if(!(mu>0&&distance>primary.radius))throw new Error('Vehicle must be outside a massive primary');
 if(escape)return sub(scale(unit(v),Math.sqrt(2*mu/distance)*1.001),v);
 const pe=primary.radius+periapsis,ap=primary.radius+apoapsis;if(pe<=primary.radius||ap<pe||distance<pe-1||distance>ap+1)throw new Error('Current radius must lie between the requested periapsis and apoapsis');
 const a=(pe+ap)/2,e=(ap-pe)/(ap+pe),h=Math.sqrt(mu*a*(1-e*e)),vt=h/distance,speedSquared=mu*(2/distance-1/a),vr=Math.sqrt(Math.max(0,speedSquared-vt*vt))*(dot(r,v)<0?-1:1),radial=unit(r),normal=unit(cross(r,v)),tangent=unit(cross(normal,radial));
 return sub(add(scale(radial,vr),scale(tangent,vt)),v);
}
