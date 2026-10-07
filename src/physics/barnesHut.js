// Only gravitational sources belong in this octree. Massless tracers query it.
// Bucket leaves and a depth limit make coincident sources well-defined.
export function buildOctree(sources) {
  if (!sources.length) return null;
  const lo = [Infinity,Infinity,Infinity], hi = [-Infinity,-Infinity,-Infinity];
  for (const b of sources) for (let k=0;k<3;k++) {
    lo[k]=Math.min(lo[k],b.position[k]); hi[k]=Math.max(hi[k],b.position[k]);
  }
  const center=lo.map((x,k)=>(x+hi[k])/2);
  const half=Math.max(1e-12,...hi.map((x,k)=>(x-lo[k])/2))*1.000001;
  function build(items, center, half, depth) {
    let mass=0; const com=[0,0,0];
    for (const b of items) {
      mass+=b.mass;
      for(let k=0;k<3;k++) com[k]+=b.mass*(b.position[k]-center[k]);
    }
    for(let k=0;k<3;k++) com[k]=center[k]+com[k]/mass;
    const node={center,half,mass,com,items:null,children:null};
    if(items.length<=4 || depth>=48 || half<1e-15) {node.items=items;return node;}
    const buckets=Array.from({length:8},()=>[]);
    for(const b of items) {
      const p=b.position;
      buckets[(p[0]>=center[0]?1:0)|(p[1]>=center[1]?2:0)|(p[2]>=center[2]?4:0)].push(b);
    }
    node.children=buckets.map((items,i)=>items.length ? build(items,
      center.map((x,k)=>x+((i&(1<<k))?half/2:-half/2)),half/2,depth+1) : null).filter(Boolean);
    return node;
  }
  return build(sources,center,half,0);
}

export function treeAcceleration(root, position, g, softening, theta=0.5) {
  const result=[0,0,0], eps2=softening*softening;
  function add(p,mass) {
    const dx=p[0]-position[0],dy=p[1]-position[1],dz=p[2]-position[2];
    const r2=dx*dx+dy*dy+dz*dz+eps2;
    if(!r2) throw new Error('Coincident bodies require positive softening');
    const f=g*mass/(r2*Math.sqrt(r2));
    result[0]+=dx*f;result[1]+=dy*f;result[2]+=dz*f;
  }
  function visit(node) {
    if(node.items) {for(const b of node.items)add(b.position,b.mass);return;}
    const distance=Math.hypot(...node.com.map((x,k)=>x-position[k]));
    const inside=node.center.every((x,k)=>Math.abs(x-position[k])<=node.half);
    if(!inside && 2*node.half<theta*distance) add(node.com,node.mass);
    else for(const child of node.children)visit(child);
  }
  if(root)visit(root);
  return result;
}
