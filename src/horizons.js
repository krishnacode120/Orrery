import { api } from './persistence.js';
import { HORIZONS, realityBodies } from './physics/catalog.js';
import { body } from './physics/body.js';
export async function loadHorizons(scenario,{jd=scenario.jd,days=0,targets=[],progress=()=>{}}={}) {
  const s=structuredClone(scenario);s.jd=jd;s.telemetry=[];s.events=[];s.eventSerial=0;
  if(s.mode==='reality')s.bodies=realityBodies(jd);
  for(const id of targets)if(!s.bodies.some(b=>b.id===id))s.bodies.push(body({id,name:id,type:['jwst','voyager1','voyager2'].includes(id)?'spacecraft':'dwarf',
    mass:0,massless:true,radius:1000,parentId:'sun',color:'#c4b48c'}));
  const chosen=s.bodies.filter(b=>HORIZONS[b.id]&&b.id!=='sun');const tracks={};let count=0;
  for(const b of chosen)if(b.type==='spacecraft'&&!b.spacecraft){b.mass=800;b.radius=2;b.spacecraft={range:3e13,battery:1,capacityWh:1000,solarWatts:600,loadWatts:220,payload:'standby',orientation:[1,0,0],epochJD:jd};}
  // Atomic application: no partial scenario is returned if an upstream target fails.
  for(let i=0;i<chosen.length;i+=2)await Promise.all(chosen.slice(i,i+2).map(async b=>{
    const result=await api(days?`/horizons/series?target=${HORIZONS[b.id]}&jd=${jd}&days=${days}&samples=33`:`/horizons?target=${HORIZONS[b.id]}&jd=${jd}`);
    const state=days?result.samples[0]:result;b.position=state.position;b.velocity=state.velocity;
    if(days)tracks[b.id]=result.samples;progress(++count,chosen.length);
  }));
  const sun=s.bodies.find(b=>b.id==='sun');if(sun){sun.position=[0,0,0];sun.velocity=[0,0,0];}
  s.provenance={source:'horizons',epochJD:jd,note:days?'Cached vector playback; cubic Hermite interpolation':'Horizons initialization, locally propagated Newtonian state'};
  if(days){s.mode='reality';s.ephemeris={startJD:jd,endJD:jd+days,tracks};}
  else {s.mode='sandbox';s.ephemeris=null;}
  return s;
}
