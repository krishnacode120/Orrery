export const G = 6.67430e-11;
export const AU = 149597870700;
export const DAY = 86400;
export const SOLAR_MASS = 1.98847e30;
export const EARTH_MASS = 5.9722e24;
export const EARTH_RADIUS = 6371000;
export const SOLAR_RADIUS = 695700000;
export const YEAR = 365.25 * DAY;
export const OBLIQUITY = 23.43928*Math.PI/180;
export const EARTH_AXIS = [0,-Math.sin(OBLIQUITY),Math.cos(OBLIQUITY)];
export const unit = v => { const n=Math.hypot(...v); return n?v.map(x=>x/n):[1,0,0]; };
export const add = (a,b) => a.map((x,i)=>x+b[i]);
export const sub = (a,b) => a.map((x,i)=>x-b[i]);
export const scale = (a,s) => a.map(x=>x*s);
export const UNITS = { kg:1, 'M⊕':EARTH_MASS, 'M☉':SOLAR_MASS, m:1, km:1000,
  AU, 'R⊕':EARTH_RADIUS, 'R☉':SOLAR_RADIUS, 'm/s':1, 'km/s':1000,
  'light-seconds':299792458, 'light-minutes':299792458*60, 'light-hours':299792458*3600, 'light-days':299792458*DAY, ly:299792458*YEAR, pc:AU*648000/Math.PI,
  s:1, d:DAY, yr:YEAR, rad:1, deg:Math.PI/180 };
export const J2000 = 2451545;
export const MIN_JD = 2378496.5; // 1800-01-01 UTC
export const MAX_JD = 2470172.5; // 2051-01-01 UTC, exclusive: approximate Reality table
export const SANDBOX_MAX_JD = 2816787.5; // 3000-01-01 UTC, exclusive: integrated Sandbox

export function julianDate(date = new Date()) {
  const ms = new Date(date).getTime();
  if (!Number.isFinite(ms)) throw new Error('Invalid date');
  return ms / 86400000 + 2440587.5;
}

export function fromJulianDate(jd) {
  if (!Number.isFinite(jd)) throw new Error('Invalid Julian date');
  return new Date((jd - 2440587.5) * 86400000);
}

export const norm = (v) => Math.hypot(...v);
export const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
