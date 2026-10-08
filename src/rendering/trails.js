import {DAY,norm,sub} from '../physics/units.js';
export class TrailRing{
 constructor(capacity=512){this.capacity=Math.max(2,Math.min(1024,Math.floor(capacity)));this.points=new Array(this.capacity);this.head=0;this.count=0;this.direction=0;this.version=0;}
 clear(){this.head=0;this.count=0;this.version++;}
 append(jd,position,{duration=DAY*100,minDistance=0,maxInterval=duration/this.capacity}={}){
  const last=this.count?this.points[(this.head-1+this.capacity)%this.capacity]:null,dt=last?(jd-last.jd)*DAY:0;
  if(last&&dt===0)return false;if(last&&Math.sign(dt)!==this.direction&&this.direction){this.clear();}
  if(last&&(this.direction===0||Math.sign(dt)===this.direction)&&norm(sub(position,last.position))<minDistance&&Math.abs(dt)<maxInterval)return false;
  if(dt)this.direction=Math.sign(dt);this.points[this.head]={jd,position:[...position]};this.head=(this.head+1)%this.capacity;this.count=Math.min(this.capacity,this.count+1);this.version++;
  while(this.count&&Math.abs(jd-this.points[(this.head-this.count+this.capacity)%this.capacity].jd)*DAY>duration)this.count--;
  return true;
 }
 values(){return Array.from({length:this.count},(_,i)=>this.points[(this.head-this.count+i+this.capacity)%this.capacity]);}
}
