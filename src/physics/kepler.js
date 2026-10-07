const TAU = 2 * Math.PI;
export const wrapAngle = (x) => ((x + Math.PI) % TAU + TAU) % TAU - Math.PI;

// Safeguarded Newton-Raphson: the bracket guarantees convergence near e = 1.
export function solveKepler(meanAnomaly, eccentricity, tolerance = 1e-10) {
  if (!Number.isFinite(meanAnomaly) || !(eccentricity >= 0 && eccentricity < 1)
    || !(tolerance > 0)) throw new Error('Expected finite M and 0 <= e < 1');
  const m = wrapAngle(meanAnomaly);
  let lo = -Math.PI, hi = Math.PI;
  let e = eccentricity < 0.8 ? m : (m < 0 ? -Math.PI : Math.PI);
  for (let i = 0; i < 100; i++) {
    const f = e - eccentricity * Math.sin(e) - m;
    if (Math.abs(f) <= tolerance * (1 - eccentricity)) return e;
    if (f > 0) hi = e; else lo = e;
    const next = e - f / (1 - eccentricity * Math.cos(e));
    const candidate = next > lo && next < hi ? next : (lo + hi) / 2;
    if (Math.abs(candidate - e) < tolerance) return candidate;
    e = candidate;
  }
  throw new Error('Kepler solver failed to converge');
}
