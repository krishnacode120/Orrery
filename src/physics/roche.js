import { G, norm } from './units.js';
import { rocheLimit } from './orbital.js';
import { source, debrisCapacity, makeDebris, replaceBodies } from './debris.js';

export { rocheLimit } from './orbital.js';
export function disruptTides(bodies,settings,emit=()=>{},serial=0) {
  if(!settings.roche||(settings.gMultiplier??1)<=0)return bodies;
  const candidates=bodies.filter(b=>source(b)&&!b.disrupted&&!b.locked);
  let events=0;
  for(const b of candidates) {
    if(!bodies.includes(b)||events>=32)continue;
    let primary=null,limit=null,ratio=Infinity;
    for(const p of bodies) {
      if(!source(p)||p.mass<=b.mass||p.disrupted)continue;
      const distance=norm(b.position.map((x,k)=>x-p.position[k])),base=rocheLimit(p,b),r=base?(settings.tidalMultiplier??1)*base:null;
      if(r && distance>p.radius && distance<r && distance/r<ratio){primary=p;limit=r;ratio=distance/r;}
    }
    if(!primary)continue;
    const count=Math.min(settings.fragmentCount??12,debrisCapacity(bodies,[b]),Math.floor(b.mass/((settings.fragmentMinMass??1)*2)));
    if(count<2)continue; // Capacity limits never silently discard physical mass.
    const radial=b.position.map((x,k)=>x-primary.position[k]),distance=norm(radial);
    const speed=Math.sqrt(2*G*(settings.gMultiplier??1)*primary.mass*b.radius*b.radius/distance**3);
    const fragments=makeDebris(b,count,radial,speed,serial+events,bodies,settings);
    const next=replaceBodies(bodies,[b],fragments);
    emit(bodies,next,{kind:'tidal',bodyIds:[b.id,primary.id],
      message:b.name+' crossed the Roche boundary of '+primary.name+' ('+limit.toExponential(3)+' m); resolved tidal stream'});
    bodies=next;events++;
  }
  return bodies;
}
