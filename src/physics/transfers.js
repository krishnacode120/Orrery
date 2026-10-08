import {G,DAY,add,sub,scale,norm,dot,cross,unit} from './units.js';
import {orbitalElements,stateFromElements,primaryFor} from './orbital.js';
const TAU=2*Math.PI,wrap=x=>(x%TAU+TAU)%TAU;
export function sphereOfInfluence(b,bodies,settings={}) {
 const p=primaryFor(b,bodies);if(!p||b.massless||b.mass<=0)return null;
 const o=orbitalElements(sub(b.position,p.position),sub(b.velocity,p.velocity),G*(settings.gMultiplier??1)*p.mass);
 return o?.a>0?o.a*(b.mass/p.mass)**.4:null;
}
export function measure(a,b,observer,c=299792458) {
 const d=norm(sub(b.position,a.position)),u=sub(a.position,observer?.position??[0,0,0]),v=sub(b.position,observer?.position??[0,0,0]);
 return {distance:d,relativeSpeed:norm(sub(b.velocity,a.velocity)),lightTime:d/c,
 angle:norm(u)*norm(v)>0?Math.acos(Math.max(-1,Math.min(1,dot(u,v)/(norm(u)*norm(v))))):null};
}
export function hohmann(r1,r2,mu) {
 if(!(r1>0&&r2>0&&mu>0))throw new Error('Positive orbital radii and gravitational parameter required');
 const a=(r1+r2)/2,duration=Math.PI*Math.sqrt(a**3/mu);
 return {duration,departure:Math.sqrt(mu/r1)*(Math.sqrt(2*r2/(r1+r2))-1),
 arrival:Math.sqrt(mu/r2)*(1-Math.sqrt(2*r1/(r1+r2))),phase:wrap(Math.PI-Math.sqrt(mu/r2**3)*duration)};
}
function stumpff(z){
 if(Math.abs(z)<1e-6)return [1/2-z/24+z*z/720,1/6-z/120+z*z/5040];
 return z>0?[(1-Math.cos(Math.sqrt(z)))/z,(Math.sqrt(z)-Math.sin(Math.sqrt(z)))/Math.sqrt(z)**3]:
 [(Math.cosh(Math.sqrt(-z))-1)/(-z),(Math.sinh(Math.sqrt(-z))-Math.sqrt(-z))/Math.sqrt(-z)**3];
}
// Universal-variable, zero-revolution prograde Lambert solution. SI throughout.
export function lambert(r1v,r2v,seconds,mu) {
 const r1=norm(r1v),r2=norm(r2v),cos=Math.max(-1,Math.min(1,dot(r1v,r2v)/(r1*r2)));
 if(!(seconds>0&&mu>0&&r1>0&&r2>0)||Math.abs(1-Math.abs(cos))<1e-12)throw new Error('Lambert geometry is degenerate; adjust the arrival date');
 const sign=cross(r1v,r2v)[2]>=0?1:-1,A=sign*Math.sqrt(r1*r2*(1+cos));
 const evaluate=z=>{const [C,S]=stumpff(z);if(C<=0)return null;const y=r1+r2+A*(z*S-1)/Math.sqrt(C);if(y<0)return null;return {y,t:((y/C)**1.5*S+A*Math.sqrt(y))/Math.sqrt(mu)};};
 let lo=null,hi=null,previous=null;
 for(let i=0;i<=1024;i++){const z=-4*Math.PI**2+i/1024*(8*Math.PI**2-1e-5),q=evaluate(z);if(!q)continue;if(q.t<=seconds)previous=z;else if(previous!==null){lo=previous;hi=z;break;}}
 if(lo===null)throw new Error('No bounded zero-revolution transfer found; change duration');
 let z;for(let i=0;i<90;i++){z=(lo+hi)/2;const q=evaluate(z);if(!q||q.t<seconds)lo=z;else hi=z;}
 const {y,t}=evaluate(z),f=1-y/r1,g=A*Math.sqrt(y/mu),gd=1-y/r2;
 return {departure:scale(sub(r2v,scale(r1v,f)),1/g),arrival:scale(sub(scale(r2v,gd),r1v),1/g),timeError:t-seconds};
}
export function propagateBound(body,primary,seconds,mu) {
 const o=orbitalElements(sub(body.position,primary.position),sub(body.velocity,primary.velocity),mu);
 if(!o||o.e>=1||!(o.a>0))throw new Error('Target prediction requires a bound orbit');
 return stateFromElements({...o,M:o.M+seconds*Math.sqrt(mu/o.a**3)},mu);
}
export function transferPlan(s,sourceId,targetId,days) {
 const source=s.bodies.find(b=>b.id===sourceId),target=s.bodies.find(b=>b.id===targetId);
 if(!source||!target||source===target)throw new Error('Choose different departure and destination bodies');
 const primary=target.parentId===source.id?source:primaryFor(target,s.bodies);
 if(!primary)throw new Error('Destination requires an orbital primary');
 const mu=G*s.settings.gMultiplier*primary.mass,origin=sub(source.position,primary.position);
 const r1=norm(origin)||source.radius+200000,r2=norm(sub(target.position,primary.position)),estimate=hohmann(r1,r2,mu);
 const duration=(days??estimate.duration/DAY)*DAY;
 const predicted=propagateBound(target,primary,duration,mu);
 const start=norm(origin)>source.radius?origin:scale(unit(sub(target.position,source.position)),r1);
 // Aim above the surface, never at the planet centre.
 const arrivalOffset=scale(unit(predicted.position),target.radius+300000);
 const end=add(predicted.position,arrivalOffset),solution=lambert(start,end,duration,mu);
 const departureVelocity=add(primary.velocity,solution.departure);
 const dv=sub(departureVelocity,source.velocity),arrivalDV=sub(predicted.velocity,solution.arrival);
 const phase=wrap(Math.atan2(cross(start,sub(target.position,primary.position))[2],dot(start,sub(target.position,primary.position))));
 const rate=Math.sqrt(mu/r2**3)-Math.sqrt(mu/r1**3),phaseError=wrap(estimate.phase-phase);
 const windowSeconds=Math.abs(rate)<1e-20?0:(rate>0?phaseError:wrap(-phaseError))/Math.abs(rate);
 const o=orbitalElements(start,solution.departure,mu),path=[];
 if(o?.e<1)for(let i=0;i<=160;i++){const p=stateFromElements({...o,M:o.M+i/160*duration*Math.sqrt(mu/o.a**3)},mu);path.push(add(primary.position,p.position));}
 return {sourceId,targetId,primaryId:primary.id,epochJD:s.jd,arrivalJD:s.jd+duration/DAY,duration,departureVector:dv,departureVelocity,
 arrivalVector:arrivalDV,departureDV:norm(dv),arrivalDV:norm(arrivalDV),totalDV:norm(dv)+norm(arrivalDV),phase,
 windowJD:s.jd+windowSeconds/DAY,hohmann:estimate,path,arrivalPosition:add(primary.position,end),
 model:'Two-body Lambert targeting; osculating target prediction. N-body perturbations require course corrections.'};
}

// Hyperbolic ejection through the current parking-orbit position, with a
// specified outgoing asymptote. Reject trajectories whose periapsis is underground.
export function hyperbolicDeparture(position,vInfinity,mu) {
 const r=norm(position),speed=norm(vInfinity),radial=unit(position),outgoing=unit(vInfinity);
 if(!(r>0&&speed>0&&mu>0))throw new Error('Nonzero escape excess velocity required');
 const cosine=Math.max(-1,Math.min(1,dot(radial,outgoing))),sine=Math.sqrt(1-cosine*cosine),alpha=mu/(r*speed*speed);
 if(sine<1e-9)throw new Error('Escape geometry is collinear; advance the parking orbit');
 const q=(sine+Math.sqrt(sine*sine+4*alpha*(1-cosine)))/(2*alpha),h=mu/speed*q;
 const tangent=unit(sub(outgoing,scale(radial,cosine))),vr=mu/h*(q*cosine+sine),vt=h/r,e=Math.sqrt(1+q*q);
 return {velocity:add(scale(radial,vr),scale(tangent,vt)),periapsis:mu/(speed*speed)*(e-1),eccentricity:e};
}
export function planVehicleDeparture(s,sourceId,targetId,days){
 const b=s.bodies.find(x=>x.id===sourceId),p=s.bodies.find(x=>x.id===b?.parentId),target=s.bodies.find(x=>x.id===targetId);
 const direct=transferPlan(s,sourceId,targetId,days);
 if(!(b?.rocket||b?.spacecraft)||!p||p.type==='star'||target?.parentId===p.id)return direct;
 const outer=transferPlan(s,p.id,targetId,days),vinf=sub(outer.departureVelocity,p.velocity),escape=hyperbolicDeparture(sub(b.position,p.position),vinf,G*s.settings.gMultiplier*p.mass);
 if(escape.periapsis<p.radius+b.radius)throw new Error('Ejection intersects '+p.name+'. Advance the parking orbit and calculate again.');
 const desired=add(p.velocity,escape.velocity),dv=sub(desired,b.velocity);
 return {...outer,sourceId,departureVector:dv,departureVelocity:desired,departureDV:norm(dv),totalDV:norm(dv)+outer.arrivalDV,departurePeriapsis:escape.periapsis,model:'Patched-conic hyperbolic ejection; heliocentric Lambert coast. SOI timing and N-body perturbations need course correction.'};
}
