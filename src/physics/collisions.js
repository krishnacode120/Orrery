import { G, dot, norm } from './units.js';
import { debrisCapacity, makeDebris, replaceBodies, source } from './debris.js';

const physicalVelocity=b=>b.locked?[0,0,0]:b.velocity;
const prior=(b,previous)=>previous?.get(b.id)??b.position;
function sweptBound(b,previous) {
  const start=prior(b,previous);
  return {center:start.map((x,k)=>(x+b.position[k])/2),
    radius:b.radius+norm(b.position.map((x,k)=>x-start[k]))/2};
}

// Multilevel spatial hash avoids placing a tiny particle in billions of cells
// around a star. Only sources are indexed; passive-passive pairs are excluded.
export function collisionCandidates(bodies,previous=null) {
  const levels=new Map(),bounds=bodies.map(b=>sweptBound(b,previous));
  bodies.forEach((b,i)=>{
    if(!source(b) || b.collisionMode==='none')return;
    const level=Math.ceil(Math.log2(Math.max(bounds[i].radius*2,1e-12)));
    if(!levels.has(level))levels.set(level,{size:2**level,cells:new Map(),indices:[]});
    const grid=levels.get(level),cell=bounds[i].center.map(x=>Math.floor(x/grid.size)).join(',');
    if(!grid.cells.has(cell))grid.cells.set(cell,[]);
    grid.cells.get(cell).push(i);grid.indices.push(i);
  });
  const pairs=[];
  bodies.forEach((b,i)=>{
    if(b.collisionMode==='none')return;
    const {center,radius}=bounds[i];
    for(const grid of levels.values()) {
      const extent=radius+grid.size/2;
      const lo=center.map(x=>Math.floor((x-extent)/grid.size)),hi=center.map(x=>Math.floor((x+extent)/grid.size));
      const cells=hi.reduce((n,x,k)=>n*(x-lo[k]+1),1);
      const candidate=j=>{
        if(i===j || (source(b) && j<i))return;
        const q=bounds[j];
        if(center.every((x,k)=>Math.abs(x-q.center[k])<=radius+q.radius))pairs.push([i,j]);
      };
      if(cells>Math.max(64,grid.indices.length*2))grid.indices.forEach(candidate);
      else for(let x=0;x<=hi[0]-lo[0];x++)for(let y=0;y<=hi[1]-lo[1];y++)for(let z=0;z<=hi[2]-lo[2];z++)
        for(const j of grid.cells.get((lo[0]+x)+','+(lo[1]+y)+','+(lo[2]+z))??[])candidate(j);
    }
  });
  return pairs;
}

export function sphereContact(a,b,previous=null) {
  const p=prior(a,previous),q=prior(b,previous),r=q.map((x,k)=>x-p[k]);
  const d=b.position.map((x,k)=>x-q[k]-a.position[k]+p[k]),radius=a.radius+b.radius;
  const c=dot(r,r)-radius*radius,A=dot(d,d),B=2*dot(r,d);
  let t=0;
  if(c>0) {
    const disc=B*B-4*A*c;
    if(A===0 || disc<0)return null;
    t=(-B-Math.sqrt(disc))/(2*A);
    if(t<0 || t>1)return null;
  }
  const vector=r.map((x,k)=>x+t*d[k]),distance=norm(vector);
  return {t,normal:distance?vector.map(x=>x/distance):[1,0,0]};
}

export function collisionMode(a,b,globalMode) {
  if(a.collisionMode==='none' || b.collisionMode==='none')return 'none';
  const overrides=[a,b].filter(x=>x.collisionMode && x.collisionMode!=='inherit');
  overrides.sort((a,b)=>b.mass-a.mass || a.id.localeCompare(b.id));
  return overrides[0]?.collisionMode??globalMode??'none';
}
export function mergedBody(a,b) {
  const first=a.mass>=b.mass?a:b,second=first===a?b:a,total=a.mass+b.mass;
  const locked=a.locked||b.locked,pin=a.locked?a:b;
  return {...first,mass:total,radius:Math.cbrt(a.radius**3+b.radius**3),density:null,locked,
    parentId:first.parentId===second.id?second.parentId:first.parentId,
    position:locked?[...pin.position]:a.position.map((x,k)=>(x*a.mass+b.position[k]*b.mass)/total),
    velocity:locked?[0,0,0]:physicalVelocity(a).map((x,k)=>(x*a.mass+physicalVelocity(b)[k]*b.mass)/total)};
}

function bounce(a,b,contact,previous,dt,restitution) {
  const nextA={...a,position:[...a.position],velocity:[...a.velocity]},nextB={...b,position:[...b.position],velocity:[...b.velocity]};
  const va=physicalVelocity(a),vb=physicalVelocity(b),n=contact.normal;
  const relative=dot(vb.map((x,k)=>x-va[k]),n);
  let wa=a.locked?0:1/(a.mass||1),wb=b.locked?0:1/(b.mass||1);
  if(!source(a)){wa=a.locked?0:1;wb=0;}
  if(!source(b)){wb=b.locked?0:1;wa=0;}
  const total=wa+wb;if(!total)return [nextA,nextB];
  if(relative<0) {
    const impulse=-(1+restitution)*relative/total;
    for(let k=0;k<3;k++){if(wa)nextA.velocity[k]=va[k]-impulse*wa*n[k];if(wb)nextB.velocity[k]=vb[k]+impulse*wb*n[k];}
    if(previous)for(const [old,next,w] of [[a,nextA,wa],[b,nextB,wb]])if(w) {
      const start=prior(old,previous);
      next.position=start.map((x,k)=>x+contact.t*(old.position[k]-x)+(1-contact.t)*dt*next.velocity[k]);
    }
  }
  const separation=nextB.position.map((x,k)=>x-nextA.position[k]);
  const distance=norm(separation),penetration=a.radius+b.radius-distance;
  if(penetration>=0) {
    const axis=distance?separation.map(x=>x/distance):n;
    for(let k=0;k<3;k++){nextA.position[k]-=axis[k]*(penetration+1e-9)*wa/total;nextB.position[k]+=axis[k]*(penetration+1e-9)*wb/total;}
  }
  return [nextA,nextB];
}

// emit receives immutable before/after lists, allowing exact event accounting.
export function resolveCollisions(bodies,settings,previous,dt,emit=()=>{},serial=0) {
  if(settings.collisionMode==='none'&&!bodies.some(b=>b.collisionMode&&!['none','inherit'].includes(b.collisionMode)))return bodies;
  const initial=bodies,used=new Set();let events=0;
  const contacts=collisionCandidates(initial,previous).map(([i,j])=>({a:initial[i],b:initial[j],contact:sphereContact(initial[i],initial[j],previous)}))
    .filter(x=>x.contact).sort((a,b)=>a.contact.t-b.contact.t || a.a.id.localeCompare(b.a.id));
  for(const {a,b,contact} of contacts) {
    if(used.has(a.id)||used.has(b.id)||events>=64 || (a.locked&&b.locked))continue;
    const mode=collisionMode(a,b,settings.collisionMode);
    if(mode==='none')continue;
    let replacements,kind=mode,message;
    if(mode==='bounce') replacements=bounce(a,b,contact,previous,dt,settings.restitution??0.8);
    else if(!source(a)||!source(b)) {
      replacements=[source(a)?a:b];kind='absorb';message='Passive tracer removed on impact';
    } else {
      const seed=mergedBody(a,b),relative=b.velocity.map((x,k)=>x-a.velocity[k]);
      const impact=0.5*a.mass*b.mass/(a.mass+b.mass)*norm(relative)**2;
      const g=G*(settings.gMultiplier??1),binding=3*g/5*(a.mass*a.mass/a.radius+b.mass*b.mass/b.radius);
      const count=Math.min(settings.fragmentCount??8,debrisCapacity(bodies,[a,b]),Math.floor(seed.mass/((settings.fragmentMinMass??1)*2)));
      if(mode==='fragment' && impact>binding && !seed.locked && count>=2) {
        replacements=makeDebris(seed,count,relative,Math.sqrt(2*(impact-binding)/seed.mass),serial+events,bodies,settings);
        message='Impact exceeded binding energy; resolved massive debris';
      } else {replacements=[seed];kind='merge';message=mode==='fragment'?'Below disruption threshold or fragment capacity; merged':'Mass and COM momentum combined';}
    }
    const next=replaceBodies(bodies,[a,b],replacements);
    emit(bodies,next,{kind,bodyIds:[a.id,b.id],message:a.name+' + '+b.name+': '+(message??'restitution '+settings.restitution)});
    bodies=next;used.add(a.id);used.add(b.id);events++;
  }
  return bodies;
}
