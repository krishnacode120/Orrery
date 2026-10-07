import { C } from './limits.js';
import { dot, norm } from './units.js';

export function acceleration1PN(r, v, mu, c=C) {
  const distance=norm(r), v2=dot(v,v);
  if(!distance || mu/(c*c*distance)>0.01 || v2/(c*c)>0.04)
    throw new Error('1PN weak-field limit exceeded; increase c or move bodies apart');
  const factor=mu/(c*c*distance**3), rv=dot(r,v), radial=4*mu/distance-v2;
  return r.map((x,k)=>factor*(radial*x+4*rv*v[k]));
}

export function analyticPrecession(mu,a,e,c=C) {
  return 6*Math.PI*mu/(a*(1-e*e)*c*c); // radians per radial orbit
}

// Dominant-primary Schwarzschild approximation, not the full N-body EIH system.
// Apply an equal/opposite reaction to an unpinned massive primary.
export function addRelativity(bodies, sources, accelerations, g, c=C) {
  for(let i=0;i<bodies.length;i++) {
    const b=bodies[i];
    if(b.locked)continue;
    let primary=-1, strength=-Infinity;
    for(const j of sources) {
      const p=bodies[j];
      if(i===j || (!b.massless && p.mass<=b.mass))continue;
      const r2=p.position.reduce((s,x,k)=>s+(x-b.position[k])**2,0);
      const attraction=p.mass/r2;
      if(attraction>strength) {strength=attraction;primary=j;}
    }
    if(primary<0)continue;
    const p=bodies[primary], r=b.position.map((x,k)=>x-p.position[k]);
    const v=b.velocity.map((x,k)=>x-(p.locked?0:p.velocity[k]));
    const correction=acceleration1PN(r,v,g*p.mass,c);
    for(let k=0;k<3;k++) {
      accelerations[i][k]+=correction[k];
      if(!b.massless && !p.locked)accelerations[primary][k]-=correction[k]*b.mass/p.mass;
    }
  }
}
