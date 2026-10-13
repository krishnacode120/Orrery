import {AU,norm,sub} from './units.js';
// Diagnostics only, never clamps or corrects authoritative state.
const ranges={mercury:[.30,.48],venus:[.70,.74],earth:[.97,1.03],mars:[1.37,1.68],jupiter:[4.8,5.6],saturn:[8.8,10.3],uranus:[18,20.5],neptune:[29,31]};
export function positionSanity(s){
 const warnings=[],ids=new Set(),sun=s.bodies.find(b=>b.id==='sun'),planets=[];
 for(const b of s.bodies){
  if(ids.has(b.id))warnings.push('Duplicate body ID: '+b.id);ids.add(b.id);
  if(![...b.position,...b.velocity].every(Number.isFinite))warnings.push(b.id+': non-finite SI state');
  if(s.mode==='reality'&&sun&&ranges[b.id]){
   const distance=norm(sub(b.position,sun.position))/AU,[lo,hi]=ranges[b.id];
   if(distance<lo||distance>hi)warnings.push(b.id+': heliocentric distance '+distance+' AU outside expected Reality range');
   planets.push(b);
  }
 }
 for(let i=0;i<planets.length;i++)for(let j=i+1;j<planets.length;j++){
  const a=planets[i],b=planets[j];
  if(norm(sub(a.position,b.position))<=a.radius+b.radius)warnings.push(a.id+' / '+b.id+': overlapping physical centres/surfaces');
 }
 return warnings;
}
