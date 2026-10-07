import { stateAt } from '../src/physics/elements.js';
import { julianDate, dot, norm } from '../src/physics/units.js';

const date=process.argv[2] ?? '2026-10-04T00:00:00Z';
const jd=julianDate(date);
const response=await fetch(`http://127.0.0.1:8000/api/horizons?target=499&jd=${jd}`,{signal:AbortSignal.timeout(30000)});
if(!response.ok)throw new Error(`Horizons proxy failed (${response.status}): ${await response.text()}`);
const actual=await response.json(), approximate=stateAt('mars',jd);
const cosine=dot(actual.position,approximate.position)/(norm(actual.position)*norm(approximate.position));
const degrees=Math.acos(Math.min(1,Math.max(-1,cosine)))*180/Math.PI;
console.log(JSON.stringify({date,jd,target:'Mars',angularErrorDegrees:degrees,limitDegrees:1,source:actual.source,cached:actual.cached},null,2));
if(degrees>=1)process.exitCode=1;
