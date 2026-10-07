import { G, cross, dot, norm } from './units.js';
import { solveKepler } from './kepler.js';
const angle=x=>(x%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
const clamp=x=>Math.max(-1,Math.min(1,x));

export function orbitalElements(position,velocity,mu) {
  const r=norm(position),v2=dot(velocity,velocity);
  if(!(r>0 && mu>0))return null;
  const h=cross(position,velocity),hm=norm(h),node=[-h[1],h[0],0],nm=norm(node);
  const vxh=cross(velocity,h),eVector=position.map((x,k)=>vxh[k]/mu-x/r),e=norm(eVector);
  const energy=v2/2-mu/r,parabolic=Math.abs(energy)<1e-12*mu/r;
  const a=parabolic?null:-mu/(2*energy),p=hm*hm/mu;
  const inclination=hm?Math.acos(clamp(h[2]/hm)):null;
  const Omega=nm>hm*1e-12?angle(Math.atan2(node[1],node[0])):0;
  function signed(u,w) {return Math.atan2(dot(cross(u,w),h)/(hm||1),dot(u,w));}
  const reference=nm>hm*1e-12?node:[1,0,0];
  const omega=e>1e-10 && hm?angle(signed(reference,eVector)):0;
  const nu=hm?angle(signed(e>1e-10?eVector:reference,position)):0;
  let M=null;
  if(a!==null && a>0) {
    const E=e>1e-10?Math.atan2(dot(position,velocity)/Math.sqrt(mu*a),1-r/a):nu;
    M=angle(E-e*Math.sin(E));
  } else if(a!==null && e>1) {
    const H=Math.asinh(dot(position,velocity)/(e*Math.sqrt(-mu*a)));
    M=e*Math.sinh(H)-H;
  }
  return {a,e,i:inclination,Omega,omega,M,nu,eVector,h,specificEnergy:energy,specificAngularMomentum:hm,
    periapsis:p/(1+e),apoapsis:a!==null && a>0?a*(1+e):null,
    period:a!==null && a>0?2*Math.PI*Math.sqrt(a**3/mu):null,
    kind:hm===0?'radial':parabolic?'parabolic':a>0?'elliptic':'hyperbolic',
    degenerate:e<1e-10 || nm<=hm*1e-12 || hm===0};
}

export function stateFromElements(elements,mu) {
  const {a,e,i=0,Omega=0,omega=0,M=0}=elements;
  if(!(a>0 && e>=0 && e<1 && mu>0))throw new Error('Element editing requires a bound ellipse: a > 0, 0 ≤ e < 1, positive GM');
  const E=solveKepler(M,e),n=Math.sqrt(mu/a**3),root=Math.sqrt(1-e*e),factor=n*a/(1-e*Math.cos(E));
  const position=[a*(Math.cos(E)-e),a*root*Math.sin(E),0];
  const velocity=[-factor*Math.sin(E),factor*root*Math.cos(E),0];
  const rotate=([x,y,z])=>{
    const X=Math.cos(omega)*x-Math.sin(omega)*y,Y=Math.sin(omega)*x+Math.cos(omega)*y;
    return [Math.cos(Omega)*X-Math.sin(Omega)*Math.cos(i)*Y,
      Math.sin(Omega)*X+Math.cos(Omega)*Math.cos(i)*Y,Math.sin(i)*Y+z];
  };
  return {position:rotate(position),velocity:rotate(velocity)};
}

export function primaryFor(body,bodies) {
  const parent=bodies.find(b=>b.id===body.parentId && !b.massless && b.mass>0);
  if(parent)return parent;
  let best=null,strength=0;
  for(const b of bodies) {
    if(b.id===body.id || b.massless || b.mass<=0 || (!body.massless && b.mass<=body.mass))continue;
    const d2=b.position.reduce((sum,x,k)=>sum+(x-body.position[k])**2,0);
    if(b.mass/d2>strength){best=b;strength=b.mass/d2;}
  }
  return best;
}
export const density=b=>b.density??b.mass/(4*Math.PI*b.radius**3/3);
export function rocheLimit(primary,secondary) {
  const p=density(primary),s=density(secondary);
  return p>0 && s>0?2.44*primary.radius*Math.cbrt(p/s):null;
}
export function derivedOrbit(body,bodies,settings={}) {
  const primary=primaryFor(body,bodies);
  if(!primary)return {primary:null,elements:null,hill:null,roche:null};
  const r=body.position.map((x,k)=>x-primary.position[k]);
  const v=body.velocity.map((x,k)=>(body.locked?0:x)-(primary.locked?0:primary.velocity[k]));
  const mu=G*(settings.gMultiplier??1)*(primary.mass+(body.massless?0:body.mass));
  const elements=orbitalElements(r,v,mu);
  const hill=elements?.a>0 && elements.e<1 && !body.massless
    ?elements.a*(1-elements.e)*Math.cbrt(body.mass/(3*primary.mass)):null;
  return {primary,elements,hill,roche:rocheLimit(primary,body)};
}
