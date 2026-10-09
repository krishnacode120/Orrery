import {it,expect,afterEach,vi} from 'vitest';
import {STARS,SYSTEMS,searchUniverse} from '../astronomy/catalog.js';
import {PC,LY,C,galacticCoordinates,galacticToEcliptic,equatorialToEcliptic,eclipticToEquatorial,relativeRender,formatDistance,lightDelay} from '../astronomy/coordinates.js';
import {relativisticCruise,interstellarMission,communicationTimeline} from '../astronomy/interstellar.js';
import {generateSystem,binarySystem,formationSystem,loadCatalogSystem,habitableZone,placePlanet} from '../astronomy/systems.js';
import {findEvents} from '../astronomy/events.js';
import {validateChallenge,missionAnalyst,apparentSky} from '../astronomy/analysis.js';
import {useExplorerStore} from '../store/useExplorerStore.js';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {useCameraStore} from '../store/useCameraStore.js';
import {validateScenario} from '../physics/scenario.js';
import {Engine} from '../physics/engine.js';
import {body} from '../physics/body.js';
import {makePreset,baseScenario} from '../physics/catalog.js';
import {G,AU,DAY,YEAR,norm,dot,sub,add,scale,SOLAR_MASS,EARTH_MASS} from '../physics/units.js';
afterEach(()=>vi.unstubAllGlobals());
it('bundles attributed catalog data and all requested nearby stars with missing data retained',()=>{
 expect(STARS.length).toBeGreaterThan(3000);
 for(const name of ['Sun','Proxima Centauri','Alpha Centauri A','Alpha Centauri B',"Barnard's Star",'Sirius A','Sirius B','Epsilon Eridani','Tau Ceti','Vega','Altair','Procyon A','Wolf 359','Lalande 21185'])expect(STARS.some(s=>s.name===name)).toBe(true);
 const proxima=STARS.find(s=>s.name==='Proxima Centauri');expect(norm(proxima.position)/LY).toBeGreaterThan(4.1);expect(norm(proxima.position)/LY).toBeLessThan(4.4);
 expect(STARS.find(s=>s.name==='Sirius A').mass).toBeNull();expect(SYSTEMS.find(s=>s.name==='TRAPPIST-1').planets).toHaveLength(7);expect(searchUniverse('Europa',makePreset('solar-now').bodies)[0].bodyId).toBe('europa');
 expect(searchUniverse('Andromeda').some(x=>x.id==='andromeda')).toBe(true);expect(searchUniverse('TRAPPIST-1 e').some(x=>x.type==='exoplanet')).toBe(true);
});
it('coordinate rotations preserve lengths and invert; galactic axes have expected longitudes',()=>{
 const v=[1,2,3],out=eclipticToEquatorial(equatorialToEcliptic(v));out.forEach((x,k)=>expect(x).toBeCloseTo(v[k],12));
 const g=galacticCoordinates(galacticToEcliptic([PC,0,0]));expect(Math.min(g.longitude,360-g.longitude)).toBeLessThan(1e-10);expect(g.latitude).toBeCloseTo(0,10);expect(g.distance/PC).toBeCloseTo(1,12);
 expect(relativeRender([1e20+1e7,2e20,0],[1e20,2e20,0],1e7)[0]).toBeCloseTo(1,2);expect(formatDistance(4.2*LY,'ly')).toContain('4.2');
});
it('relativistic cruise uses proper time and stable low-beta energy; massive FTL is rejected',()=>{
 const r=relativisticCruise(4.24*LY,.1*C,1000);expect(r.earthTime/YEAR).toBeCloseTo(42.4,8);expect(r.properTime/r.earthTime).toBeCloseTo(Math.sqrt(.99),12);
 expect(relativisticCruise(LY,1000,1000).kineticEnergy).toBeCloseTo(.5*1000*1000**2,-1);
 expect(()=>relativisticCruise(LY,C)).toThrow('below c');expect(()=>relativisticCruise(LY,-1)).toThrow();expect(()=>interstellarMission({distance:LY,acceleration:1,deceleration:0})).toThrow('both');
});
it('proper-acceleration missions respect distance, cruise limits, and elapsed-frame ordering',()=>{
 const r=interstellarMission({distance:4.24*LY,speed:.1*C,mass:1000,acceleration:9.81,deceleration:9.81});expect(r.speed).toBeCloseTo(.1*C,5);expect(r.earthTime).toBeGreaterThan(r.properTime);expect(r.coastTime).toBeGreaterThan(0);
 const short=interstellarMission({distance:1e6,speed:.9*C,acceleration:1,deceleration:1});expect(short.speed).toBeLessThan(.9*C);expect(short.coastTime).toBeCloseTo(0,6);expect(short.earthTime).toBeCloseTo(2000,0);expect(interstellarMission({distance:1,speed:.9*C,acceleration:1,deceleration:1}).earthTime).toBeCloseTo(2,12);
 const t=communicationTimeline(2451545,AU,60);expect((t.replyArrival-t.sent)*DAY).toBeCloseTo(2*AU/C+60,3);expect(lightDelay({position:[0,0,0]},{position:[AU,0,0]}).oneWay).toBeCloseTo(499.0047838,6);
});
it('catalog systems create valid local barycentric scenarios without mutating catalogs',()=>{
 const before=JSON.stringify(SYSTEMS);for(const system of SYSTEMS){const s=loadCatalogSystem(system);expect(()=>validateScenario(s)).not.toThrow();expect(s.bodies.length).toBeGreaterThan(1);expect(s.provenance.note).toContain('illustrative');const total=s.bodies.reduce((n,b)=>n+b.mass,0),center=s.bodies.reduce((v,b)=>add(v,scale(b.position,b.mass/total)),[0,0,0]);expect(norm(center)).toBeLessThan(.01);const e=new Engine();e.load(s);e.advance(1);expect(e.s.bodies.every(b=>b.position.every(Number.isFinite))).toBe(true);}
 expect(JSON.stringify(SYSTEMS)).toBe(before);
});
it('system generator is deterministic in physical configuration and enforces crowded bounds',()=>{
 const a=generateSystem({seed:9,moons:false}),b=generateSystem({seed:9,moons:false});expect(a.bodies.map(b=>[b.mass,b.position,b.velocity])).toEqual(b.bodies.map(b=>[b.mass,b.position,b.velocity]));expect(()=>validateScenario(a)).not.toThrow();
 expect(()=>generateSystem({count:16,inner:AU,outer:AU*1.01})).toThrow('crowded');
 const h=habitableZone(3.828e26);expect(h.inner/AU).toBeCloseTo(Math.sqrt(1/1.1),12);expect(habitableZone(0)).toBeNull();
});
it('binary sources orbit their barycenter with correct relative circular speed and conserve momentum',()=>{
 const s=binarySystem(),[a,b]=s.bodies,total=a.mass+b.mass;expect(norm(add(scale(a.position,a.mass/total),scale(b.position,b.mass/total)))).toBeLessThan(1e-4);expect(norm(add(scale(a.velocity,a.mass/total),scale(b.velocity,b.mass/total)))).toBeLessThan(1e-8);
 expect(norm(sub(a.velocity,b.velocity))).toBeCloseTo(Math.sqrt(G*total/AU),8);
 expect(validateChallenge(s,a.id,'binary',b.id).passed).toBe(true);expect(()=>validateScenario(binarySystem({triple:true}))).not.toThrow();
});
it('formation disk contains bounded non-sourcing dust and real gravitating proto-bodies',()=>{
 const s=formationSystem({count:16,dust:100});expect(s.bodies.filter(b=>b.massless)).toHaveLength(100);expect(s.bodies.filter(b=>b.metadata.disk&&!b.massless)).toHaveLength(16);expect(()=>validateScenario(s)).not.toThrow();expect(()=>formationSystem({count:600})).toThrow();
});
it('planet placement and challenge validation depend on physical state, not visual radius',()=>{
 const s=makePreset('leo'),sat=s.bodies.find(b=>b.spacecraft);const r=validateChallenge(s,sat.id,'circular');expect(r.passed).toBe(true);s.view.exaggeration=1e6;expect(validateChallenge(s,sat.id,'circular').passed).toBe(true);
 sat.velocity=[0,0,0];expect(validateChallenge(s,sat.id,'circular').passed).toBe(false);expect(missionAnalyst(s,sat.id,null).suggestions.length).toBeGreaterThan(0);
 expect(()=>placePlanet(s,{a:1,parentId:'earth'})).toThrow('surface');
});
it('bounded event finder uses a non-destructive numerical minimum with reported resolution',()=>{
 const s=baseScenario();s.settings={...s.settings,gMultiplier:0,roche:false,collisionMode:'none',stepSeconds:1};s.bodies=[body({id:'a',massless:true,position:[0,0,0]}),body({id:'b',massless:true,position:[-10,3,0],velocity:[1,0,0]})];
 const original=JSON.stringify(s),r=findEvents(s,{observerId:'a',targetId:'b',query:'closest',duration:20,samples:40,maxMs:3000});expect(r.complete).toBe(true);expect(r.events).toHaveLength(1);expect(r.events[0].distance).toBeCloseTo(3,7);expect((r.events[0].jd-s.jd)*DAY).toBeCloseTo(10,3);expect(r.events[0].uncertaintySeconds).toBe(.5);expect(JSON.stringify(s)).toBe(original);
 expect(()=>findEvents(s,{duration:-1})).toThrow();
});
it('observer sky uses physical radii and finite spherical horizon coordinates',()=>{
 const s=makePreset('solar-now'),earth=s.bodies.find(b=>b.id==='earth'),sky=apparentSky(earth,s.bodies,s.jd,{surface:true,latitude:45,longitude:10});expect(sky.every(x=>Number.isFinite(x.azimuth)&&Number.isFinite(x.elevation))).toBe(true);const j=sky.find(x=>x.id==='jupiter');expect(j.angularSize).toBeGreaterThan(0);
});
it('catalog exploration preserves state and selection cannot issue camera commands',()=>{
 const sim=useSimStore.getState(),old=useExplorerStore.getState(),ui=useUIStore.getState(),camera=useCameraStore.getState();vi.stubGlobal('localStorage',{setItem:vi.fn(),getItem:()=>null});
 try{useSimStore.setState({scenario:validateScenario(makePreset('solar-now')),paused:false,replayActive:false,experimentActive:false,catalogActive:false});const original=JSON.stringify(useSimStore.getState().scenario);
 useExplorerStore.getState().enter('nearby');const serial=useExplorerStore.getState().serial;useExplorerStore.getState().select('hyg-70666');expect(useExplorerStore.getState().serial).toBe(serial);expect(useSimStore.getState().catalogActive).toBe(true);expect(()=>useSimStore.getState().edit(d=>d.bodies[0].mass*=2)).toThrow('catalog');
 useExplorerStore.getState().leave();expect(useSimStore.getState().scenario).toEqual(JSON.parse(original));expect(useSimStore.getState().paused).toBe(false);
 useExplorerStore.getState().editable(loadCatalogSystem(SYSTEMS.find(x=>x.name==='Proxima Centauri')));expect(useSimStore.getState().scenario.mode).toBe('sandbox');useExplorerStore.getState().restoreSolar();expect(useSimStore.getState().scenario).toEqual(JSON.parse(original));
 }finally{useSimStore.setState(sim,true);useExplorerStore.setState(old,true);useUIStore.setState(ui,true);useCameraStore.setState(camera,true);}
});

it('rejects corrupted exploration sessions and unsafe rendering settings before navigation',async()=>{
 const {validateSession,validUniversePose}=await import('../astronomy/session.js');
 const s={name:'Test',section:'nearby',span:PC,jd:2451545,pose:{positionSI:[0,0,PC],targetSI:[0,0,0],orientation:[0,0,0,1],mode:'free',fov:42}};
 expect(validateSession(s).name).toBe('Test');expect(validUniversePose(s.pose)).toBe(true);
 expect(validateSession({...s,pose:{...s.pose,navigationSpeed:12345}}).pose.navigationSpeed).toBe(12345);
 expect(()=>validateSession({...s,pose:{...s.pose,navigationSpeed:Infinity}})).toThrow();
 expect(()=>validateSession({...s,jd:NaN})).toThrow();
 expect(()=>validateSession({...s,pose:{...s.pose,positionSI:[Infinity,0,0]}})).toThrow();
 expect(()=>validateSession({...s,name:{}})).toThrow();
 const base=makePreset('solar-now');base.view.sensorView={mode:'target',targetId:'earth',fov:30};
 expect(()=>validateScenario(base)).not.toThrow();base.view.sensorView.fov=-1;expect(()=>validateScenario(base)).toThrow('optical');
});
it('binary challenge rejects a bound collision-course orbit and event search examines the final interval',()=>{
 const binary=binarySystem(),[a,b]=binary.bodies;b.velocity=[...a.velocity];
 expect(validateChallenge(binary,a.id,'binary',b.id).passed).toBe(false);
 const s=baseScenario();s.settings={...s.settings,gMultiplier:0,roche:false,collisionMode:'none',stepSeconds:1};
 s.bodies=[body({id:'a',massless:true,position:[0,0,0]}),body({id:'b',massless:true,position:[-19.5,3,0],velocity:[1,0,0]})];
 const result=findEvents(s,{observerId:'a',targetId:'b',duration:20,samples:40,maxMs:3000});
 expect(result.events).toHaveLength(1);expect((result.events[0].jd-s.jd)*DAY).toBeCloseTo(19.5,3);
});
