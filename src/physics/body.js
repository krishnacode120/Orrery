import { G, SOLAR_MASS, julianDate } from './units.js';
import { stateAt } from './elements.js';
import { C } from './limits.js';

export const TYPES = ['star','planet','moon','dwarf','asteroid','comet','neutronStar',
  'pulsar','whiteDwarf','blackHole','wormholeMouth','rogue','spacecraft','satellite','rocket','custom'];
export const DEFAULT_SETTINGS = { gMultiplier: 1, softening: 1000, stepSeconds: 1800, timeScale: 86400,
  integrator: 'verlet', adaptive: false, eta: 0.2, minStep: 1e-6, rtol: 1e-9,
  positionTolerance: 1, velocityTolerance: 1e-4, theta: 0.5,
  collisionMode: 'merge', restitution: 0.8, roche: true, gr: false, c: C,
  solver: 'auto', computeMode:'cpu', fragmentCount: 8, fragmentSpread: 1, fragmentMinMass: 1,
  fragmentDistribution: 'equal', tidalMultiplier: 1 };
const planets = [
  ['mercury','Mercury',3.3011e23,2.4397e6,'#b6a596',1407.6,0.034],
  ['venus','Venus',4.8675e24,6.0518e6,'#eac58f',-5832.5,177.36],
  ['earth','Earth · EMB',6.0457e24,6.371e6,'#43a4ee',23.934,23.44],
  ['mars','Mars',6.4171e23,3.3895e6,'#e57c59',24.623,25.19],
  ['jupiter','Jupiter',1.8982e27,6.9911e7,'#d9b390',9.925,3.13],
  ['saturn','Saturn',5.6834e26,5.8232e7,'#daca98',10.7,26.73],
  ['uranus','Uranus',8.6810e25,2.5362e7,'#86d8df',-17.24,97.77],
  ['neptune','Neptune',1.02413e26,2.4622e7,'#5275fa',16.11,28.32],
];

export function body(values) {
  const b = { id: values.id, name: 'Body', type: 'custom', mass: 1, radius: 1,
    density: null, position: [0,0,0], velocity: [0,0,0],
    spin: { axis: [0,0,1], period: 86400 }, axialTilt: 0,
    color: '#9ceeff', texture: null, material: 'rock', temperature: 280,
    luminosity: 0, albedo: 0.3, atmosphere: null, rings: null,
    trail: { length: 200, color: '#6ddde8' }, locked: false, massless: false,
    parentId: null, collisionMode: 'inherit', disrupted: false,
    visible: true, metadata: {}, blackHole: null, wormhole: null, rocket: null, spacecraft: null,
    createdAt: new Date().toISOString(), ...values };
  return b;
}

export function solarSystem(jd = julianDate()) {
  return [body({ id: 'sun', name: 'Sun', type: 'star', mass: SOLAR_MASS,
    radius: 6.957e8, color: '#ffd395', temperature: 5772, luminosity: 3.828e26 }),
  ...planets.map(([id,name,mass,radius,color,period,axialTilt]) => body({
    id,name,mass,radius,color,axialTilt,type:'planet',parentId:'sun',
    spin:{axis:[0,0,1],period:period*3600}, ...stateAt(id,jd),
    material: ['jupiter','saturn','uranus','neptune'].includes(id)?'gas':id==='earth'?'earth':'rock',
    atmosphere: ['earth','venus','mars','neptune'].includes(id)?{density:id==='earth'?1.225:0.02,color, height:id==='earth'?100000:60000}:null,
    rings: id === 'saturn' ? { inner: 7.4e7, outer: 1.4e8, opacity: 0.65, texture: null } : null,
  }))];
}

export function derived(b, settings={}) {
  const g=G*(settings.gMultiplier??1);
  return { density: b.density ?? b.mass / (4/3*Math.PI*b.radius**3),
    surfaceGravity: g*b.mass/b.radius**2, escapeVelocity: Math.sqrt(2*g*b.mass/b.radius) };
}
