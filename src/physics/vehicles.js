import { G, DAY, EARTH_AXIS, J2000, add, sub, scale, unit, norm, dot, cross } from './units.js';
import { orbitalElements } from './orbital.js';
import {signalLink} from './observations.js';
import {flightAtmosphere,enginePerformance} from './atmosphere.js';
import {rotateAxis,toBodyFixed,fromBodyFixed,planetRelative} from './frames.js';
import {attitudeStep,gimballedDirection} from './dynamics.js';
export {rotateAxis} from './frames.js';
export const G0=9.80665;
export const EARTH_ROTATION=7.2921150e-5;
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function earthFixed(position,jd) {
  if(!norm(position))return {latitude:null,longitude:null};
  const r=rotateAxis(position,EARTH_AXIS,-(jd-J2000)*DAY*EARTH_ROTATION);
  const equatorial=[r[0],r[1]*EARTH_AXIS[2]-r[2]*EARTH_AXIS[1],dot(r,EARTH_AXIS)];
  return {latitude:Math.asin(clamp(equatorial[2]/norm(r),-1,1))*180/Math.PI,
    longitude:Math.atan2(equatorial[1],equatorial[0])*180/Math.PI};
}
export function bodyFixed(position,primary,jd){
 if(!norm(position))return {latitude:null,longitude:null};
 if(primary.id==='earth')return earthFixed(position,jd);
 const axis=unit(primary.spin.axis),r=rotateAxis(position,axis,-(jd-J2000)*DAY*2*Math.PI/primary.spin.period);
 let east=unit(cross(axis,[1,0,0]));if(norm(east)<.1)east=unit(cross(axis,[0,1,0]));const zero=unit(cross(east,axis));
 return {latitude:Math.asin(clamp(dot(unit(r),axis),-1,1))*180/Math.PI,longitude:Math.atan2(dot(r,east),dot(r,zero))*180/Math.PI};
}
export function stationPosition(station,primary,jd) {
  if(primary.id!=='earth'){
    const axis=unit(primary.spin.axis),lat=station.latitude*Math.PI/180,lon=station.longitude*Math.PI/180;
    let east=unit(cross(axis,[1,0,0]));if(norm(cross(axis,[1,0,0]))<.1)east=unit(cross(axis,[0,1,0]));const zero=unit(cross(east,axis));
    const local=add(scale(add(scale(zero,Math.cos(lon)),scale(east,Math.sin(lon))),Math.cos(lat)),scale(axis,Math.sin(lat)));
    return add(primary.position,rotateAxis(scale(local,primary.radius+(station.altitude??0)),axis,(jd-J2000)*DAY*2*Math.PI/primary.spin.period));
  }
  const lat=station.latitude*Math.PI/180,lon=station.longitude*Math.PI/180;
  const v=[Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon)*EARTH_AXIS[2],
    Math.cos(lat)*Math.sin(lon)*(-EARTH_AXIS[1])];
  const p=add(v,scale(EARTH_AXIS,Math.sin(lat)));
  return add(primary.position,rotateAxis(scale(p,primary.radius+(station.altitude??0)),EARTH_AXIS,(jd-J2000)*DAY*EARTH_ROTATION));
}
export function lineOfSight(a,b,occluders,range=Infinity) {
  const d=sub(b,a),distance=norm(d);
  if(distance>range)return 'out-of-range';
  for(const object of occluders) {
    const t=clamp(dot(sub(object.position,a),d)/(distance*distance||1),0,1);
    if(norm(sub(add(a,scale(d,t)),object.position))<object.radius*0.999999)return 'blocked';
  }
  return 'connected';
}
export function communications(body,bodies,stations,jd) {
  const primary=bodies.find(b=>b.id===body.parentId),range=body.spacecraft?.range??4e7;
  const links=[];
  if(primary)for(const station of stations??[])if(station.bodyId===primary.id) {
    const position=stationPosition(station,primary,jd);
    links.push({id:station.id,name:station.name,position,...signalLink(body,{id:station.id,position},bodies,{range,power:body.spacecraft?.transmitterPower??20,transmitGain:body.spacecraft?.antennaGain??30})});
  }
  for(const other of bodies.filter(b=>b.id!==body.id&&b.spacecraft).slice(0,64))
    links.push({id:other.id,name:other.name,position:other.position,...signalLink(body,other,bodies,{range:Math.min(range,other.spacecraft.range),power:body.spacecraft?.transmitterPower??20,transmitGain:body.spacecraft?.antennaGain??30,receiveGain:other.spacecraft.antennaGain??30})});
  return links;
}
export function vehicleTelemetry(body,primary,jd,settings={}) {
  if(!primary)return null;
  const r=sub(body.position,primary.position),v=sub(body.velocity,primary.velocity),up=unit(r),altitude=norm(r)-primary.radius;
  const axis=unit(primary.spin.axis),rotation=2*Math.PI/primary.spin.period;
  const groundVelocity=sub(v,cross(scale(axis,rotation),r)),vertical=dot(v,up);
  const elements=orbitalElements(r,v,G*(settings.gMultiplier??1)*primary.mass);
  const air=flightAtmosphere(primary,altitude,norm(groundVelocity),body.rocket?.noseRadius??body.radius);
  const q=air.q;
  const orientation=body.rocket?.orientation??body.spacecraft?.orientation??unit(v);
  const pitch=Math.asin(clamp(dot(orientation,up),-1,1))*180/Math.PI;
  const east=unit(cross(axis,up)),north=unit(cross(up,east));
  const heading=(Math.atan2(dot(orientation,east),dot(orientation,north))*180/Math.PI+360)%360;
  return {jd,bodyId:body.id,met:body.rocket?.met??Math.max(0,(jd-(body.spacecraft?.epochJD??jd))*DAY),
    altitude,speed:norm(v),verticalSpeed:vertical,horizontalSpeed:Math.sqrt(Math.max(0,dot(v,v)-vertical*vertical)),
    groundSpeed:norm(groundVelocity),q,mach:air.mach,airDensity:air.density,airPressure:air.pressure,airTemperature:air.temperature,speedOfSound:air.speedOfSound,heatingProxy:air.heatingProxy,atmosphereModel:air.model,frame:'Planet-centered inertial · axes parallel to J2000 ecliptic',acceleration:norm(body.acceleration??[0,0,0]),
    propellant:body.rocket?.stages.slice(body.rocket.stage).reduce((s,x)=>s+x.fuel,0)??body.spacecraft?.rcs?.fuel??0,thrust:body.rocket?.actualThrust??0,
    dryMass:body.rocket?body.rocket.payloadMass+body.rocket.stages.slice(body.rocket.stage).reduce((s,x)=>s+x.dryMass,0):body.mass,
    totalMass:body.mass,pitch,heading,roll:body.rocket?.roll??0,
    orbitalVelocity:Math.sqrt(G*(settings.gMultiplier??1)*primary.mass/Math.max(norm(r),1)),
    apoapsis:Number.isFinite(elements?.apoapsis)?elements.apoapsis-primary.radius:null,
    periapsis:Number.isFinite(elements?.periapsis)?elements.periapsis-primary.radius:null,
    energy:elements?.specificEnergy??(dot(v,v)/2-G*(settings.gMultiplier??1)*primary.mass/Math.max(norm(r),1)),elements,...bodyFixed(r,primary,jd)};
}
export function rocketMass(rocket) {
  return rocket.payloadMass+(rocket.rcs?.fuel??0)+rocket.stages.slice(rocket.stage).reduce((s,x)=>s+x.dryMass+x.fuel,0);
}
export function defaultRocket() {
  return {stages:[{name:'Booster',dryMass:25600,fuel:395000,capacity:395000,thrust:7600000,isp:300,engineCount:1},
    {name:'Upper stage',dryMass:4000,fuel:92000,capacity:92000,thrust:1000000,isp:348,engineCount:1}],
    stage:0,payloadMass:12000,separationSpeed:1,throttle:1,engineOn:false,autopilot:true,autoStage:true,
    targetAltitude:200000,area:12,cd:0.35,met:0,phase:'prelaunch',orientation:[1,0,0],
    pitch:90,heading:90,roll:0,maxQ:0,maxQPassed:false,actualThrust:0,separations:[],deployed:false,stageRequested:false};
}

// Operator-split propulsion. Positive dt only: exhaust, drag, and staging are
// dissipative and are not replayed when integrating gravity backward.
export function propulsion(body,primary,dt,jd,settings,notify,spawn) {
  const r=body.rocket;if(!r||!primary||dt<=0||r.phase==='prelaunch'||r.phase==='complete'||r.phase==='crashed'||r.phase==='landed')return;
  r.met+=dt;
  const t=vehicleTelemetry(body,primary,jd,settings),up=unit(sub(body.position,primary.position));
  const axis=unit(primary.spin.axis),rotation=2*Math.PI/primary.spin.period;
  const v=sub(body.velocity,primary.velocity),east=unit(cross(axis,up));
  let tangent=unit(sub(v,scale(up,dot(v,up))));
  if(t.horizontalSpeed<50)tangent=east;
  if(r.launchPlaneNormal){const planned=unit(cross(r.launchPlaneNormal,up));tangent=dot(planned,v)>=0?planned:scale(planned,-1);}
  if(t.altitude < -5) {
    r.phase='crashed';r.engineOn=false;r.actualThrust=0;body.locked=true;
    notify('mission',body.name+' impacted the surface',[body.id]);return;
  }
  const stage=r.stages[r.stage];
  if((stage.fuel<=1e-7||r.stageRequested)&&r.stage<r.stages.length-1) {
    stage.fuel=Math.max(0,stage.fuel);
    if(r.autoStage||r.stageRequested) {
      r.stageRequested=false;const discarded=stage.dryMass+stage.fuel;
      const stageBody={...body,id:body.id+'-stage-'+r.stage+'-'+Math.round(r.met*100),name:body.name+' separated '+stage.name,
        rocket:null,spacecraft:null,type:'custom',mass:discarded,radius:3,material:'debris',
        position:[...body.position],velocity:[...body.velocity],collisionMode:'none',disrupted:true,
        metadata:{...body.metadata,separatedStage:{parentId:body.id,jd,name:stage.name,orientation:[...r.orientation]}}};
      spawn(stageBody);r.separations.push({stage:r.stage,jd});r.stage++;
      r.engineOn=r.stages[r.stage].autoIgnite!==false;r.phase=r.engineOn?'second-stage ignition':'stage separation';body.mass=rocketMass(r);
      const total=body.mass+discarded,separation=Math.max(0,r.separationSpeed??1);stageBody.velocity=sub(stageBody.velocity,scale(up,separation*body.mass/total));body.velocity=add(body.velocity,scale(up,separation*discarded/total));
      notify('staging',body.name+': '+stage.name+' separated; next engine ignited',[body.id,stageBody.id]);
    }
  }
  const active=r.stages[r.stage],mu=G*(settings.gMultiplier??1)*primary.mass,distance=primary.radius+t.altitude;
  if(r.landingAutopilot){
    const relative=sub(v,cross(scale(axis,rotation),sub(body.position,primary.position))),horizontal=sub(relative,scale(up,dot(relative,up))),g=mu/distance**2-t.horizontalSpeed**2/distance,available=active.thrust*(active.engineCount??1)/Math.max(body.mass,1);
    const targetVertical=r.landingAutopilot==='hover'?0:-Math.min(60,Math.max(.5,(t.altitude-body.radius)/10),Math.max(.5,Math.sqrt(Math.max(0,2*(available-g)*Math.max(0,t.altitude-body.radius)))*.25));
    const demand=add(scale(up,g+(targetVertical-dot(v,up))/3),scale(horizontal,-1/4));
    r.orientation=unit(demand);r.guidanceThrottle=clamp(norm(demand)/Math.max(.01,available),0,1);r.autopilot=true;r.phase='powered descent';
  }else if(r.attitudeMode&&r.attitudeMode!=='launch'){if(r.attitudeMode!=='hold')r.orientation=unit(burnVector(body,primary,{direction:r.attitudeMode,deltaV:1,vector:[1,0,0]}));r.guidanceThrottle=1;}
  else if(r.autopilot) {
    const target=r.targetAltitude;
    if(t.periapsis>target*0.82 && t.elements?.e<0.08 && t.altitude>100000) {
      if(r.phase!=='orbital insertion'){notify('insertion',body.name+' achieved a bound orbit; engine cutoff',[body.id]);}
      r.phase='orbital insertion';r.engineOn=false;
    } else if(t.altitude<1500) {r.orientation=up;r.phase=t.altitude<60?'liftoff':'vertical ascent';}
    else {
      const thrustAcceleration=active.thrust*(active.engineCount??1)*r.throttle/Math.max(body.mass,1);
      const desiredVertical=clamp((target-t.altitude)/90,-80,600);
      const radialAcceleration=(desiredVertical-t.verticalSpeed)/20+mu/distance**2-t.horizontalSpeed**2/distance;
      const radialFraction=clamp(radialAcceleration/Math.max(thrustAcceleration,0.1),-0.35,0.96);
      const desiredTangential=(Math.sqrt(mu/(primary.radius+target))-t.horizontalSpeed)/25+t.horizontalSpeed*t.verticalSpeed/distance;
      const tangentialFraction=clamp(desiredTangential/Math.max(thrustAcceleration,.1),-Math.sqrt(1-radialFraction**2),Math.sqrt(1-radialFraction**2));
      r.guidanceThrottle=Math.min(1,Math.hypot(radialFraction,tangentialFraction));
      let demand=add(scale(up,radialFraction),scale(tangent,tangentialFraction));
      if(r.launchPlaneNormal){const correction=(-dot(v,r.launchPlaneNormal)/20-dot(sub(body.position,primary.position),r.launchPlaneNormal)/800)/Math.max(thrustAcceleration,.1);demand=add(demand,scale(r.launchPlaneNormal,clamp(correction,-.3,.3)));r.guidanceThrottle=Math.min(1,norm(demand));}
      r.orientation=unit(demand);
      r.phase=t.altitude<30000?'pitch program':r.stage===0?'gravity turn':'upper-stage ascent';
    }
  } else {
    const pitch=r.pitch*Math.PI/180,heading=r.heading*Math.PI/180,north=unit(cross(up,east));
    r.orientation=unit(add(scale(up,Math.sin(pitch)),scale(add(scale(east,Math.sin(heading)),scale(north,Math.cos(heading))),Math.cos(pitch))));
  }
  if(t.q>r.maxQ){r.maxQ=t.q;r.maxQState={jd,met:r.met,q:t.q,mach:t.mach,altitude:t.altitude,speed:t.groundSpeed};}
  if(!r.maxQPassed&&r.maxQ>1000&&t.q<r.maxQ*.8&&r.met>30){r.maxQPassed=true;notify('mission',body.name+' passed max-Q: '+Math.round(r.maxQ)+' Pa',[body.id]);}
  if(r.limits){const violations=[];if(t.q>(r.limits.maxQ??Infinity))violations.push('dynamic pressure');if(t.acceleration>(r.limits.maxAcceleration??Infinity))violations.push('acceleration');if(t.heatingProxy>(r.limits.maxHeating??Infinity))violations.push('heating proxy');r.structuralWarnings=violations.map(x=>'STRUCTURAL LIMIT EXCEEDED: '+x);}
  r.orientation=attitudeStep(body,r.orientation,dt);
  const thrustDirection=gimballedDirection({...r,gimbalRange:r.gimbalRange??active.gimbalRange??0},r.orientation);
  if(r.engineOn&&!active.engineRunning){const used=active.ignitionsUsed??0;if(used>=(active.maxIgnitions??Infinity)||(used>0&&active.restartable===false)){r.engineOn=false;notify('mission',body.name+': ignition rejected; engine restart limit reached',[body.id]);}else active.ignitionsUsed=used+1;}
  active.engineRunning=r.engineOn;
  const throttle=r.engineOn?clamp(r.throttle,0,1)*(r.autopilot?(r.guidanceThrottle??1):1):0;
  const performance=enginePerformance(active,t.airPressure,throttle);
  const thrust=active.fuel>0?performance.thrust:0;
  const used=Math.min(active.fuel,performance.massFlow*dt),before=rocketMass(r);
  active.fuel-=used;body.mass=rocketMass(r);
  r.consumedPropellant=(r.consumedPropellant??0)+used;
  const impulseSpeed=used>0?performance.isp*G0*Math.log(before/body.mass):0;
  r.propulsiveDeltaV=(r.propulsiveDeltaV??0)+impulseSpeed;
  body.velocity=add(body.velocity,scale(thrustDirection,impulseSpeed));
  r.actualThrust=dt?used/dt*performance.isp*G0:0;r.actualIsp=performance.isp;r.massFlow=dt?used/dt:0;
  const relative=sub(sub(body.velocity,primary.velocity),cross(scale(axis,rotation),sub(body.position,primary.position)));
  const drag=t.q*r.cd*r.area/Math.max(body.mass,1);
  r.nonGravitationalAcceleration=sub(scale(thrustDirection,r.actualThrust/Math.max(body.mass,1)),scale(unit(relative),drag));
  body.velocity=sub(body.velocity,scale(unit(relative),Math.min(norm(relative),drag*dt)));
  if(active.fuel<=1e-7 && r.stage===r.stages.length-1 && r.phase!=='orbital insertion') {
    r.engineOn=false;r.phase='fuel exhausted';
  }
}
export function burnVector(body,primary,node) {
  const radial=unit(sub(body.position,primary.position)),v=sub(body.velocity,primary.velocity);
  const normal=unit(cross(radial,v)),prograde=unit(v);
  const axes={prograde,retrograde:scale(prograde,-1),out:radial,in:scale(radial,-1),normal,antinormal:scale(normal,-1)};
  if(node.components)return add(add(scale(prograde,node.components[0]),scale(normal,node.components[1])),scale(radial,node.components[2]));
  return node.direction==='vector'?[...node.vector]:scale(axes[node.direction]??prograde,node.deltaV);
}
