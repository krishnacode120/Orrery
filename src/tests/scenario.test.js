import { expect, it } from 'vitest';
import { Engine } from '../physics/engine.js';
import { solarSystem, DEFAULT_SETTINGS } from '../physics/body.js';
import { validateScenario } from '../physics/scenario.js';
import { editWithHistory, travel } from '../store/history.js';

const scenario=()=>({version:1,name:'Test',mode:'sandbox',jd:2451545,settings:{...DEFAULT_SETTINGS},bodies:solarSystem(2451545),events:[],eventSerial:0});

it('roundtrips every scenario property through JSON losslessly',()=>{
  const s=validateScenario(scenario());
  expect(validateScenario(JSON.parse(JSON.stringify(s)))).toEqual(s);
});
it('rejects malformed state vectors and duplicate identities',()=>{
  const s=scenario();s.bodies[0].position[0]=Infinity;
  expect(()=>validateScenario(s)).toThrow();
  const t=scenario();t.bodies.push(t.bodies[0]);expect(()=>validateScenario(t)).toThrow();
});
it('supports undo and redo of a live mass edit',()=>{
  const s=scenario(), mass=s.bodies[5].mass;
  const next=editWithHistory(s,draft=>{draft.bodies[5].mass*=1000;});
  const restored=travel(next,'undo');
  expect(restored.bodies[5].mass).toBe(mass);
  expect(travel(restored,'redo')).toEqual(next);
});
it('never advances its clock beyond the integrated time budget',()=>{
  const engine=new Engine();engine.load(scenario());
  const d=engine.advance(1e8);
  expect(d.limited).toBe(true);
  expect(d.steps).toBeGreaterThan(0);
  expect(d.steps).toBeLessThanOrEqual(512);
  expect(engine.s.jd).toBeCloseTo(2451545+d.advanced/86400,9);
});
it('resets its conservation baseline on a live edit',()=>{
  const engine=new Engine();engine.load(scenario());engine.advance(86400);
  const s=structuredClone(engine.s);s.bodies[5].mass*=1000;engine.load(s);
  expect(engine.advance(0).energyDrift).toBe(0);
});

it('UI assignment-expression edits preserve the scenario contract and can be undone',async()=>{
 const {useSimStore}=await import('../store/useSimStore.js');
 const store=useSimStore.getState();store.preset('leo');
 store.edit(s=>s.settings.integrator='rk4');expect(useSimStore.getState().scenario.settings.integrator).toBe('rk4');
 store.edit(s=>s.bodies[1].spacecraft.payload='active');expect(useSimStore.getState().scenario.bodies[1].spacecraft.payload).toBe('active');
 store.undo();expect(useSimStore.getState().scenario.bodies[1].spacecraft.payload).toBe('standby');
});
