import { expect, it } from 'vitest';
import { verlet, accelerations } from '../physics/integrators.js';
import { G, AU, SOLAR_MASS, norm } from '../physics/units.js';
import { body } from '../physics/body.js';

it('measures a two-body period matching 2*pi*sqrt(a^3/GM)', () => {
  const mass=SOLAR_MASS, secondary=5.9722e24, mu=G*(mass+secondary);
  const period=2*Math.PI*Math.sqrt(AU**3/mu), speed=Math.sqrt(mu/AU);
  const ratio=secondary/(mass+secondary);
  const bodies=[body({id:'sun',mass,position:[-AU*ratio,0,0],velocity:[0,-speed*ratio,0]}),
    body({id:'earth',mass:secondary,position:[AU*(1-ratio),0,0],velocity:[0,speed*(1-ratio),0]})];
  const dt=period/4096;
  let measured=0, previous=0;
  for(let i=1;i<=4200;i++) {
    verlet(bodies,dt,{softening:0});
    const y=bodies[1].position[1]-bodies[0].position[1];
    if(previous<0 && y>=0) { measured=(i-1+(-previous)/(y-previous))*dt; break; }
    previous=y;
  }
  expect(measured).toBeGreaterThan(0);
  expect(Math.abs(measured/period-1)).toBeLessThan(1e-5);
});

it('test particles feel gravity but do not exert it', () => {
  const bodies=[body({id:'a',mass:1e20}),body({id:'b',mass:1e30,massless:true,position:[1000,0,0]})];
  const a=accelerations(bodies,{softening:0});
  expect(norm(a[0])).toBe(0);
  expect(a[1][0]).toBeCloseTo(-G*1e20/1e6,6);
});
