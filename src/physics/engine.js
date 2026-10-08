import {flightEvents,applyFuelBurn} from './flight.js';
import {sunlight,observingStar,signalLink} from './observations.js';
import { stateAt } from './elements.js';
import { diagnostics, accelerations, verlet, rk4, dormandPrince, accelerationTimestep } from './integrators.js';
import { validateScenario } from './scenario.js';
import { resolveCollisions } from './collisions.js';
import { disruptTides } from './roche.js';
import { extremeEvents } from './exotic.js';
import { realityBodies } from './catalog.js';
import { interpolateVectors } from './ephemeris.js';
import { propulsion, vehicleTelemetry, burnVector, communications, lineOfSight, clamp, rotateAxis, EARTH_ROTATION } from './vehicles.js';
import { MAX_EVENTS, MAX_BODIES } from './limits.js';
import { DAY, MIN_JD, MAX_JD, norm, add, sub, scale, cross, unit, EARTH_AXIS,dot } from './units.js';

export class Engine {
  load(scenario) {
    this.s=validateScenario(scenario);
    this.baseline=diagnostics(this.s.bodies,this.s.settings);
    this.energyScale=Math.abs(this.baseline.energy);this.angularScale=norm(this.baseline.angular);
    this.eventEnergyDelta=0;this.eventMassDelta=0;this.steps=0;this.topologyRevision=0;
    this.nextStep=this.s.settings.stepSeconds;this.lastTelemetryJD=-Infinity;
    this.encounter=null;this.encounterPair=null;
    this.selectedId=this.s.view.selected;this.telemetryVersion=0;this.accepted=0;this.rejected=0;
  }
  log(kind,message,bodyIds,jd=this.s.jd,energyDelta=0,massDelta=0) {
    this.s.events.push({kind,message,bodyIds,id:++this.s.eventSerial,jd,energyDelta,massDelta});
    this.s.events=this.s.events.slice(-MAX_EVENTS);
  }
  account(before,after,event,jd) {
    const a=diagnostics(before,this.s.settings),b=diagnostics(after,this.s.settings);
    const energyDelta=b.energy-a.energy,massDelta=b.mass-a.mass;
    this.baseline.energy+=energyDelta;
    for(let k=0;k<3;k++)this.baseline.angular[k]+=b.angular[k]-a.angular[k];
    this.eventEnergyDelta+=energyDelta;this.eventMassDelta+=massDelta;
    this.log(event.kind,event.message,event.bodyIds,jd,energyDelta,massDelta);this.topologyRevision++;
  }
  vehicles(dt,jd) {
    const s=this.s;
    const notify=(kind,message,ids)=>this.log(kind,message,ids,jd);
    const spawn=b=>{if(s.bodies.length>=MAX_BODIES)throw new Error('Body capacity reached during staging');s.bodies.push(b);this.topologyRevision++;};
    for(const b of [...s.bodies]) {
      const parent=s.bodies.find(p=>p.id===b.parentId);
      if(b.rocket) {
        const previousPhase=b.rocket.phase;
        if(previousPhase==='prelaunch'&&parent&&dt>0){const axis=unit(parent.spin.axis),rotation=2*Math.PI/parent.spin.period,r=rotateAxis(sub(b.position,parent.position),axis,rotation*dt);b.position=add(parent.position,r);b.velocity=add(parent.velocity,cross(scale(axis,rotation),r));}
        propulsion(b,parent,dt,jd,s.settings,notify,spawn);
        if(b.rocket.phase!==previousPhase)this.log('mission',b.name+': '+previousPhase+' → '+b.rocket.phase,[b.id],jd);
        if(b.rocket.deployRequested && !b.rocket.deployed) {
          const id=b.id+'-payload',mass=b.rocket.payloadMass;
          spawn({...b,id,name:b.name+' payload',type:'satellite',mass,radius:2,rocket:null,locked:false,
            position:[...b.position],velocity:[...b.velocity],spacecraft:{range:4e7,battery:1,capacityWh:1000,solarWatts:600,loadWatts:220,payload:'active',orientation:[1,0,0],epochJD:jd}});
          b.mass-=mass;b.rocket.payloadMass=0;b.rocket.deployed=true;b.rocket.deployRequested=false;
          b.rocket.engineOn=false;b.rocket.phase='complete';notify('deploy',b.name+' deployed payload; mission complete',[b.id,id]);
        }
      }
      if(b.spacecraft && dt>0) {
        const sun=observingStar(s,b),light=sunlight(b,sun,s.bodies),illuminated=light.fraction>0;
        const previousLight=b.spacecraft.sunlightState;
        if(previousLight&&previousLight!==light.state)notify('eclipse',b.name+': '+previousLight+' → '+light.state+(light.occluder?' behind '+s.bodies.find(x=>x.id===light.occluder)?.name:''),[b.id,...(light.occluder?[light.occluder]:[])]);
        b.spacecraft.sunlightState=light.state;b.spacecraft.solarFraction=light.fraction;
        b.spacecraft.solarModel=sun.id==='assumed-sun'?'Assumed Sun at 1 AU along inertial +X':'Finite stellar disc, strongest single occulter';
        const power=b.spacecraft.solarWatts*light.fraction-b.spacecraft.loadWatts;
        b.spacecraft.battery=clamp(b.spacecraft.battery+power*dt/(b.spacecraft.capacityWh*3600),0,1);
        b.spacecraft.illuminated=illuminated;
      }
    }
  }
  burns(jd) {
    for(const node of this.s.maneuvers)if(!node.executed && node.jd<=jd+1e-10) {
      const b=this.s.bodies.find(b=>b.id===node.bodyId),parent=this.s.bodies.find(p=>p.id===b?.parentId);
      if(!b || !parent || b.locked)continue;
      const before=diagnostics(this.s.bodies,this.s.settings),dv=burnVector(b,parent,node);
      if(node.fuelAware){try{node.propellantUsed=applyFuelBurn(b,dv);}catch(error){node.executed=true;node.failed=error.message;this.log('mission',b.name+': maneuver rejected — '+error.message,[b.id],jd);continue;}}else b.velocity=add(b.velocity,dv);node.executed=true;node.actualJD=jd;
      const after=diagnostics(this.s.bodies,this.s.settings);
      this.baseline.energy+=after.energy-before.energy;
      for(let k=0;k<3;k++)this.baseline.angular[k]+=after.angular[k]-before.angular[k];
      this.eventEnergyDelta+=after.energy-before.energy;this.eventMassDelta+=after.mass-before.mass;
      this.log('burn',b.name+': ideal impulsive Δv '+norm(dv).toFixed(2)+' m/s',[b.id],jd,after.energy-before.energy,after.mass-before.mass);
    }
  }
  advance(seconds) {
    if(!Number.isFinite(seconds))throw new Error('Invalid elapsed time');
    const started=performance.now();let advanced=0,steps=0,rejected=0,lastDt=0,errorEstimate=0;
    const p=this.s.settings,s=this.s;
    if(s.mode==='reality') {
      const jd=Math.max(s.ephemeris?.startJD??MIN_JD,Math.min(s.ephemeris?.endJD??(MAX_JD-1e-6),s.jd+seconds/DAY));
      advanced=(jd-s.jd)*DAY;s.jd=jd;
      const extended=s.bodies.some(b=>b.type==='moon');
      const ephemeris=extended?new Map(realityBodies(jd).map(b=>[b.id,b])):null;
      s.bodies.forEach(b=>{
        const state=s.ephemeris?.tracks[b.id]?interpolateVectors(s.ephemeris.tracks[b.id],jd):ephemeris?.get(b.id)??(['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'].includes(b.id)?stateAt(b.id,jd):null);
        if(state){b.position=[...state.position];b.velocity=[...state.velocity];}
      });
    } else {
      const boundary=seconds>=0?(MAX_JD-1e-6-s.jd)*DAY:(MIN_JD-s.jd)*DAY;
      const target=Math.sign(seconds)*Math.min(Math.abs(seconds),Math.abs(boundary),512*p.stepSeconds);
      while(Math.abs(target-advanced)>1e-9 && steps<512 && (steps===0||performance.now()-started<12)) {
        const jd=s.jd+advanced/DAY;
        if(target>0)this.burns(jd);
        let maximum=p.adaptive?accelerationTimestep(s.bodies,p):p.stepSeconds;
        if(s.bodies.some(b=>b.rocket && b.rocket.engineOn))maximum=Math.min(maximum,.25);
        const planned=s.maneuvers.filter(n=>!n.executed&&n.jd>jd).map(n=>(n.jd-jd)*DAY);
        if(target>0&&planned.length)maximum=Math.min(maximum,...planned);
        if(maximum<p.minStep)throw new Error('Required timestep below minimum; lower minimum step or resolve the encounter');
        if(p.integrator==='dopri')maximum=Math.min(maximum,this.nextStep);
        let dt=Math.sign(target)*Math.min(maximum,Math.abs(target-advanced));
        const previous=dt>0?new Map(s.bodies.map(b=>[b.id,[...b.position]])):null;
        const encounterBodies=this.encounterPair?.map(id=>s.bodies.find(b=>b.id===id)),oldEncounter=encounterBodies?.every(Boolean)?{r:sub(encounterBodies[0].position,encounterBodies[1].position),v:sub(encounterBodies[0].velocity,encounterBodies[1].velocity)}:null;
        const splitPropulsion=s.bodies.some(b=>b.rocket && b.rocket.engineOn);
        if(dt>0&&splitPropulsion)this.vehicles(dt/2,jd);
        if(p.integrator==='dopri') {
          // Thrust-driven vehicles use a capped fixed RK4 gravity substep; a DP
          // rejection cannot roll back already emitted exhaust/staging.
          if(s.bodies.some(b=>b.rocket && b.rocket.engineOn))rk4(s.bodies,dt,p);
          else {const accepted=dormandPrince(s.bodies,dt,p);dt=accepted.dt;this.nextStep=Math.max(p.minStep,accepted.nextStep);rejected+=accepted.rejected;errorEstimate=accepted.error;}
        } else (p.integrator==='rk4'?rk4:verlet)(s.bodies,dt,p);
        if(dt>0){for(const b of s.bodies)if(b.locked&&(b.rocket?.phase==='prelaunch'||b.metadata.surfaceBound)){const parent=s.bodies.find(x=>x.id===b.parentId),old=previous.get(b.parentId);if(parent&&old)b.position=add(b.position,sub(parent.position,old));}this.vehicles(splitPropulsion?dt/2:dt,jd+dt/DAY);}
        if(s.bodies.some(b=>!b.position.every(Number.isFinite)||!b.velocity.every(Number.isFinite)))throw new Error('Physics state overflow; reduce timestep');
        if(oldEncounter){const [vehicle,targetBody]=encounterBodies,r=sub(vehicle.position,targetBody.position),change=sub(r,oldEncounter.r),fraction=Math.max(0,Math.min(1,-dot(oldEncounter.r,change)/(dot(change,change)||1))),distance=norm(add(oldEncounter.r,scale(change,fraction)));
         if(!this.encounter||distance<this.encounter.distance)this.encounter={bodyId:vehicle.id,targetId:targetBody.id,distance,jd:s.jd+(advanced+dt*fraction)/DAY,relativeSpeed:norm(add(oldEncounter.v,scale(sub(sub(vehicle.velocity,targetBody.velocity),oldEncounter.v),fraction))),resolutionSeconds:Math.abs(dt),model:'Closest sampled integration segment; linear interpolation within a physics step.'};}
        advanced+=dt;lastDt=dt;steps++;
        if(dt>0) {
          const emit=(before,after,event)=>this.account(before,after,event,s.jd+advanced/DAY);
          flightEvents(s,dt,(kind,message,ids)=>{this.log(kind,message,ids,s.jd+advanced/DAY);this.topologyRevision++;});
          s.bodies=extremeEvents(s.bodies,p,previous,dt,s.jd+advanced/DAY,emit);
          s.bodies=resolveCollisions(s.bodies,p,previous,dt,emit,s.eventSerial);
          s.bodies=disruptTides(s.bodies,p,emit,s.eventSerial);
        }
      }
      s.jd+=advanced/DAY;
    }
    this.steps+=steps;this.accepted+=steps;this.rejected+=rejected;
    const d=diagnostics(s.bodies,p),a=accelerations(s.bodies,p);
    const selected=s.bodies.find(b=>b.id===this.selectedId);
    s.bodies.forEach((b,i)=>{if(b.rocket||b.spacecraft||b.id===this.selectedId)b.acceleration=b.locked?[0,0,0]:b.rocket?add(a[i],b.rocket.nonGravitationalAcceleration??[0,0,0]):a[i];});
    if(selected && (selected.rocket||selected.spacecraft) && Math.abs(s.jd-this.lastTelemetryJD)*DAY>=1) {
      const parent=s.bodies.find(b=>b.id===selected.parentId),sample=vehicleTelemetry(selected,parent,s.jd,p);
      if(sample) {
        sample.communication=communications(selected,s.bodies,s.stations,s.jd).some(x=>x.status==='connected')?1:0;
        s.telemetry.push(sample);s.telemetry=s.telemetry.slice(-2400);this.telemetryVersion++;this.lastTelemetryJD=s.jd;
      }
    }
    const delta=d.angular.map((x,i)=>x-this.baseline.angular[i]);
    const activePropulsion=s.bodies.some(b=>b.rocket&&b.rocket.engineOn);
    const warnings=[];
    if(selected){const parent=s.bodies.find(b=>b.id===selected.parentId),t=parent?vehicleTelemetry(selected,parent,s.jd,p):null;if(t?.elements?.period&&lastDt>t.elements.period/40)warnings.push('TIMESTEP TOO LARGE: selected orbit has fewer than 40 steps per period.');if(t?.elements?.e>=1)warnings.push('ESCAPE TRAJECTORY: selected state is unbound relative to '+parent.name+'.');const stage=selected.rocket?.stages[selected.rocket.stage];if(stage&&stage.fuel/stage.capacity<.05)warnings.push('FUEL LOW: active stage retains less than 5% of its propellant capacity.');}
    if(s.eventSerial-(this.previousEventSerial??s.eventSerial)>10)warnings.push('HIGH EVENT RATE: more than 10 collision/mission events in one batch.');this.previousEventSerial=s.eventSerial;
    if(p.gr)warnings.push('GR: dominant-primary 1PN approximation; Newtonian drift is not a conserved invariant.');
    if(d.externalConstraints)warnings.push('Pinned bodies introduce external constraints.');
    if(activePropulsion)warnings.push('Thrust, exhaust and drag exchange energy and momentum with the environment.');
    if(seconds<0)warnings.push('Reverse integrates gravity only; collisions, burns, fuel, and traversals are not undone.');
    if(s.bodies.length>500&&p.theta>.7)warnings.push('Large opening angle reduces tracer-force accuracy.');
    if(p.stepSeconds>3600&&s.bodies.some(b=>b.spacecraft))warnings.push('Large maximum timestep for a local orbit; enable adaptive stepping.');
    if(p.integrator==='dopri'&&s.bodies.some(b=>b.rocket))warnings.push('Powered launch uses ≤0.25 s RK4 gravity substeps with split propulsion.');
    const computeMs=performance.now()-started;
    return {...d,conservationReliable:d.conservationReliable&&!activePropulsion,
      energyDrift:this.energyScale?100*(d.energy-this.baseline.energy)/this.energyScale:0,
      angularDrift:this.angularScale?100*norm(delta)/this.angularScale:0,eventEnergyDelta:this.eventEnergyDelta,eventMassDelta:this.eventMassDelta,
      eventCount:s.eventSerial,collisionCount:s.events.filter(e=>['merge','bounce','fragment','absorb'].includes(e.kind)).length,
      activeFragments:s.bodies.filter(b=>b.disrupted).length,steps:this.steps,accepted:this.accepted,rejected:this.rejected,lastDt,errorEstimate,
      integratorActive:p.integrator==='dopri'&&activePropulsion?'rk4 + propulsion split':p.integrator,
      computeMs,stepsPerSecond:steps*1000/Math.max(.01,computeMs),warnings,
      gravity:(p.solver==='tree'||p.solver==='auto'&&s.bodies.length>500)&&p.theta>0?'Direct sources + tracer octree':'Direct sources + direct tracers',
      limited:Math.abs(seconds-advanced)>Math.max(1e-3,Math.abs(seconds)*1e-6),advanced};
  }
}
