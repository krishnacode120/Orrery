import {Quaternion,Vector3} from 'three';
const lerp=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
export class RenderInterpolator{
 constructor(){this.current=null;this.previous=null;this.received=0;this.interval=1/30;this.revision=null;this.old=new Map();}
 publish(s,revision,now){
  if(this.revision!==revision||!this.current){this.previous=s;this.current=s;this.received=now;this.revision=revision;this.old=new Map(s.bodies.map(b=>[b.id,b]));return;}
  if(s.jd===this.current.jd){this.current=s;return;}
  this.interval=Math.max(1/144,Math.min(.25,now-this.received));this.previous=this.current;this.old=new Map(this.previous.bodies.map(b=>[b.id,b]));this.current=s;this.received=now;
 }
 sample(s,{revision,now,paused=false,reducedMotion=false}){
  if(!this.current||this.revision!==revision||paused||reducedMotion||s.bodies!==this.current.bodies)return s;
  const t=Math.max(0,Math.min(1,(now-this.received)/this.interval)),old=this.old;
  if(t===1)return s;
  const bodies=s.bodies.map(b=>{
   let p=old.get(b.id);if(!p&&b.metadata?.separatedStage)p=old.get(b.metadata.separatedStage.parentId);
   if(!p)return b;const result={...b,position:lerp(p.position,b.position,t)};
   if(b.metadata?.separatedStage){const a=p.rocket?.orientation??p.metadata?.separatedStage?.orientation,c=b.metadata.separatedStage.orientation;if(a&&c){const q=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(...a).normalize()),goal=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(...c).normalize());result.metadata={...b.metadata,separatedStage:{...b.metadata.separatedStage,orientation:new Vector3(0,1,0).applyQuaternion(q.slerp(goal,t)).toArray()}};}}
   for(const key of ['rocket','spacecraft'])if(b[key]&&p[key]){const a=p[key].orientation,c=b[key].orientation;if(a&&c){
    const from=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(...a).normalize()),to=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(...c).normalize()),direction=new Vector3(0,1,0).applyQuaternion(from.slerp(to,t)).toArray();result[key]={...b[key],orientation:direction};
   }}
   return result;
  });
  return {...s,jd:this.previous.jd+(s.jd-this.previous.jd)*t,bodies};
 }
}
