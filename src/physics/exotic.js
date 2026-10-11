import { G, norm, sub, add, scale, unit, cross, dot } from './units.js';
import { C } from './limits.js';
import { mergedBody, sphereContact } from './collisions.js';
import { replaceBodies, source } from './debris.js';
export const schwarzschild=(mass,settings={})=>2*G*(settings.gMultiplier??1)*mass/(settings.c??C)**2;
export function quaternionRotate(v,q=[0,0,0,1]) {
  const n=Math.hypot(...q)||1,[x,y,z,w]=q.map(x=>x/n),axis=[x,y,z];
  return add(v,add(scale(cross(axis,v),2*w),scale(cross(axis,cross(axis,v)),2)));
}
export function transformMouth(v,entry,exit) {
  const q=entry.wormhole.orientation??[0,0,0,1],inverse=[-q[0],-q[1],-q[2],q[3]];
  return quaternionRotate(quaternionRotate(v,inverse),exit.wormhole.orientation);
}
export function extremeEvents(bodies,settings,previous,dt,jd,emit) {
  for(const hole of bodies.filter(b=>b.type==='blackHole')) {
    for(const b of [...bodies]) {
      if(b.id===hole.id || b.type==='wormholeMouth'||!bodies.includes(b))continue;
      const radius=schwarzschild(hole.mass,settings);
      if(radius<=0||!sphereContact({...hole,radius},{...b,radius:0},previous))continue;
      let grown=source(b)?mergedBody(hole,b):{...hole};
      grown={...grown,id:hole.id,name:hole.name,type:'blackHole',parentId:hole.parentId,
        blackHole:{...hole.blackHole,accretedMass:(hole.blackHole?.accretedMass??0)+(source(b)?b.mass:0)}};
      grown.radius=schwarzschild(grown.mass,settings);
      const next=replaceBodies(bodies,[hole,b],[grown]);
      emit(bodies,next,{kind:'capture',bodyIds:[hole.id,b.id],message:hole.name+' absorbed '+b.name});
      bodies=next;Object.assign(hole,grown);
    }
  }
  const mouths=bodies.filter(b=>b.type==='wormholeMouth'&&b.wormhole);
  if(!mouths.length)return bodies;
  for(const b of [...bodies]) {
    if(b.locked||b.type==='wormholeMouth'||(b.portalCooldownJD??0)>jd)continue;
    for(const mouth of mouths) {
      const exit=bodies.find(x=>x.id===mouth.wormhole.pairId&&x.wormhole);
      if(!exit || !sphereContact({...mouth,radius:mouth.wormhole.throatRadius},{...b,radius:0},previous))continue;
      const transformed=transformMouth(sub(b.position,mouth.position),mouth,exit);
      const velocity=mouth.wormhole.transformVelocity?transformMouth(b.velocity,mouth,exit):[...b.velocity];
      const outward=norm(velocity)?unit(velocity):unit(transformed);
      const moved={...b,position:add(exit.position,scale(outward,exit.wormhole.throatRadius+b.radius+1)),
        velocity,spin:{...b.spin,axis:transformMouth(b.spin.axis,mouth,exit)},
        portalCooldownJD:jd+(mouth.wormhole.cooldown??10)/86400};
      const next=bodies.map(x=>x.id===b.id?moved:x);
      emit(bodies,next,{kind:'traverse',bodyIds:[b.id,mouth.id,exit.id],message:b.name+' traversed '+mouth.name+' → '+exit.name});
      bodies=next;break;
    }
  }
  return bodies;
}
