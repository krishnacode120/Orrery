import {AU,DAY,G,add,sub,norm} from './units.js';
export const TRACER_SHADER=`
struct Particle { p: vec4<f32>, v: vec4<f32> };
struct Source { old: vec4<f32>, next: vec4<f32> };
struct Params { dt: f32, softening: f32, count: u32, sources: u32 };
@group(0) @binding(0) var<storage,read> particles: array<Particle>;
@group(0) @binding(1) var<storage,read> sources: array<Source>;
@group(0) @binding(2) var<storage,read_write> output: array<Particle>;
@group(0) @binding(3) var<uniform> params: Params;
fn acceleration(p:vec3<f32>, endpoint:bool)->vec3<f32>{
 var a=vec3<f32>(0.0);
 for(var j=0u;j<params.sources;j++){var s=sources[j].old;if(endpoint){s=sources[j].next;}
  let r=s.xyz-p;let d=dot(r,r)+params.softening*params.softening;
  a+=s.w*r/(d*sqrt(d));
 }return a;
}
@compute @workgroup_size(128)
fn main(@builtin(global_invocation_id) id:vec3<u32>){
 let i=id.x;if(i>=params.count){return;}
 let p=particles[i].p.xyz;let half=particles[i].v.xyz+0.5*params.dt*acceleration(p,false);
 let next=p+params.dt*half;let v=half+0.5*params.dt*acceleration(next,true);
 output[i]=Particle(vec4<f32>(next,0.0),vec4<f32>(v,0.0));
}`;
export function gpuEligibility(s){
 const p=s.settings;
 if(s.mode!=='sandbox')return 'Reality uses ephemerides';
 if(p.integrator!=='verlet'||p.adaptive||p.gr)return 'GPU tracers require fixed Newtonian Verlet';
 if(p.collisionMode!=='none'||p.roche)return 'GPU tracers require collisions and tides disabled';
 if(s.bodies.some(b=>b.rocket||b.spacecraft||b.blackHole||b.wormhole))return 'Vehicles and exotic interactions use CPU';
 if(s.maneuvers.some(x=>!x.executed)||s.experimentEvents.some(x=>!x.executed))return 'Scheduled events use CPU';
 return null;
}
export function advanceTracersCPU(tracers,oldSources,newSources,dt,p){
 const acceleration=(r,sources)=>{const a=[0,0,0];for(const s of sources){const d=sub(s.position,r),r2=d.reduce((sum,x)=>sum+x*x,0)+p.softening**2,f=G*p.gMultiplier*s.mass/(r2*Math.sqrt(r2));for(let k=0;k<3;k++)a[k]+=f*d[k];}return a;};
 for(const b of tracers){if(b.locked)continue;const a=acceleration(b.position,oldSources);for(let k=0;k<3;k++){b.velocity[k]+=dt*a[k]/2;b.position[k]+=dt*b.velocity[k];}const next=acceleration(b.position,newSources);for(let k=0;k<3;k++)b.velocity[k]+=dt*next[k]/2;}
}
export class GPUGravity{
 constructor(){this.device=null;this.reason='Not probed';this.available=false;this.capacity=0;}
 async initialize(gpu=globalThis.navigator?.gpu){
  if(!gpu){this.reason='WebGPU unavailable in this browser/worker';return false;}
  try{const adapter=await gpu.requestAdapter();if(!adapter)throw new Error('No GPU adapter');this.device=await adapter.requestDevice();this.device.lost.then(info=>{this.available=false;this.reason='GPU device lost: '+info.message;});
   const module=this.device.createShaderModule({code:TRACER_SHADER});this.pipeline=await this.device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'main'}});
   this.available=true;this.reason='WebGPU compute available';return true;
  }catch(e){this.available=false;this.reason=e.message;return false;}
 }
 allocate(n,m){
  if(n<=this.capacity&&m<=this.sourceCapacity)return;
  for(const b of this.buffers??[])b.destroy();
  const d=this.device,U=globalThis.GPUBufferUsage;
  this.capacity=Math.max(128,n);this.sourceCapacity=Math.max(1,m);
  this.input=d.createBuffer({size:this.capacity*32,usage:U.STORAGE|U.COPY_DST});
  this.sources=d.createBuffer({size:this.sourceCapacity*32,usage:U.STORAGE|U.COPY_DST});
  this.output=d.createBuffer({size:this.capacity*32,usage:U.STORAGE|U.COPY_SRC});
  this.readback=d.createBuffer({size:this.capacity*32,usage:U.MAP_READ|U.COPY_DST});
  this.params=d.createBuffer({size:16,usage:U.UNIFORM|U.COPY_DST});
  this.buffers=[this.input,this.sources,this.output,this.readback,this.params];
  this.bind=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[this.input,this.sources,this.output,this.params].map((buffer,binding)=>({binding,resource:{buffer}}))});
 }
 async advance(tracers,oldSources,newSources,dt,p){
  if(!this.available)throw new Error(this.reason);
  const started=performance.now(),origin=oldSources[0]?.position??[0,0,0],n=tracers.length,m=oldSources.length;if(!n)return {computeMs:0};
  this.allocate(n,m);
  const particles=new Float32Array(n*8),sources=new Float32Array(Math.max(1,m)*8);
  tracers.forEach((b,i)=>{particles.set(sub(b.position,origin).map(x=>x/AU),i*8);particles.set(b.velocity.map(x=>x*DAY/AU),i*8+4);});
  oldSources.forEach((b,i)=>{const mu=G*p.gMultiplier*b.mass*DAY**2/AU**3;sources.set([...sub(b.position,origin).map(x=>x/AU),mu,...sub(newSources[i].position,origin).map(x=>x/AU),mu],i*8);});
  const param=new ArrayBuffer(16),v=new DataView(param);v.setFloat32(0,dt/DAY,true);v.setFloat32(4,p.softening/AU,true);v.setUint32(8,n,true);v.setUint32(12,m,true);
  const d=this.device;d.queue.writeBuffer(this.input,0,particles);d.queue.writeBuffer(this.sources,0,sources);d.queue.writeBuffer(this.params,0,param);
  const encoder=d.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.bind);pass.dispatchWorkgroups(Math.ceil(n/128));pass.end();encoder.copyBufferToBuffer(this.output,0,this.readback,0,n*32);d.queue.submit([encoder.finish()]);
  await this.readback.mapAsync(globalThis.GPUMapMode.READ,0,n*32);
  const output=new Float32Array(this.readback.getMappedRange(0,n*32)).slice();this.readback.unmap();
  if(!output.every(Number.isFinite))throw new Error('GPU state overflow');
  tracers.forEach((b,i)=>{b.position=add(origin,Array.from(output.slice(i*8,i*8+3),x=>x*AU));b.velocity=Array.from(output.slice(i*8+4,i*8+7),x=>x*AU/DAY);});
  let extent=0;for(const b of tracers)extent=Math.max(extent,norm(sub(b.position,origin)));
  return {computeMs:performance.now()-started,bytes:n*96+m*32+16,positionResolutionMeters:extent*2**-23,model:'Float32 AU/day tracer Verlet; Float64 CPU massive sources'};
 }
 dispose(){this.buffers?.forEach(b=>b.destroy());this.device?.destroy();this.available=false;}
}
export async function advanceWithGPU(engine,seconds,gpu){
 const s=engine.s,p=s.settings,mode=p.computeMode??'cpu',reason=gpuEligibility(s),tracers=s.bodies.filter(b=>b.massless&&!b.locked);
 const eligible=mode!=='cpu'&&!reason&&gpu.available&&tracers.length>0&&(mode==='gpu'||tracers.length>=5000);
 if(!eligible||!seconds){const stats=engine.advance(seconds);return {...stats,computeMode:'Worker CPU',gpuAvailable:gpu.available,gpuReason:reason??gpu.reason};}
 const started=performance.now(),all=s.bodies,sources=all.filter(b=>!b.massless&&b.mass>0),oldSources=sources.map(b=>({position:[...b.position],mass:b.mass})),ids=new Set(tracers.map(b=>b.id));
 let stats;s.bodies=all.filter(b=>!ids.has(b.id));
 try{stats=engine.advance(Math.sign(seconds)*Math.min(Math.abs(seconds),p.stepSeconds),{deterministic:true,maxSteps:1});}
 finally{s.bodies=all;}
 let gpuStats;
 try{gpuStats=await gpu.advance(tracers,oldSources,sources,stats.advanced,p);}
 catch(error){gpu.available=false;gpu.reason=error.message;advanceTracersCPU(tracers,oldSources,sources,stats.advanced,p);}
 return {...stats,computeMs:performance.now()-started,limited:Math.abs(seconds-stats.advanced)>1e-6,computeMode:gpu.available?'GPU tracers + Worker CPU sources':'Worker CPU fallback',gpuAvailable:gpu.available,gpuReason:gpu.reason,gpu:gpuStats,gravity:gpu.available?'Direct CPU sources + direct GPU tracers':stats.gravity,warnings:[...stats.warnings,...(gpu.available?['GPU tracers use Float32 precision; unsuitable for precision spacecraft navigation.']:['GPU failure: continued the same step on CPU.'])]};
}
