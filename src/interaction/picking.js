import {Ray,Vector3,Sphere} from 'three';
export function pickBody(candidates,rayOrigin,rayDirection,pointer,helperRadius=11){
 const ray=new Ray(new Vector3(...rayOrigin),new Vector3(...rayDirection).normalize()),hits=[],helpers=[];
 for(const c of candidates){
  if(!c.inFront)continue;
  const center=new Vector3(...c.position),hit=ray.intersectSphere(new Sphere(center,c.radius),new Vector3());
  const screenDistance=Math.hypot(c.screen[0]-pointer[0],c.screen[1]-pointer[1]);
  if(hit)hits.push({...c,distance:hit.distanceTo(ray.origin),screenDistance,method:'surface'});
  else if(screenDistance<=helperRadius)helpers.push({...c,distance:center.distanceTo(ray.origin),screenDistance,method:'screen target'});
 }
 hits.sort((a,b)=>a.distance-b.distance||a.screenDistance-b.screenDistance||a.id.localeCompare(b.id));
 helpers.sort((a,b)=>a.screenDistance-b.screenDistance||a.distance-b.distance||a.id.localeCompare(b.id));
 return hits[0]??helpers[0]??null;
}
