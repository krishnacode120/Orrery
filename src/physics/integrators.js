import { G, cross, norm } from './units.js';
import { buildOctree, treeAcceleration } from './barnesHut.js';
import { addRelativity } from './relativity.js';

export function accelerations(bodies, settings={}) {
  const g=G*(settings.gMultiplier??1), eps=settings.softening??0;
  const result=bodies.map(()=>[0,0,0]), sources=[], tracers=[];
  bodies.forEach((b,i)=>(!b.massless && b.mass>0?sources:tracers).push(i));
  function pair(i,j,mutual) {
    const p=bodies[i].position,q=bodies[j].position;
    const dx=q[0]-p[0],dy=q[1]-p[1],dz=q[2]-p[2];
    const r2=dx*dx+dy*dy+dz*dz+eps*eps;
    if(!r2)throw new Error('Coincident bodies require positive softening');
    const f=g/(r2*Math.sqrt(r2));
    result[i][0]+=f*bodies[j].mass*dx;result[i][1]+=f*bodies[j].mass*dy;result[i][2]+=f*bodies[j].mass*dz;
    if(mutual) {
      result[j][0]-=f*bodies[i].mass*dx;result[j][1]-=f*bodies[i].mass*dy;result[j][2]-=f*bodies[i].mass*dz;
    }
  }
  for(let a=0;a<sources.length;a++)for(let b=a+1;b<sources.length;b++)pair(sources[a],sources[b],true);
  if((settings.solver==='tree'||(settings.solver!=='direct'&&bodies.length>500)) && settings.theta!==0) {
    const tree=buildOctree(sources.map(i=>bodies[i]));
    for(const i of tracers)result[i]=treeAcceleration(tree,bodies[i].position,g,eps,settings.theta??0.5);
  } else for(const i of tracers)for(const j of sources)pair(i,j,false);
  if(settings.gr && g>0)addRelativity(bodies,sources,result,g,settings.c);
  return result;
}

export function accelerationTimestep(bodies, settings, a=accelerations(bodies,settings)) {
  let dt=Infinity;
  for(let i=0;i<bodies.length;i++) {
    const magnitude=norm(a[i]);
    if(!bodies[i].locked && magnitude>0)dt=Math.min(dt,(settings.eta??0.2)*Math.sqrt(settings.softening/magnitude));
  }
  return Math.min(settings.stepSeconds??Infinity,dt);
}

// Newtonian kick-drift-kick is unchanged from Phase 1. Velocity-dependent GR
// uses a converged implicit endpoint half-kick; its map is not symplectic.
export function verlet(bodies,dt,settings={}) {
  let a=accelerations(bodies,settings);
  bodies.forEach((b,i)=>{
    if(b.locked)return;
    for(let k=0;k<3;k++){b.velocity[k]+=dt*a[i][k]/2;b.position[k]+=dt*b.velocity[k];}
  });
  if(!settings.gr) {
    a=accelerations(bodies,settings);
    bodies.forEach((b,i)=>{if(!b.locked)for(let k=0;k<3;k++)b.velocity[k]+=dt*a[i][k]/2;});
    return;
  }
  const half=bodies.map(b=>[...b.velocity]);
  for(let iteration=0;iteration<16;iteration++) {
    a=accelerations(bodies,settings);let error=0;
    bodies.forEach((b,i)=>{if(!b.locked)for(let k=0;k<3;k++) {
      const v=half[i][k]+dt*a[i][k]/2;
      error=Math.max(error,Math.abs(v-b.velocity[k])/(1+Math.abs(v)));b.velocity[k]=v;
    }});
    if(error<1e-12)return;
  }
  throw new Error('GR Verlet half-kick did not converge; reduce timestep or select Dormand–Prince');
}

function stages(bodies,dt,settings,table) {
  const y=new Float64Array(bodies.length*6);
  bodies.forEach((b,i)=>{y.set(b.position,i*6);y.set(b.velocity,i*6+3);});
  const trial=bodies.map(b=>({...b,position:[...b.position],velocity:[...b.velocity]})), slopes=[];
  for(const row of table) {
    trial.forEach((b,i)=>{for(let k=0;k<6;k++) {
      let value=y[i*6+k];
      for(let j=0;j<row.length;j++)value+=dt*row[j]*slopes[j][i*6+k];
      (k<3?b.position:b.velocity)[k%3]=value;
    }});
    const a=accelerations(trial,settings), slope=new Float64Array(y.length);
    trial.forEach((b,i)=>{if(!b.locked){slope.set(b.velocity,i*6);slope.set(a[i],i*6+3);}});
    slopes.push(slope);
  }
  return {y,slopes};
}
function combine(y,slopes,weights,dt) {
  const result=y.slice();
  for(let j=0;j<weights.length;j++)if(weights[j])for(let k=0;k<y.length;k++)result[k]+=dt*weights[j]*slopes[j][k];
  return result;
}
function commit(bodies,y) {
  if(!y.every(Number.isFinite))throw new Error('Non-finite integrator state; reduce timestep');
  bodies.forEach((b,i)=>{for(let k=0;k<3;k++){b.position[k]=y[i*6+k];b.velocity[k]=y[i*6+k+3];}});
}
export function rk4(bodies,dt,settings={}) {
  const {y,slopes}=stages(bodies,dt,settings,[[],[1/2],[0,1/2],[0,0,1]]);
  commit(bodies,combine(y,slopes,[1/6,1/3,1/3,1/6],dt));
}

const DP_A=[[],[1/5],[3/40,9/40],[44/45,-56/15,32/9],
  [19372/6561,-25360/2187,64448/6561,-212/729],
  [9017/3168,-355/33,46732/5247,49/176,-5103/18656],
  [35/384,0,500/1113,125/192,-2187/6784,11/84]];
const DP_5=[35/384,0,500/1113,125/192,-2187/6784,11/84,0];
const DP_4=[5179/57600,0,7571/16695,393/640,-92097/339200,187/2100,1/40];

// One accepted fifth-order step, possibly shorter than requested. Rejected
// trials never mutate the authoritative bodies or simulation clock.
export function dormandPrince(bodies,requested,settings={}) {
  let dt=requested;
  const minimum=Math.min(Math.abs(requested),settings.minStep??1e-6);
  for(let rejected=0;rejected<24;rejected++) {
    const {y,slopes}=stages(bodies,dt,settings,DP_A);
    const high=combine(y,slopes,DP_5,dt),low=combine(y,slopes,DP_4,dt);
    let error=0;
    for(let k=0;k<y.length;k++) {
      const atol=k%6<3?(settings.positionTolerance??1):(settings.velocityTolerance??1e-4);
      const scale=atol+(settings.rtol??1e-9)*Math.max(Math.abs(y[k]),Math.abs(high[k]));
      error=Math.max(error,Math.abs(high[k]-low[k])/scale);
    }
    if(!Number.isFinite(error))throw new Error('Dormand–Prince produced a non-finite error estimate');
    const factor=error===0?5:Math.max(0.1,Math.min(5,0.9*error**(-0.2)));
    if(error<=1) {commit(bodies,high);return {dt,nextStep:Math.abs(dt)*factor,rejected,error};}
    if(Math.abs(dt)<=minimum*(1+1e-12))throw new Error('Tolerance requires a step below the minimum; lower minimum step or relax tolerance');
    dt=Math.sign(dt)*Math.max(minimum,Math.abs(dt)*Math.min(0.9,factor));
  }
  throw new Error('Dormand–Prince rejection limit reached');
}

export function diagnostics(bodies,settings={}) {
  const g=G*(settings.gMultiplier??1),eps=settings.softening??0;
  const sources=bodies.filter(b=>!b.massless && b.mass>0);
  let energy=0,mass=0;const momentum=[0,0,0],angular=[0,0,0],center=[0,0,0];
  sources.forEach((b,i)=>{
    mass+=b.mass; const velocity=b.locked?[0,0,0]:b.velocity;
    energy+=0.5*b.mass*norm(velocity)**2;const h=cross(b.position,velocity);
    for(let k=0;k<3;k++){momentum[k]+=b.mass*velocity[k];angular[k]+=b.mass*h[k];center[k]+=b.mass*b.position[k];}
    for(let j=i+1;j<sources.length;j++)energy-=g*b.mass*sources[j].mass/Math.hypot(...b.position.map((x,k)=>x-sources[j].position[k]),eps);
  });
  const externalConstraints=sources.some(b=>b.locked);
  return {energy,mass,momentum,angular,center:center.map(x=>mass?x/mass:0),externalConstraints,
    conservationReliable:!externalConstraints && !settings.gr};
}
