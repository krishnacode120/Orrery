import {Engine} from '../physics/engine.js';
import {norm,sub,dot,cross,unit,DAY} from '../physics/units.js';
import {sunlight,observingStar} from '../physics/observations.js';
function geometry(s,query,observerId,targetId){const a=s.bodies.find(b=>b.id===observerId),b=s.bodies.find(b=>b.id===targetId);if(!a||!b||a.id===b.id)throw new Error('Choose two distinct supported bodies');const star=observingStar(s,a),r=sub(b.position,a.position),ray=sub(star.position,a.position);
 if(query==='eclipse')return {value:1-sunlight(a,star,s.bodies).fraction,distance:norm(r),kind:'Observer eclipse'};
 if(query==='occultation'){const angle=Math.acos(Math.max(-1,Math.min(1,dot(unit(r),unit(ray))))),limit=Math.asin(Math.min(1,b.radius/norm(r)))+Math.asin(Math.min(1,star.radius/norm(ray)));return {value:limit-angle,distance:norm(r),kind:'Target transit/occultation of illuminating star'};}
 if(query==='opposition'||query==='conjunction')return {value:cross(unit(r),unit(ray))[2],side:dot(unit(r),unit(ray)),distance:norm(r),kind:query};
 return {value:norm(r),distance:norm(r),kind:query==='perigee'?'Closest approach / perigee':'Closest approach'};
}
export function findEvents(scenario,{query='closest',observerId='earth',targetId='mars',duration=DAY*730,samples=512,maxMs=4000}={}){
 if(!['closest','perigee','opposition','conjunction','eclipse','occultation'].includes(query)||!Number.isFinite(duration)||duration<=0||duration>DAY*365.25*100||!Number.isInteger(samples)||samples<16||samples>4096||!Number.isFinite(maxMs)||maxMs<1||maxMs>12000)throw new Error('Invalid bounded event search');
 const engine=new Engine();engine.load(scenario);const started=performance.now(),start=engine.s.jd,step=duration/samples,events=[];let previous=null,before=null,advanced=0;
 while(advanced<=duration&&performance.now()-started<maxMs){const s=engine.s,g={...geometry(s,query,observerId,targetId),jd:start+advanced/DAY};
 if(previous){if(query==='closest'||query==='perigee'){if(before&&previous.value<=before.value&&previous.value<g.value)events.push({...previous,uncertaintySeconds:step,model:'Sampled local minimum; exact event may lie within one search interval'});}
 else if(query==='eclipse'||query==='occultation'){if(previous.value<=0&&g.value>0)events.push({...g,uncertaintySeconds:step,model:'Geometric entry sampled at the first positive overlap'});}
 else if((previous.value<0&&g.value>=0||previous.value>0&&g.value<=0)&&(query==='opposition'?g.side<0:g.side>0)){const t=Math.abs(previous.value)/(Math.abs(previous.value)+Math.abs(g.value));events.push({...g,jd:previous.jd+(g.jd-previous.jd)*t,uncertaintySeconds:step,model:'Interpolated ecliptic-longitude crossing; latitude can prevent a true sky alignment'});}}
 before=previous;previous=g;if(advanced>=duration)break;const remaining=Math.min(step,duration-advanced),result=engine.advance(remaining);advanced+=result.advanced;if(result.advanced<=0)break;
 }
 return {events:events.slice(0,64),startJD:start,endJD:start+advanced/DAY,advanced,requested:duration,complete:advanced>=duration-1e-3,elapsedMs:performance.now()-started,method:scenario.mode==='reality'?'JPL approximate / loaded Horizons coverage':'Cloned local numerical propagation'};
}
