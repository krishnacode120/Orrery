import {it,expect} from 'vitest';
import {makePreset} from '../physics/catalog.js';
import {Engine} from '../physics/engine.js';
import {createWorkerCore} from '../physics/workerCore.js';
import {validateScenario} from '../physics/scenario.js';
import {applyOperation,presetOperations,EXPERIMENT_PRESETS} from '../physics/experimentOps.js';
import {compareExperiments,compareSnapshots,sensitivity} from '../physics/experimentAnalysis.js';
import {useWhatIfStore} from '../store/useWhatIfStore.js';
import {useSimStore} from '../store/useSimStore.js';
import {useCameraStore} from '../store/useCameraStore.js';
import {checkpointHistory,restoreHistory} from '../store/history.js';
import {DAY,G,norm,sub,add,scale,julianDate} from '../physics/units.js';
import {propulsion,rocketMass} from '../physics/vehicles.js';
const safe=()=>{const s=makePreset('leo');s.settings.collisionMode='none';s.settings.roche=false;s.settings.stepSeconds=5;return s;};
it('What-If preserves the baseline, isolates undo, and exits without a camera command',()=>{
 const before=useSimStore.getState(),experimentBefore=useWhatIfStore.getState(),cameraBefore=useCameraStore.getState(),history=checkpointHistory();
 try{const s=makePreset('solar-now');useSimStore.setState({scenario:s,paused:false,experimentActive:false,replayActive:false});const cameraCommand=useCameraStore.getState().command;
 useWhatIfStore.getState().begin();const initialMass=s.bodies.find(b=>b.id==='jupiter').mass;useWhatIfStore.getState().quick('jupiter10');expect(useSimStore.getState().scenario.bodies.find(b=>b.id==='jupiter').mass).toBe(initialMass*10);
 expect(useWhatIfStore.getState().baseline).toEqual(s);expect(useSimStore.getState().scenario.mode).toBe('sandbox');useSimStore.getState().undo();expect(useSimStore.getState().scenario.bodies.find(b=>b.id==='jupiter').mass).toBe(initialMass);
 useWhatIfStore.getState().quick('removeMoon');useWhatIfStore.getState().reset();expect(useSimStore.getState().scenario.bodies.some(b=>b.id==='moon')).toBe(true);
 useWhatIfStore.getState().exit(false);expect(useSimStore.getState().scenario.bodies).toEqual(s.bodies);expect(useSimStore.getState().scenario.mode).toBe('reality');expect(useSimStore.getState().paused).toBe(false);expect(useCameraStore.getState().command).toBe(cameraCommand);
 }finally{useSimStore.setState(before,true);useWhatIfStore.setState(experimentBefore,true);useCameraStore.setState(cameraBefore,true);restoreHistory(history);}
});
it('Apply commits once and Undo restores the root; nested branches retain the root for Exit',()=>{
 const before=useSimStore.getState(),experimentBefore=useWhatIfStore.getState(),history=checkpointHistory();
 try{const s=makePreset('solar-now');useSimStore.setState({scenario:s,experimentActive:false,replayActive:false});useWhatIfStore.getState().begin();useWhatIfStore.getState().quick('removeMoon');const parent=useWhatIfStore.getState().branchId;useWhatIfStore.getState().fork('child');expect(useSimStore.getState().scenario.branch.parentId).toBe(parent);useWhatIfStore.getState().quick('g2');useWhatIfStore.getState().exit(false);expect(useSimStore.getState().scenario.bodies).toEqual(s.bodies);
 useWhatIfStore.getState().begin();useWhatIfStore.getState().quick('removeMoon');useWhatIfStore.getState().exit(true);expect(useSimStore.getState().scenario.bodies.some(b=>b.id==='moon')).toBe(false);useSimStore.getState().undo();expect(useSimStore.getState().scenario.bodies.some(b=>b.id==='moon')).toBe(true);
 }finally{useSimStore.setState(before,true);useWhatIfStore.setState(experimentBefore,true);restoreHistory(history);}
});
it('all 16 experimental presets produce valid serialized physics states',()=>{
 const s=makePreset('solar-now');for(const [key] of EXPERIMENT_PRESETS){const changed=structuredClone(s);changed.mode='sandbox';for(const op of presetOperations(changed,key,'created-'+key))applyOperation(changed,op);expect(validateScenario(JSON.parse(JSON.stringify(changed))).bodies.length).toBe(changed.bodies.length);}expect(s.bodies.length).toBe(27);
});
it('scheduled gravity and velocity changes execute at the boundary once and update drift baselines',()=>{
 const s=safe(),vehicle=s.bodies.find(b=>b.spacecraft);s.settings.gMultiplier=0;s.experimentEvents=[{id:'g',jd:s.jd+2/DAY,executed:false,operation:{kind:'gravity',mode:'set',value:0}},{id:'burn',jd:s.jd+4/DAY,executed:false,operation:{kind:'velocity',bodyId:vehicle.id,mode:'add',vector:[10,0,0]}}];
 const engine=new Engine();engine.load(s);const v=[...vehicle.velocity],p=[...vehicle.position];engine.advance(6);const current=engine.s.bodies.find(b=>b.id===vehicle.id);
 expect(current.velocity[0]).toBeCloseTo(v[0]+10,8);expect(current.position[0]).toBeCloseTo(p[0]+v[0]*6+20,2);expect(engine.s.experimentEvents.every(e=>e.executed)).toBe(true);expect(engine.s.events.filter(e=>e.kind==='experiment')).toHaveLength(2);expect(engine.advance(0).energyDrift).toBeCloseTo(0,8);engine.advance(2);expect(engine.s.events.filter(e=>e.kind==='experiment')).toHaveLength(2);
});
it('scheduled mass and G edits account for intentional energy changes, not numerical drift',()=>{
 const s=safe();s.bodies.find(b=>b.spacecraft).massless=false;s.experimentEvents=[{id:'change',jd:s.jd,executed:false,operation:{kind:'gravity',mode:'set',value:2}}];const e=new Engine();e.load(s);const d=e.advance(.01);expect(Math.abs(d.energyDrift)).toBeLessThan(1e-7);expect(d.eventEnergyDelta).not.toBe(0);expect(e.s.settings.gMultiplier).toBe(2);
});
it('future edits publish settings, execution flags and topology in one completed frame in both transports',()=>{
 for(const shared of [false,true]){
  const s=safe();s.settings.gMultiplier=0;const primary=s.bodies[0];s.experimentEvents=[
   {id:'mass',jd:s.jd+1/DAY,executed:false,operation:{kind:'mass',bodyId:primary.id,mode:'multiply',value:2}},
   {id:'gravity',jd:s.jd+1/DAY,executed:false,operation:{kind:'gravity',mode:'set',value:.5}}
  ];const core=createWorkerCore(),buffers=core.initialize(s,shared);core.advance(0);const frame=core.advance(2);
  expect(frame.settings.gMultiplier).toBe(.5);expect(frame.experimentEvents.every(e=>e.executed)).toBe(true);
  expect(frame.bodies.find(b=>b.id===primary.id).mass).toBe(primary.mass*2);
  expect(frame.events.filter(e=>e.kind==='experiment')).toHaveLength(2);
  expect(new Float64Array(buffers?.state??frame.state).length).toBeGreaterThanOrEqual(frame.count*6);
  expect(frame.jd).toBeGreaterThan(s.jd);
 }
});
it('failed future operations are atomic and recorded as rejected',()=>{
 const s=safe(),mass=s.bodies[0].mass;s.experimentEvents=[{id:'bad',jd:s.jd,executed:false,operation:{kind:'mass',bodyId:s.bodies[0].id,mode:'set',value:-1}}];const e=new Engine();e.load(s);e.advance(.01);expect(e.s.bodies[0].mass).toBe(mass);expect(e.s.experimentEvents[0].failed).toContain('Mass');expect(e.s.events[0].message).toContain('rejected');
});
it('new bodies/deletions and fragments obey topology, mass and momentum contracts',()=>{
 const s=makePreset('solar-now');s.mode='sandbox';const b=s.bodies.find(b=>b.id==='earth'),mass=b.mass,velocity=b.velocity;applyOperation(s,{kind:'fragment',bodyId:b.id,count:8});const chunks=s.bodies.filter(x=>x.disrupted);expect(chunks).toHaveLength(8);expect(chunks.reduce((n,x)=>n+x.mass,0)/mass).toBeCloseTo(1,14);const momentum=chunks.reduce((p,x)=>add(p,scale(x.velocity,x.mass/mass)),[0,0,0]);expect(norm(sub(momentum,velocity))).toBeLessThan(1e-8);expect(()=>validateScenario(s)).not.toThrow();
});
it('same-epoch dual predictions are non-destructive and identify actual differences',()=>{
 const s=safe(),experiment=structuredClone(s),vehicle=s.bodies.find(b=>b.spacecraft),before=structuredClone(s);applyOperation(experiment,{kind:'velocity',bodyId:vehicle.id,mode:'add',vector:[1,0,0]});
 const result=compareExperiments(s,experiment,{duration:30,resolution:8,maxMs:2000,ids:[vehicle.id]});expect(result.complete).toBe(true);expect(result.comparison.aligned).toBe(true);expect(result.maxSampledDeviation[vehicle.id]).toBeGreaterThan(20);expect(s).toEqual(before);
 const same=compareExperiments(s,s,{duration:30,resolution:8,maxMs:2000,ids:[vehicle.id]});expect(same.comparison.rows.every(r=>r.positionDifference===0)).toBe(true);expect(same.comparison.energyDifference).toBe(0);
});
it('comparison aligns a frozen baseline and never compares mismatched partial epochs',()=>{
 const s=safe(),e=new Engine();e.load(s);e.advance(30);const changed=structuredClone(e.s),result=compareExperiments(s,changed,{duration:30,resolution:8,maxMs:2000,ids:[changed.view.selected]});expect(result.complete).toBe(true);expect(result.startJD).toBeCloseTo(changed.jd,9);expect(result.comparison.aligned).toBe(true);
 const snapshots=compareSnapshots(s,changed);expect(snapshots.aligned).toBe(false);
});
it('long predictions report incomplete reached horizons rather than extrapolating',()=>{
 const s=safe(),r=compareExperiments(s,s,{duration:100*365.25*DAY,maxMs:100,resolution:256});expect(r.complete).toBe(false);expect(r.advanced).toBeLessThan(r.requested);expect(r.reason).toBeTruthy();
});
it('bounded sensitivity ranks only completed samples and provides real date-transfer estimates',()=>{
 const s=makePreset('solar-now'),r=sensitivity(s,{kind:'departure',start:julianDate('2031-01-01'),end:julianDate('2031-03-01'),samples:3,maxMs:2000,transferDays:259});expect(r.rows).toHaveLength(3);expect(r.bestDV.totalDV).toBeGreaterThan(0);expect(r.bestDV.totalDV).toBe(Math.min(...r.rows.filter(x=>x.complete).map(x=>x.totalDV)));
 expect(()=>sensitivity(s,{kind:'mass',start:2,end:1})).toThrow();
});
it('Sandbox integrates beyond 2050 while Reality retains its table boundary',()=>{
 const s=safe();s.jd=julianDate('2126-01-01');expect(validateScenario(s).jd).toBe(s.jd);const e=new Engine();e.load(s);expect(e.advance(1).advanced).toBeCloseTo(1,8);expect(()=>validateScenario({...makePreset('solar-now'),jd:s.jd})).toThrow();
});
it('stage separation inherits position, conserves momentum and continues as a physical body',()=>{
 const s=makePreset('rocket'),b=s.bodies.find(b=>b.rocket),parent=s.bodies.find(x=>x.id===b.parentId),r=b.rocket;r.phase='ignition';r.throttle=0;r.autopilot=false;r.stageRequested=true;r.separationSpeed=3;b.locked=false;b.position=add(parent.position,[parent.radius+200000,0,0]);b.velocity=[10,20,30];const mass=rocketMass(r),before=[...b.position],stages=[];
 propulsion(b,parent,.01,s.jd,s.settings,()=>{},stage=>stages.push(stage));
 expect(stages).toHaveLength(1);expect(stages[0].position).toEqual(before);expect(b.mass+stages[0].mass).toBeCloseTo(mass,5);const velocity=add(scale(b.velocity,b.mass/mass),scale(stages[0].velocity,stages[0].mass/mass));expect(norm(sub(velocity,[10,20,30]))).toBeLessThan(1e-7);expect(norm(sub(b.velocity,stages[0].velocity))).toBeCloseTo(3,7);
});
