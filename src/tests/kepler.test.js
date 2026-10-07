import { describe, expect, it } from 'vitest';
import { solveKepler, wrapAngle } from '../physics/kepler.js';
import { stateAt } from '../physics/elements.js';
import { AU, julianDate, fromJulianDate, norm } from '../physics/units.js';

describe('Kepler solver', () => {
  for (const e of [0,0.0167,0.7,0.99,0.999999]) {
    it(`solves elliptic orbits with e=${e}`, () => {
      for (const m of [-100,-Math.PI,-1,-0.000001,0,0.000001,1,Math.PI,100]) {
        const E=solveKepler(m,e);
        expect(Math.abs(E-e*Math.sin(E)-wrapAngle(m))).toBeLessThan(1e-10);
      }
    });
  }
  it('rejects unsupported inputs', () => {
    expect(()=>solveKepler(1,1)).toThrow();
    expect(()=>solveKepler(NaN,0.2)).toThrow();
  });
});

describe('Julian dates and ephemeris', () => {
  it('matches J2000 and Unix epoch', () => {
    expect(julianDate('2000-01-01T12:00:00Z')).toBe(2451545);
    expect(julianDate('1970-01-01T00:00:00Z')).toBe(2440587.5);
    expect(fromJulianDate(2451545).toISOString()).toBe('2000-01-01T12:00:00.000Z');
  });
  it('roundtrips a leap day within a millisecond', () => {
    const date=new Date('2024-02-29T21:45:00Z');
    expect(Math.abs(fromJulianDate(julianDate(date))-date)).toBeLessThanOrEqual(1);
  });
  it('places Earth near 1 AU with an orbital velocity near 30 km/s', () => {
    const state=stateAt('earth',2451545);
    expect(norm(state.position)/AU).toBeGreaterThan(.98);
    expect(norm(state.position)/AU).toBeLessThan(1.02);
    expect(norm(state.velocity)).toBeGreaterThan(29000);
    expect(norm(state.velocity)).toBeLessThan(31000);
  });
  it('differentiates the full Kepler solution', () => {
    const jd=julianDate('2032-06-01T00:00:00Z');
    const v=stateAt('mars',jd).velocity;
    const p0=stateAt('mars',jd-1/86400).position;
    const p1=stateAt('mars',jd+1/86400).position;
    expect(norm(v.map((x,i)=>x-(p1[i]-p0[i])/2))).toBeLessThan(1);
  });
  it('does not silently extrapolate outside the table interval', () => {
    expect(()=>stateAt('mars',julianDate('2100-01-01T00:00:00Z'))).toThrow();
  });
});
