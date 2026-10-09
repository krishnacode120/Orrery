import {Vector3} from 'three';
import {AU,G,add,sub,scale,norm,dot,unit} from '../physics/units.js';
import {derivedOrbit,stateFromElements} from '../physics/orbital.js';
import {lookQuaternion,toSI} from './model.js';

export {OVERVIEW_DIRECTION} from './settings.js';

// Screen fractions are display-only. Neither camera fitting nor UI occlusion
// changes authoritative positions, radii, orbital elements or the worker epoch.
export function viewportWindow(width,height,insets={}) {
 const w=Math.max(1,width),h=Math.max(1,height);
 let left=Math.max(0,insets.left??0),right=Math.max(0,insets.right??0);
 let top=Math.max(0,insets.top??0),bottom=Math.max(0,insets.bottom??0);
 if(left+right>w*.7){const f=w*.7/(left+right);left*=f;right*=f;}
 if(top+bottom>h*.7){const f=h*.7/(top+bottom);top*=f;bottom*=f;}
 const usableWidth=w-left-right,usableHeight=h-top-bottom;
 return {screenCenter:[(left-right)/w,(top-bottom)/h],
  widthFraction:usableWidth/w,heightFraction:usableHeight/h,aspect:usableWidth/usableHeight};
}
export function windowFov(fov,heightFraction=1){
 return 2*Math.atan(Math.tan(fov*Math.PI/360)*heightFraction)*180/Math.PI;
}
export function fitPoints(points,target,direction,fov,aspect=1,coverage=.86) {
 const dir=unit(direction),q=lookQuaternion(add(target,dir),target);
 const right=toSI(new Vector3(1,0,0).applyQuaternion(q));
 const up=toSI(new Vector3(0,1,0).applyQuaternion(q));
 const vertical=Math.tan(fov*Math.PI/360)*coverage;
 const horizontal=vertical*Math.max(.05,aspect);
 let distance=1;
 for(const {position,radius=0} of points) {
  const relative=sub(position,target),depth=dot(relative,dir);
  distance=Math.max(distance,
   depth+Math.abs(dot(relative,right))/horizontal+radius*Math.hypot(1,1/horizontal),
   depth+Math.abs(dot(relative,up))/vertical+radius*Math.hypot(1,1/vertical),
   depth+radius*1.1);
 }
 return distance;
}
export function overviewPoints(context,region='all'){
 let bodies=context.bodies.filter(b=>b.visible!==false&&!b.disrupted&&!b.massless&&b.type!=='moon');
 const star=[...bodies].filter(b=>b.type==='star').sort((a,b)=>b.mass-a.mass)[0];
 if(region==='inner'&&star){
  const inner=bodies.filter(b=>b===star||norm(sub(b.position,star.position))<=3*AU);
  if(inner.length>1)bodies=inner;
 }
 const points=bodies.map(b=>({position:b.position,radius:context.radiusFor(b)*(b.rings?b.rings.outer/b.radius:1)}));
 if(context.orbits!==false)for(const b of bodies.slice(0,50)){
  const {elements:o,primary}=derivedOrbit(b,context.bodies,context.settings);
  if(!primary||!o||!(o.a>0)||o.e>=1)continue;
  for(let k=0;k<96;k++)points.push({position:add(primary.position,
   stateFromElements({...o,M:k/96*Math.PI*2},G*(context.settings?.gMultiplier??1)*(primary.mass+(b.massless?0:b.mass))).position)});
 }
 return {bodies,points};
}
