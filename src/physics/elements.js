import { AU, DAY, J2000, MIN_JD, MAX_JD } from './units.js';
import { solveKepler } from './kepler.js';

// JPL Table 1: J2000 ecliptic, a [AU], angles [degrees], rates per century.
// https://ssd.jpl.nasa.gov/planets/approx_pos.html
export const ELEMENTS = {
  mercury: [[0.38709927,0.20563593,7.00497902,252.25032350,77.45779628,48.33076593],[0.00000037,0.00001906,-0.00594749,149472.67411175,0.16047689,-0.12534081]],
  venus: [[0.72333566,0.00677672,3.39467605,181.97909950,131.60246718,76.67984255],[0.00000390,-0.00004107,-0.00078890,58517.81538729,0.00268329,-0.27769418]],
  earth: [[1.00000261,0.01671123,-0.00001531,100.46457166,102.93768193,0],[0.00000562,-0.00004392,-0.01294668,35999.37244981,0.32327364,0]],
  mars: [[1.52371034,0.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891],[0.00001847,0.00007882,-0.00813131,19140.30268499,0.44441088,-0.29257343]],
  jupiter: [[5.20288700,0.04838624,1.30439695,34.39644051,14.72847983,100.47390909],[-0.00011607,-0.00013253,-0.00183714,3034.74612775,0.21252668,0.20469106]],
  saturn: [[9.53667594,0.05386179,2.48599187,49.95424423,92.59887831,113.66242448],[-0.00125060,-0.00050991,0.00193609,1222.49362201,-0.41897216,-0.28867794]],
  uranus: [[19.18916464,0.04725744,0.77263783,313.23810451,170.95427630,74.01692503],[-0.00196176,-0.00004397,-0.00242939,428.48202785,0.40805281,0.04240589]],
  neptune: [[30.06992276,0.00859048,1.77004347,-55.12002969,44.96476227,131.78422574],[0.00026291,0.00005105,0.00035372,218.46515314,-0.32241464,-0.00508664]],
};

export function positionAt(id, jd) {
  if (!ELEMENTS[id]) throw new Error(`No elements for ${id}`);
  const t = (jd - J2000) / 36525;
  const [base, rate] = ELEMENTS[id];
  const [a, e, inc, lon, peri, node] = base.map((v, i) => v + rate[i] * t);
  const rad = Math.PI / 180;
  const E = solveKepler((lon - peri) * rad, e);
  return orbitalPoint(a, e, inc, peri, node, E);
}

function orbitalPoint(a, e, inc, peri, node, E) {
  const rad = Math.PI / 180;
  const x = a * (Math.cos(E) - e) * AU;
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E) * AU;
  const w = (peri - node) * rad, o = node * rad, I = inc * rad;
  const cw = Math.cos(w), sw = Math.sin(w), co = Math.cos(o), so = Math.sin(o);
  const ci = Math.cos(I), si = Math.sin(I);
  return [(cw*co-sw*so*ci)*x+(-sw*co-cw*so*ci)*y,
    (cw*so+sw*co*ci)*x+(-sw*so+cw*co*ci)*y, sw*si*x+cw*si*y];
}

export function orbitPoints(id, jd, segments = 256) {
  const t = (jd-J2000)/36525;
  const [base, rate] = ELEMENTS[id];
  const [a,e,inc,,peri,node] = base.map((v,i) => v+rate[i]*t);
  return Array.from({length:segments+1}, (_,i) => orbitalPoint(a,e,inc,peri,node,i/segments*2*Math.PI));
}

export function stateAt(id, jd) {
  if (!Number.isFinite(jd) || jd < MIN_JD || jd >= MAX_JD)
    throw new Error('JPL approximation supports 1800–2050 only');
  // Differentiate the entire time-varying solution, including secular rates.
  const h = 0.001;
  const before = positionAt(id, jd - h), after = positionAt(id, jd + h);
  return { position: positionAt(id, jd), velocity: after.map((x, i) => (x - before[i]) / (2*h*DAY)) };
}
