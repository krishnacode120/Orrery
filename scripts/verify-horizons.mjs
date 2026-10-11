import {writeFile,mkdir} from 'node:fs/promises';
import {stateAt} from '../src/physics/elements.js';
import {julianDate,dot,norm,sub} from '../src/physics/units.js';
const epochs=process.argv[2]?[process.argv[2]]:['2000-01-01T12:00:00Z','2026-10-09T00:00:00Z','2031-01-01T00:00:00Z'];
const targets=[['mercury','199'],['venus','299'],['earth','3'],['mars','499'],['jupiter','5'],['saturn','6']],rows=[];
for(const date of epochs)for(const [body,target] of targets){
 const jd=julianDate(date);
 try{
  const response=await fetch('http://127.0.0.1:8000/api/horizons?target='+target+'&jd='+jd,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('Horizons proxy '+response.status+': '+await response.text());
  const actual=await response.json(),approximate=stateAt(body,jd),cosine=dot(actual.position,approximate.position)/(norm(actual.position)*norm(approximate.position)),angularErrorDegrees=Math.acos(Math.max(-1,Math.min(1,cosine)))*180/Math.PI;
  rows.push({date,jd,body,target,positionErrorMeters:norm(sub(actual.position,approximate.position)),velocityErrorMetersPerSecond:norm(sub(actual.velocity,approximate.velocity)),angularErrorDegrees,passed:angularErrorDegrees<1,timeScale:actual.timeScale,frame:actual.frame,cached:actual.cached});
 }catch(error){rows.push({date,body,target,unavailable:true,error:error.message});}
 console.log(rows.at(-1));
}
const report={model:'JPL Table 1 versus Horizons heliocentric J2000 ecliptic vectors. Earth is EMB (3), giants are system barycenters (5/6). Proxy epochs are UTC-tagged UT, not exact TDB.',criterion:'Angular error < 1 degree; position/velocity reported without an invented universal tolerance.',rows};
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/horizons-validation.json',JSON.stringify(report,null,2));
if(rows.some(x=>x.unavailable||!x.passed))process.exitCode=1;
