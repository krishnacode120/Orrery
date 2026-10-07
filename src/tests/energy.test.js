import { expect, it } from 'vitest';
import { diagnostics, verlet } from '../physics/integrators.js';
import { body } from '../physics/body.js';
import { G } from '../physics/units.js';

it('bounds maximum energy drift below 1e-6 for 1000 complete circular orbits', () => {
  // Non-dimensional test: G*m_total=1, separation=1, period=2*pi.
  const bodies=[
    body({id:'a',mass:0.5/G,position:[-0.5,0,0],velocity:[0,-0.5,0]}),
    body({id:'b',mass:0.5/G,position:[0.5,0,0],velocity:[0,0.5,0]}),
  ];
  const settings={softening:0,gMultiplier:1}, initial=diagnostics(bodies,settings);
  const stepsPerOrbit=256, dt=2*Math.PI/stepsPerOrbit;
  let worst=0;
  for(let i=0;i<1000*stepsPerOrbit;i++) {
    verlet(bodies,dt,settings);
    const d=diagnostics(bodies,settings);
    worst=Math.max(worst,Math.abs((d.energy-initial.energy)/initial.energy));
  }
  console.log(`1000 orbits: maximum relative energy drift = ${worst}`);
  expect(worst).toBeLessThan(1e-6);
  const last=diagnostics(bodies,settings);
  expect(Math.abs((last.angular[2]-initial.angular[2])/initial.angular[2])).toBeLessThan(1e-10);
},30000);

it('retraces an orbit under fixed-step time reversal', () => {
  const bodies=[body({id:'a',mass:1/G,locked:true}),body({id:'b',mass:0,massless:true,position:[1,0,0],velocity:[0,1,0]})];
  for(let i=0;i<10000;i++)verlet(bodies,0.001,{softening:0});
  for(let i=0;i<10000;i++)verlet(bodies,-0.001,{softening:0});
  expect(Math.hypot(bodies[1].position[0]-1,...bodies[1].position.slice(1))).toBeLessThan(1e-9);
});
