import { cross, norm } from './units.js';
import { MAX_BODIES, MAX_MASSIVE } from './limits.js';

export const source=b=>!b.massless && b.mass>0;
export function debrisCapacity(bodies,removed) {
  const ids=new Set(removed.map(b=>b.id)),remaining=bodies.filter(b=>!ids.has(b.id));
  const sourceCapacity=removed.some(source)?MAX_MASSIVE-remaining.filter(source).length:64;
  return Math.max(0,Math.min(64,MAX_BODIES-remaining.length,sourceCapacity));
}

// Resolved massive chunks retain the parent's total mass and COM momentum.
// Mirrored positions/velocities produce a deterministic elongated stream.
export function makeDebris(seed,count,direction,speed,serial,existing,options={}) {
  if(!(seed.mass>0))throw new Error('Resolved fragmentation requires positive physical mass');
  let axis=norm(direction)?direction.map(x=>x/norm(direction)):[1,0,0];
  const perpendicular=cross(axis,Math.abs(axis[2])<0.9?[0,0,1]:[0,1,0]);
  const pn=norm(perpendicular),normal=perpendicular.map(x=>x/pn);
  const radius=seed.radius/Math.cbrt(count),ids=new Set(existing.map(b=>b.id));
  const spread=Array.from({length:count},(_,i)=>i-(count-1)/2);
  const rms=Math.sqrt(spread.reduce((s,x)=>s+x*x,0)/count)||1;
  let randomState=(serial+1)*1234567;const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
  const weights=spread.map(()=>options.fragmentDistribution==='varied'?.5+random():1),sum=weights.reduce((a,b)=>a+b,0);
  const fragments=spread.map((offset,i)=>{
    let id=i===0?seed.id:'debris-'+serial+'-'+i;
    while(i!==0 && ids.has(id))id+='x';ids.add(id);
    return {...seed,id,name:seed.name+' debris '+(i+1),type:'asteroid',
      mass:seed.mass*weights[i]/sum,radius:seed.radius*Math.cbrt(weights[i]/sum),density:null,locked:false,massless:!!seed.massless,
      luminosity:0,atmosphere:null,rings:null,blackHole:null,wormhole:null,rocket:null,spacecraft:null,material:'debris',disrupted:true,
      // Debris has no unresolved solid-body collision/tidal model in this phase.
      collisionMode:'none',
      position:seed.position.map((x,k)=>x+offset*2.4*radius*axis[k]),
      velocity:seed.velocity.map((x,k)=>x+speed*(options.fragmentSpread??1)*(offset/rms*axis[k]+.2*(random()-.5)*normal[k])),
      spin:{...seed.spin,axis:[...seed.spin.axis]}};
  });
  const com=[0,0,0],momentum=[0,0,0];
  for(const f of fragments)for(let k=0;k<3;k++){com[k]+=f.mass*(f.position[k]-seed.position[k])/seed.mass;momentum[k]+=f.mass*(f.velocity[k]-seed.velocity[k])/seed.mass;}
  for(const f of fragments)for(let k=0;k<3;k++){f.position[k]-=com[k];f.velocity[k]-=momentum[k];}
  return fragments;
}

export function replaceBodies(bodies,removed,replacements) {
  const ids=new Set(removed.map(b=>b.id)),survivor=replacements[0]?.id??null;
  return [...bodies.filter(b=>!ids.has(b.id)).map(b=>ids.has(b.parentId)
    ?{...b,parentId:survivor===b.id?null:survivor}:b),...replacements.map(b=>({...b,parentId:ids.has(b.parentId)?null:b.parentId}))];
}
