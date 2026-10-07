import { DAY } from './units.js';
// Cubic Hermite interpolation preserves both endpoint positions and velocities.
export function interpolateVectors(samples,jd) {
  if(!samples?.length)throw new Error('No ephemeris samples');
  if(jd<samples[0].jd-1e-10 || jd>samples.at(-1).jd+1e-10)throw new Error('Outside Horizons playback coverage');
  let index=0;while(index<samples.length-2&&samples[index+1].jd<jd)index++;
  const a=samples[index],b=samples[index+1]??a,h=(b.jd-a.jd)*DAY;
  if(!h)return {position:[...a.position],velocity:[...a.velocity]};
  const t=(jd-a.jd)*DAY/h,t2=t*t,t3=t2*t;
  return {position:a.position.map((x,k)=>(2*t3-3*t2+1)*x+(t3-2*t2+t)*h*a.velocity[k]+(-2*t3+3*t2)*b.position[k]+(t3-t2)*h*b.velocity[k]),
    velocity:a.position.map((x,k)=>(6*t2-6*t)*x/h+(3*t2-4*t+1)*a.velocity[k]+(-6*t2+6*t)*b.position[k]/h+(3*t2-2*t)*b.velocity[k])};
}
