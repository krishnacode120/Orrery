import {useRef,useMemo,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import {Color} from 'three';
import {Line} from '@react-three/drei';
import {useSimStore} from '../store/useSimStore.js';
import {viewSpace} from './viewSpace.js';
import {renderScenario} from '../rendering/frame.js';
import {TrailRing} from '../rendering/trails.js';
import {DAY} from '../physics/units.js';
const liveRings=new Map();let sessionRevision=-1;
function Trail({id}){
 const group=useRef(),line=useRef(),initial=useMemo(()=>[[0,0,0],[0,0,0]],[]),initialColors=useMemo(()=>[[1,1,1],[1,1,1]],[]),last=useRef({time:0,version:-1,origin:[0,0,0],unit:1,distanceScale:1}),positions=useMemo(()=>new Float32Array(1024*3),[]),colors=useMemo(()=>new Float32Array(1024*3),[]);
 useFrame(({clock})=>{
  const sim=useSimStore.getState(),s=sim.scenario,b=renderScenario(s).bodies.find(x=>x.id===id),sp=viewSpace(s);if(!b||!group.current||!line.current)return;
  const cap=Math.min(1024,sim.qualityLevel==='low'?128:Math.max(2,Math.floor(b.trail.length))),old=liveRings.get(id);let ring=old;
  if(!ring||ring.capacity!==cap){ring=new TrailRing(cap);for(const p of old?.values()??s.view.trailHistory?.[id]??[])ring.append(p.jd,p.position);liveRings.set(id,ring);}
  const time=clock.elapsedTime;
  if(time-last.current.time>=.1){last.current.time=time;if(!sim.paused)ring.append(renderScenario(s).jd,b.position,{duration:b.trail.duration??DAY*100,minDistance:b.radius*.1,maxInterval:(b.trail.duration??DAY*100)/cap});}
  const base=last.current;if(base.compressed!==sp.compressed||base.color!==b.trail.color){base.version=-1;base.color=b.trail.color;}line.current.material.linewidth=(b.trail.width??1)*(s.view.trailScale??1);group.current.position.fromArray(sp.transform(base.origin));group.current.scale.setScalar(base.unit/sp.unit*sp.distanceScale/base.distanceScale);
  if(ring.version!==base.version){
   const points=ring.values();base.version=ring.version;base.origin=[...sp.origin];base.unit=sp.unit;base.distanceScale=sp.distanceScale;base.compressed=sp.compressed;const color=new Color(b.trail.color);
   points.forEach((p,i)=>{positions.set(sp.transform(p.position),i*3);const fade=.04+.72*i/Math.max(1,points.length-1);colors.set([color.r*fade,color.g*fade,color.b*fade],i*3);});
   line.current.visible=points.length>1;if(points.length>1){line.current.geometry.setPositions(positions.slice(0,points.length*3));line.current.geometry.setColors(colors.slice(0,points.length*3));}group.current.position.set(0,0,0);group.current.scale.setScalar(1);
  }
 });
 return <group ref={group}><Line ref={line} points={initial} vertexColors={initialColors} color="#ffffff" lineWidth={1} transparent opacity={.7} depthWrite={false} frustumCulled={false}/></group>;
}
export default function HistoryTrails(){
 const sim=useSimStore(),s=sim.scenario,elapsed=useRef(0);
 useEffect(()=>{if(sessionRevision!==sim.revision){liveRings.clear();sessionRevision=sim.revision;}},[sim.revision]);
 useFrame((_,dt)=>{elapsed.current+=dt;if(elapsed.current<2)return;elapsed.current=0;const trails=Object.fromEntries([...liveRings].filter(([id])=>useSimStore.getState().scenario.bodies.some(b=>b.id===id)).map(([id,ring])=>[id,ring.values()]));useSimStore.getState().configureView({trailHistory:trails});useSimStore.setState({activeTrailPoints:Object.values(trails).reduce((n,a)=>n+a.length,0)});});
 useEffect(()=>()=>liveRings.clear(),[]);
 if(!s.view.trails)return null;return <>{s.bodies.filter(b=>!b.massless&&!b.disrupted&&b.trail.length>=2&&b.trail.mode!=='orbit').slice(0,40).map(b=><Trail key={b.id} id={b.id}/>)}</>;
}
