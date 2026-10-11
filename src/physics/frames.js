import {DAY,J2000,add,sub,scale,dot,cross,unit,norm} from './units.js';
export function rotateAxis(vector,axis,angle){const c=Math.cos(angle),s=Math.sin(angle),k=unit(axis);return add(add(scale(vector,c),scale(cross(k,vector),s)),scale(k,dot(k,vector)*(1-c)));}
export const FRAME_NAMES={heliocentric:'Sun-centered J2000 ecliptic',inertial:'J2000 ecliptic inertial',planet:'Planet-centered inertial · axes parallel to J2000 ecliptic',fixed:'Planet-fixed rotating · illustrative J2000 prime meridian',lvlh:'Spacecraft LVLH · radial / along-track / orbit normal',enu:'Local east / north / up',ned:'Local north / east / down'};
const project=(v,axes)=>axes.map(axis=>dot(v,axis));
const expand=(v,axes)=>axes.reduce((out,axis,k)=>add(out,scale(axis,v[k])),[0,0,0]);
export function planetRelative(state,primary){return {position:sub(state.position,primary.position),velocity:sub(state.velocity,primary.velocity),frame:'planet'};}
export function heliocentric(state,sun){return {...planetRelative(state,sun),frame:'heliocentric'};}
export function bodyAxes(primary){
 const north=unit(primary.spin.axis);let zero=unit(cross([0,1,0],north));
 if(norm(zero)<.1)zero=unit(cross([1,0,0],north));
 return [zero,unit(cross(north,zero)),north];
}
export function toBodyFixed(state,primary,jd){
 const relative=planetRelative(state,primary),omega=scale(unit(primary.spin.axis),2*Math.PI/primary.spin.period),angle=-(jd-J2000)*DAY*2*Math.PI/primary.spin.period;
 const axes=bodyAxes(primary);
 return {position:project(rotateAxis(relative.position,primary.spin.axis,angle),axes),
  velocity:project(rotateAxis(sub(relative.velocity,cross(omega,relative.position)),primary.spin.axis,angle),axes),frame:'fixed'};
}
export function fromBodyFixed(state,primary,jd){
 const angle=(jd-J2000)*DAY*2*Math.PI/primary.spin.period,axes=bodyAxes(primary),omega=scale(unit(primary.spin.axis),2*Math.PI/primary.spin.period);
 const r=rotateAxis(expand(state.position,axes),primary.spin.axis,angle);
 return {position:add(primary.position,r),velocity:add(primary.velocity,add(rotateAxis(expand(state.velocity,axes),primary.spin.axis,angle),cross(omega,r))),frame:'inertial'};
}
export function localAxes(vehicle,primary){
 const {position:r,velocity:v}=planetRelative(vehicle,primary),radial=unit(r),normal=unit(cross(r,v));
 if(norm(normal)<.5)throw new Error('LVLH is undefined for a radial or stationary trajectory');
 return [radial,unit(cross(normal,radial)),normal];
}
export function toLVLH(state,vehicle,primary){
 const axes=localAxes(vehicle,primary),r=sub(vehicle.position,primary.position),v=sub(vehicle.velocity,primary.velocity),omega=scale(cross(r,v),1/dot(r,r)),relative=sub(state.position,vehicle.position);
 return {position:project(relative,axes),velocity:project(sub(sub(state.velocity,vehicle.velocity),cross(omega,relative)),axes),frame:'lvlh'};
}
export function fromLVLH(state,vehicle,primary){
 const axes=localAxes(vehicle,primary),r=sub(vehicle.position,primary.position),v=sub(vehicle.velocity,primary.velocity),omega=scale(cross(r,v),1/dot(r,r)),relative=expand(state.position,axes);
 return {position:add(vehicle.position,relative),velocity:add(vehicle.velocity,add(expand(state.velocity,axes),cross(omega,relative))),frame:'inertial'};
}
export function localSurface(state,primary,jd,latitude,longitude,frame='enu'){
 const fixed=toBodyFixed(state,primary,jd),lat=latitude*Math.PI/180,lon=longitude*Math.PI/180;
 const east=[-Math.sin(lon),Math.cos(lon),0],up=[Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)],north=cross(up,east);
 const site=scale(up,primary.radius),axes=frame==='ned'?[north,east,scale(up,-1)]:[east,north,up];
 return {position:project(sub(fixed.position,site),axes),velocity:project(fixed.velocity,axes),frame};
}
