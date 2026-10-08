import {it,expect} from 'vitest';
import {RenderInterpolator} from '../rendering/interpolation.js';
import {TrailRing} from '../rendering/trails.js';
import {body} from '../physics/body.js';
import {DAY,norm} from '../physics/units.js';
const frame=(jd,x,axis=[1,0,0])=>({jd,bodies:[body({id:'vehicle',position:[x,0,0],spacecraft:{orientation:axis}})],view:{}});
it('render interpolation is visual-only and returns identical poses at equal elapsed times across frame rates',()=>{
 const old=frame(2451545,0),current=frame(2451545+1/DAY,100),copy=structuredClone(current);
 for(const fps of [30,60,120,144]){const smooth=new RenderInterpolator();smooth.publish(old,1,0);smooth.publish(current,1,1);let sample;for(let i=0;i<=fps/2;i++)sample=smooth.sample(current,{revision:1,now:1+i/fps});sample=smooth.sample(current,{revision:1,now:1.125});expect(sample.bodies[0].position[0]).toBeCloseTo(50,10);}
 expect(current).toEqual(copy);
});
it('pause and edit revisions snap to authoritative poses without extrapolation',()=>{
 const a=frame(2451545,0),b=frame(2451545+1/DAY,100),smooth=new RenderInterpolator();smooth.publish(a,1,0);smooth.publish(b,1,.05);expect(smooth.sample(b,{revision:1,now:.06,paused:true})).toBe(b);expect(smooth.sample(b,{revision:2,now:.06})).toBe(b);expect(smooth.sample(b,{revision:1,now:20}).bodies[0].position[0]).toBe(100);
});
it('opposite vehicle attitudes use quaternion interpolation rather than a zero-vector flip',()=>{
 const a=frame(2451545,0,[1,0,0]),b=frame(2451545+1/DAY,1,[-1,0,0]),smooth=new RenderInterpolator();smooth.publish(a,1,0);smooth.publish(b,1,.1);const middle=smooth.sample(b,{revision:1,now:.15}).bodies[0].spacecraft.orientation;expect(norm(middle)).toBeCloseTo(1,12);expect(Math.abs(middle[0])).toBeLessThan(1e-10);expect(b.bodies[0].spacecraft.orientation).toEqual([-1,0,0]);
});
it('history rings are capped, adapt sampling, ignore pauses and reset on time-direction changes',()=>{
 const trail=new TrailRing(4);for(let i=0;i<10;i++)trail.append(2451545+i/DAY,[i,0,0]);expect(trail.values().map(p=>p.position[0])).toEqual([6,7,8,9]);expect(trail.append(2451545+9/DAY,[99,0,0])).toBe(false);
 trail.append(2451545+8/DAY,[8,0,0]);expect(trail.values()).toHaveLength(1);trail.append(2451545+7/DAY,[7,0,0]);expect(trail.values()).toHaveLength(2);
 const adaptive=new TrailRing(8);adaptive.append(2451545,[0,0,0]);expect(adaptive.append(2451545+1/DAY,[.01,0,0],{minDistance:10,maxInterval:100})).toBe(false);
});
