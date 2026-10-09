import { DEFAULT_SETTINGS, TYPES } from './body.js';
import {validateNavigation,cameraMode,validPose} from '../navigation/settings.js';
import { MIN_JD, MAX_JD, SANDBOX_MAX_JD } from './units.js';
import { MAX_BODIES, MAX_MASSIVE, MAX_EVENTS } from './limits.js';
import {validateSchedule} from './experimentOps.js';
import { DEFAULT_VIEW } from './catalog.js';
import { rocketMass } from './vehicles.js';

const finite = (x) => typeof x === 'number' && Number.isFinite(x);
const vector = (x) => Array.isArray(x) && x.length === 3 && x.every(finite);
function require(condition, message) { if (!condition) throw new Error(message); }

export function validateScenario(input) {
  require(input&&typeof input==='object'&&!Array.isArray(input),'Scenario must be an object');
  require(input.view==null||typeof input.view==='object'&&!Array.isArray(input.view),'View must be an object');
  const s = structuredClone(input);
  require(s?.version === 1 || s?.version === 2, 'Unsupported scenario version');
  s.version=2;
  s.view={...structuredClone(DEFAULT_VIEW),...s.view,units:{...DEFAULT_VIEW.units,...s.view?.units}};
  s.view.navigation=validateNavigation(s.view.navigation);s.view.cameraMode=cameraMode(s.view.cameraMode);
  for(const [key,limit] of [['savedCameras',100],['keyframes',32]])require(Array.isArray(s.view[key])&&s.view[key].length<=limit&&s.view[key].every(c=>c&&typeof c==='object'&&!Array.isArray(c)),'Invalid '+key);
  if(s.view.trailHistory!=null){const history=s.view.trailHistory;require(typeof history==='object'&&!Array.isArray(history)&&Object.keys(history).length<=40,'Invalid trail history');for(const [id,points] of Object.entries(history))require(id.length<=80&&Array.isArray(points)&&points.length<=1024&&points.every(p=>p&&finite(p.jd)&&p.jd>=MIN_JD&&p.jd<SANDBOX_MAX_JD&&vector(p.position)&&p.position.every(x=>Math.abs(x)<=1e20)),'Invalid trail samples');}
  for(const [i,c] of s.view.savedCameras.entries()){c.id??='camera-'+i;c.name??='View '+(i+1);require(typeof c.id==='string'&&c.id.length<=80&&typeof c.name==='string'&&c.name.length<=80,'Invalid camera bookmark name');}
  s.view.timeBookmarks??=[];require(Array.isArray(s.view.timeBookmarks)&&s.view.timeBookmarks.length<=100&&s.view.timeBookmarks.every(x=>typeof x.name==='string'&&x.name.length<=80&&finite(x.jd)&&x.jd>=MIN_JD&&x.jd<MAX_JD),'Invalid time bookmarks');
  s.tags??=[];s.description??='';s.provenance??={source:s.mode==='reality'?'jpl':'custom',epochJD:s.jd,note:'Migrated Phase 1 snapshot'};
  s.maneuvers??=[];s.stations??=[];s.telemetry??=[];s.mission??={name:s.name,epochJD:s.jd};
  s.experimentEvents??=[];validateSchedule(s.experimentEvents);
  if(s.branch)require(typeof s.branch.id==='string'&&s.branch.id.length>0&&s.branch.id.length<=80&&typeof s.branch.parentId==='string'&&s.branch.parentId.length>0&&s.branch.parentId.length<=80&&finite(s.branch.epochJD)&&s.branch.epochJD>=MIN_JD&&s.branch.epochJD<SANDBOX_MAX_JD&&typeof s.branch.name==='string'&&s.branch.name.length<=120,'Invalid scenario branch');
  require(['auto','low','medium','high','ultra'].includes(s.view.quality),'Invalid quality');
  require(['system','planetary','earth','vehicle','true'].includes(s.view.scale),'Invalid viewing scale');
  require(finite(s.view.exaggeration)&&s.view.exaggeration>=1&&s.view.exaggeration<=1e6,'Invalid display radius multiplier');
  require(Array.isArray(s.tags)&&s.tags.length<=20&&s.tags.every(x=>typeof x==='string'&&x.length<=40),'Invalid tags');
  require(typeof s.description==='string'&&s.description.length<=4000,'Invalid description');
  require(Array.isArray(s.maneuvers)&&s.maneuvers.length<=256,'Too many maneuvers');
  require(new Set(s.maneuvers.map(n=>n?.id)).size===s.maneuvers.length,'Duplicate maneuver IDs');
  for(const n of s.maneuvers)require(n&&typeof n.id==='string'&&typeof n.bodyId==='string'&&finite(n.jd)&&n.jd>=MIN_JD&&n.jd<SANDBOX_MAX_JD&&finite(n.deltaV)&&n.deltaV>=0&&n.deltaV<=1e7
    &&['prograde','retrograde','in','out','normal','antinormal','vector'].includes(n.direction)&&vector(n.vector)&&typeof n.executed==='boolean','Invalid maneuver');
  for(const n of s.maneuvers)require(Math.hypot(...n.vector)<=1e7,'Maneuver vector exceeds 10,000 km/s');
  for(const n of s.maneuvers)if(n.components)require(vector(n.components)&&Math.hypot(...n.components)<=1e7,'Maneuver components must be transverse/prograde, normal and radial SI values');
  require(Array.isArray(s.stations)&&s.stations.length<=128,'Too many ground stations');
  require(new Set(s.stations.map(x=>x?.id)).size===s.stations.length,'Duplicate station IDs');
  for(const x of s.stations)require(x&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.bodyId==='string'&&finite(x.latitude)&&Math.abs(x.latitude)<=90
    &&finite(x.longitude)&&Math.abs(x.longitude)<=180&&finite(x.altitude??0),'Invalid ground station');
  require(Array.isArray(s.telemetry)&&s.telemetry.length<=2400,'Too many telemetry samples');
  // Reject non-finite numbers anywhere, including optional mission/custom data.
  function jsonFinite(v,depth=0) {
    require(depth<=20,'Scenario data is nested too deeply');
    if(typeof v==='number')require(finite(v),'Scenario contains non-finite data');
    else if(v && typeof v==='object')for(const value of Object.values(v))jsonFinite(value,depth+1);
  }
  jsonFinite(s);
  // JSON has no signed zero; normalize it at the scenario boundary.
  function normalizeZero(value) { if(value && typeof value==='object')for(const key of Object.keys(value)) {
    if(Object.is(value[key],-0))value[key]=0;else normalizeZero(value[key]);
  }}
  normalizeZero(s);
  require(typeof s.name === 'string' && s.name.length > 0 && s.name.length <= 120, 'Invalid scenario name');
  require(['reality','sandbox'].includes(s.mode), 'Invalid mode');
  require(finite(s.jd) && s.jd >= MIN_JD && s.jd < (s.mode==='reality'?MAX_JD:SANDBOX_MAX_JD), 'Epoch outside the mode coverage: Reality 1800–2050, Sandbox 1800–2999');
  require(Array.isArray(s.bodies) && s.bodies.length <= MAX_BODIES, 'At most 20000 bodies are supported');
  require(s.bodies.filter(b=>!b.massless && b.mass>0).length<=MAX_MASSIVE,'At most 512 gravitational sources are supported');
  const ids = new Set();
  for (const b of s.bodies) {
    b.visible??=true;b.metadata??={};b.blackHole??=null;b.wormhole??=null;b.rocket??=null;b.spacecraft??=null;
    require(typeof b.visible==='boolean'&&typeof b.metadata==='object'&&!Array.isArray(b.metadata),'Invalid appearance/metadata');
    if(b.blackHole)require(finite(b.blackHole.diskSize)&&b.blackHole.diskSize>=3&&b.blackHole.diskSize<=1000&&finite(b.blackHole.temperature)&&b.blackHole.temperature>0,'Invalid accretion parameters');
    if(b.wormhole)require(typeof b.wormhole.pairId==='string'&&finite(b.wormhole.throatRadius)&&b.wormhole.throatRadius>0
      &&Array.isArray(b.wormhole.orientation)&&b.wormhole.orientation.length===4&&b.wormhole.orientation.every(finite)
      &&Math.hypot(...b.wormhole.orientation)>0&&finite(b.wormhole.cooldown)&&b.wormhole.cooldown>=.01,'Invalid wormhole');
    if(b.rocket) {
      const r=b.rocket;require(finite(r.separationSpeed??1)&&(r.separationSpeed??1)>=0&&(r.separationSpeed??1)<=100,'Invalid separation speed');require(Array.isArray(r.stages)&&r.stages.length>=1&&r.stages.length<=8,'Invalid rocket stages');
      require(Number.isInteger(r.stage)&&r.stage>=0&&r.stage<r.stages.length&&r.payloadMass>=0&&r.throttle>=0&&r.throttle<=1
        &&r.targetAltitude>=100000&&r.targetAltitude<=1e8&&r.area>0&&r.cd>=0&&vector(r.orientation),'Invalid rocket configuration');
      for(const stage of r.stages){require(Number.isInteger(stage.engineCount??1)&&(stage.engineCount??1)>0&&(stage.engineCount??1)<=100,'Invalid engine count');}
      for(const stage of r.stages)require(stage.dryMass>0&&stage.fuel>=0&&stage.fuel<=stage.capacity&&stage.thrust>0&&stage.isp>0,'Invalid engine/fuel configuration');
      b.mass=rocketMass(r);
    }
    if(b.spacecraft)require(b.spacecraft.range>0&&b.spacecraft.capacityWh>0&&b.spacecraft.battery>=0&&b.spacecraft.battery<=1
      &&b.spacecraft.solarWatts>=0&&b.spacecraft.loadWatts>=0&&vector(b.spacecraft.orientation),'Invalid spacecraft configuration');
    if(b.spacecraft?.transmitterPower!==undefined)require(finite(b.spacecraft.transmitterPower)&&b.spacecraft.transmitterPower>=0&&b.spacecraft.transmitterPower<=1e12,'Invalid transmitter power');
    if(b.spacecraft?.antennaGain!==undefined)require(finite(b.spacecraft.antennaGain)&&Math.abs(b.spacecraft.antennaGain)<=100,'Invalid antenna gain');
    b.collisionMode ??= 'inherit'; b.disrupted ??= false;
    require(['inherit','none','merge','bounce','fragment'].includes(b.collisionMode),'Invalid body collision mode');
    require(typeof b.disrupted==='boolean','Invalid disruption flag');
    require(typeof b.id === 'string' && b.id.length > 0 && b.id.length <= 80 && !ids.has(b.id), 'Invalid or duplicate body ID');
    ids.add(b.id);
    require(typeof b.name === 'string' && b.name.length > 0 && b.name.length <= 120, 'Invalid body name');
    require(TYPES.includes(b.type), 'Invalid body type');
    require(finite(b.mass) && b.mass >= 0 && b.mass <= 1e40, 'Mass must be 0–1e40 kg');
    require(finite(b.radius) && b.radius > 0 && b.radius <= 1e18, 'Radius must be > 0 and <= 1e18 m');
    require(vector(b.position) && b.position.every(x => Math.abs(x) <= 1e20), 'Invalid position');
    require(vector(b.velocity) && b.velocity.every(x => Math.abs(x) <= 1e12), 'Invalid velocity');
    require(b.density === null || (finite(b.density) && b.density > 0), 'Invalid density');
    require(vector(b.spin?.axis) && finite(b.spin?.period) && b.spin.period !== 0, 'Invalid spin');
    require(finite(b.axialTilt) && finite(b.temperature) && b.temperature >= 0, 'Invalid body properties');
    require(/^#[0-9a-f]{6}$/i.test(b.color), 'Use a six-digit hex color');
    require(typeof b.locked === 'boolean' && typeof b.massless === 'boolean', 'Invalid behavior flags');
    require(finite(b.luminosity) && b.luminosity >= 0 && finite(b.albedo) && b.albedo >= 0 && b.albedo <= 1, 'Invalid radiative properties');
    require(finite(b.trail?.length) && b.trail.length >= 0 && /^#[0-9a-f]{6}$/i.test(b.trail.color), 'Invalid trail');
    if (b.rings) require(finite(b.rings.inner) && b.rings.inner > 0 && finite(b.rings.outer)
      && b.rings.outer > b.rings.inner && b.rings.opacity >= 0 && b.rings.opacity <= 1, 'Invalid rings');
    if (b.atmosphere) require(finite(b.atmosphere.density) && b.atmosphere.density >= 0
      && finite(b.atmosphere.height) && b.atmosphere.height >= 0 && /^#[0-9a-f]{6}$/i.test(b.atmosphere.color), 'Invalid atmosphere');
  }
  for (const b of s.bodies) require(b.parentId === null || (ids.has(b.parentId) && b.parentId !== b.id), 'Invalid parent ID');
  if(s.ephemeris){const ep=s.ephemeris;require(finite(ep.startJD)&&finite(ep.endJD)&&ep.startJD<ep.endJD&&ep.startJD>=MIN_JD&&ep.endJD<MAX_JD&&ep.tracks&&typeof ep.tracks==='object','Invalid ephemeris coverage');
    for(const [id,samples] of Object.entries(ep.tracks)){require(ids.has(id)&&Array.isArray(samples)&&samples.length>=2&&samples.length<=129,'Invalid ephemeris track');let previous=-Infinity;
      for(const sample of samples){require(finite(sample.jd)&&sample.jd>previous&&vector(sample.position)&&vector(sample.velocity),'Invalid ephemeris sample');previous=sample.jd;}
      require(samples[0].jd<=ep.startJD+1e-8&&samples.at(-1).jd>=ep.endJD-1e-8,'Incomplete playback coverage');
    }
  }
  require(['scientific','visibility','educational','custom'].includes(s.view.scaleMode??'visibility'),'Invalid scale model');
  for(const key of ['distanceScale','planetScale','moonScale','spacecraftScale','trailScale','labelScale'])if(s.view[key]!==undefined)require(finite(s.view[key])&&s.view[key]>=.01&&s.view[key]<=1e6,'Invalid display scale: '+key);
  for(const key of ['smoothMotion','pauseVisualEffects','realDistances','realRadii','showMoons','showSOI','autoArrival','predictionPaths','transferPath','showAcceleration','showBarycenter','miniMap','pip','habitableZone','interior','discoveryNotifications'])if(s.view[key]!==undefined)require(typeof s.view[key]==='boolean','Invalid view flag: '+key);
  if(s.view.environment!=null)require(['magnetic','radiation'].includes(s.view.environment),'Invalid environmental layer');
  if(s.view.notificationCategory!=null)require(['mission','science','physics','all'].includes(s.view.notificationCategory),'Invalid notification category');
  if(s.view.sensorView!=null){const v=s.view.sensorView;require(v&&typeof v==='object'&&['forward','target','earth','sun'].includes(v.mode)&&finite(v.fov)&&v.fov>=.1&&v.fov<=120&&(v.targetId==null||typeof v.targetId==='string'&&v.targetId.length<=80),'Invalid optical sensor configuration');}
  require(Array.isArray(s.view.savedCameras)&&s.view.savedCameras.length<=100&&Array.isArray(s.view.keyframes)&&s.view.keyframes.length<=32,'Invalid camera collection');
  for(const c of [...s.view.savedCameras,...s.view.keyframes,...(s.view.camera?[s.view.camera]:[])])require((validPose(c)||vector(c.position)&&vector(c.target))&&['system','planetary','earth','vehicle','true'].includes(c.scale),'Invalid camera pose');
  s.settings = { ...DEFAULT_SETTINGS, ...s.settings };
  const p = s.settings;
  require(['auto','direct','tree'].includes(p.solver),'Invalid gravity solver');
  require(Number.isInteger(p.fragmentCount)&&p.fragmentCount>=2&&p.fragmentCount<=64,'Fragment count must be 2–64');
  require(finite(p.fragmentMinMass)&&p.fragmentMinMass>0&&finite(p.fragmentSpread)&&p.fragmentSpread>=0&&p.fragmentSpread<=10,'Invalid fragment properties');
  require(['equal','varied'].includes(p.fragmentDistribution),'Invalid fragment mass distribution');
  require(finite(p.tidalMultiplier)&&p.tidalMultiplier>=.1&&p.tidalMultiplier<=10,'Invalid tidal multiplier');
  require(['verlet','rk4','dopri'].includes(p.integrator),'Invalid integrator');
  for(const key of ['adaptive','roche','gr'])require(typeof p[key]==='boolean','Invalid '+key+' flag');
  require(finite(p.eta)&&p.eta>=0.001&&p.eta<=1,'eta must be 0.001–1');
  require(finite(p.minStep)&&p.minStep>=1e-9&&p.minStep<=p.stepSeconds,'Invalid minimum step');
  require(finite(p.rtol)&&p.rtol>=1e-13&&p.rtol<=0.01,'Invalid relative tolerance');
  require(finite(p.positionTolerance)&&p.positionTolerance>=1e-9&&p.positionTolerance<=1e9,'Invalid position tolerance');
  require(finite(p.velocityTolerance)&&p.velocityTolerance>=1e-12&&p.velocityTolerance<=1e6,'Invalid velocity tolerance');
  require(finite(p.theta)&&p.theta>=0&&p.theta<=1,'theta must be 0–1');
  require(['none','merge','bounce','fragment'].includes(p.collisionMode),'Invalid collision mode');
  require(finite(p.restitution)&&p.restitution>=0&&p.restitution<=1,'Restitution must be 0–1');
  require(finite(p.c)&&p.c>=1e5&&p.c<=1e12,'c must be 1e5–1e12 m/s');
  require(finite(p.gMultiplier) && p.gMultiplier >= 0 && p.gMultiplier <= 1000, 'G multiplier must be 0–1000');
  require(finite(p.softening) && p.softening >= 1 && p.softening <= 1e12, 'Softening must be 1–1e12 m');
  require(finite(p.stepSeconds) && p.stepSeconds >= 0.01 && p.stepSeconds <= 86400, 'Timestep must be 0.01–86400 seconds');
  require(finite(p.timeScale) && Math.abs(p.timeScale) >= .01 && Math.abs(p.timeScale) <= 4e8, 'Speed must be 0.01x–4e8x');
  if (s.mode === 'reality') require(['sun','mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'].every(id => ids.has(id)), 'Reality requires the eight planets and Sun');
  s.events ??= []; s.eventSerial ??= 0;
  require(Number.isSafeInteger(s.eventSerial)&&s.eventSerial>=0,'Invalid event serial');
  require(Array.isArray(s.events)&&s.events.length<=MAX_EVENTS,'At most 200 log events are supported');
  const eventIds=new Set();
  for(const event of s.events) {
    require(Number.isSafeInteger(event.id)&&event.id>0&&event.id<=s.eventSerial&&!eventIds.has(event.id),'Invalid event ID');eventIds.add(event.id);
    require(['merge','bounce','fragment','absorb','tidal','capture','traverse','staging','mission','burn','insertion','deploy','supernova','soi','apsis','landing','eclipse','experiment'].includes(event.kind),'Invalid event kind');
    require(finite(event.jd)&&event.jd>=MIN_JD&&event.jd<SANDBOX_MAX_JD,'Invalid event date');
    require(typeof event.message==='string'&&event.message.length<=1000,'Invalid event message');
    require(Array.isArray(event.bodyIds)&&event.bodyIds.length<=16&&event.bodyIds.every(x=>typeof x==='string'&&x.length<=80),'Invalid event body IDs');
    require(finite(event.energyDelta)&&finite(event.massDelta),'Invalid event accounting');
  }
  return s;
}
