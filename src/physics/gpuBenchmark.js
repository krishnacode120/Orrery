import {GPUGravity,advanceTracersCPU} from './gpuGravity.js';
import {AU,DAY,G,SOLAR_MASS,sub,norm} from './units.js';
import {randomSeed} from './scientific.js';
export async function benchmarkGPU(count=10000){
 if(!Number.isInteger(count)||count<1||count>100000)throw new Error('GPU benchmark limited to 100,000 tracers');
 const gpu=new GPUGravity();if(!await gpu.initialize())return {available:false,reason:gpu.reason};
 try{
 const rand=randomSeed(42),sources=[{position:[0,0,0],mass:SOLAR_MASS},...Array.from({length:49},(_,i)=>({position:[Math.cos(i)*AU*5,Math.sin(i)*AU*5,0],mass:1e24}))];
 const particles=Array.from({length:count},()=>{const angle=rand()*2*Math.PI,r=AU*(2+rand()),v=Math.sqrt(G*SOLAR_MASS/r);return {position:[r*Math.cos(angle),r*Math.sin(angle),0],velocity:[-v*Math.sin(angle),v*Math.cos(angle),0]};});
 const cpu=structuredClone(particles.slice(0,256)),p={gMultiplier:1,softening:1000},dt=1800;
 const measurement=await gpu.advance(particles,sources,sources,dt,p);
 advanceTracersCPU(cpu,sources,sources,dt,p);
 const errors=cpu.map((b,i)=>({position:norm(sub(b.position,particles[i].position)),velocity:norm(sub(b.velocity,particles[i].velocity))}));
 return {available:true,count,sources:sources.length,...measurement,maxPositionErrorMeters:Math.max(...errors.map(x=>x.position)),maxVelocityErrorMetersPerSecond:Math.max(...errors.map(x=>x.velocity)),comparisonSamples:cpu.length,model:'One GPU Verlet step in a frozen 50-source field, including upload/readback; CPU Float64 comparison of first 256 tracers. This does not measure renderer FPS.'};
 }finally{gpu.dispose();}
}
