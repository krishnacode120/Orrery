import {G,add,sub,scale,norm,unit,cross,dot,DAY} from './units.js';
import {sphereOfInfluence} from './transfers.js';
import {G0,rocketMass,burnVector,rotateAxis} from './vehicles.js';
export function deltaVBudget(r) {
 if(!r)return {stages:[],total:0};
 const stages=r.stages.slice(r.stage).map((st,i)=>{
  const upper=r.payloadMass+r.stages.slice(r.stage+i+1).reduce((m,x)=>m+x.dryMass+x.fuel,0);
  return st.isp*G0*Math.log((upper+st.dryMass+st.fuel)/(upper+st.dryMass));
 });return {stages,total:stages.reduce((s,x)=>s+x,0)};
}
export function applyFuelBurn(body,dv) {
 const r=body.rocket;if(!r)throw new Error('A rocket engine and propellant are required');
 const st=r.stages[r.stage],speed=norm(dv),before=rocketMass(r),used=before*(1-Math.exp(-speed/(st.isp*G0)));
 if(used>st.fuel+1e-8)throw new Error('Insufficient propellant in active stage for this burn');
 st.fuel=Math.max(0,st.fuel-used);body.mass=rocketMass(r);body.velocity=add(body.velocity,dv);
 return used;
}
export function attitude(body,primary,mode) {
 if(mode==='hold')return body.rocket?.orientation??body.spacecraft?.orientation??[1,0,0];
 return unit(burnVector(body,primary,{direction:mode,deltaV:1,vector:[1,0,0]}));
}
// Parent changes affect analysis/reference frames only, not the all-body gravity solver.
export function flightEvents(s,dt,notify) {
 if(dt<=0)return;
 const vehicles=s.bodies.filter(b=>b.spacecraft||b.rocket);if(!vehicles.length)return;
 const candidates=s.bodies.filter(b=>!b.massless&&b.mass>0),sois=new Map(candidates.map(b=>[b.id,sphereOfInfluence(b,s.bodies,s.settings)]));
 for(const b of vehicles){
  const previous=s.bodies.find(x=>x.id===b.parentId),inside=candidates.filter(p=>p.id!==b.id&&sois.get(p.id)&&norm(sub(b.position,p.position))<sois.get(p.id)*.995).sort((a,c)=>sois.get(a.id)-sois.get(c.id));
  const primary=inside[0]??candidates.filter(p=>p.type==='star').sort((a,c)=>c.mass-a.mass)[0]??previous;
  if(primary&&previous&&primary.id!==previous.id){
   notify('soi',b.name+': exited '+previous.name+' influence; entered '+primary.name+' influence',[b.id,primary.id]);b.parentId=primary.id;
  }
  if(!primary)continue;
  if(b.locked&&b.metadata.surfaceBound){const local=rotateAxis(sub(b.position,primary.position),primary.spin.axis,2*Math.PI/primary.spin.period*dt);b.position=add(primary.position,local);b.velocity=add(primary.velocity,cross(scale(unit(primary.spin.axis),2*Math.PI/primary.spin.period),local));continue;}
  const r=sub(b.position,primary.position),v=sub(b.velocity,primary.velocity),radial=dot(r,v)/Math.max(norm(r),1);
  const data=b.metadata.flight??{},old=data.radial;
  if(old!=null&&s.jd-(data.lastApsisJD??0)>.0001&&old*radial<0){
   notify('apsis',b.name+(old<0?' passed periapsis':' passed apoapsis')+' around '+primary.name,[b.id,primary.id]);data.lastApsisJD=s.jd;
  }
  data.radial=radial;b.metadata.flight=data;
  const vehicle=b.rocket??b.spacecraft;
  if(vehicle.attitudeMode&&vehicle.attitudeMode!=='launch')vehicle.orientation=attitude(b,primary,vehicle.attitudeMode);
  if(vehicle.landingEnabled&&norm(r)<=primary.radius+b.radius&&!b.locked){
   const omega=2*Math.PI/primary.spin.period,ground=add(primary.velocity,cross(scale(unit(primary.spin.axis),omega),r)),relative=sub(b.velocity,ground);
   const safe=norm(relative)<(vehicle.landingSpeed??5);
   b.position=add(primary.position,scale(unit(r),primary.radius+b.radius));b.velocity=ground;b.locked=true;b.metadata.surfaceBound=primary.id;
   if(b.rocket){b.rocket.engineOn=false;b.rocket.phase=safe?'landed':'crashed';}
   notify('landing',b.name+(safe?' landed on ':' impacted ')+primary.name+' at '+norm(relative).toFixed(1)+' m/s',[b.id,primary.id]);
  }
 }
}
