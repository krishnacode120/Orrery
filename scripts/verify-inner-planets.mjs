import {writeFile,mkdir} from 'node:fs/promises';
import {stateAt} from '../src/physics/elements.js';
import {AU,julianDate,norm,sub,dot} from '../src/physics/units.js';
const rows=[],base=process.env.ORRERY_API_URL??'http://127.0.0.1:8000/api';
for(const date of ['2000-01-01','2026-10-12','2026-10-13','2030-01-01','2050-01-01'])for(const [id,target] of [['mercury','199'],['venus','299']]){
 try{
 const jd=julianDate(date),response=await fetch(base+'/horizons?target='+target+'&jd='+jd,{signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw new Error('HTTP '+response.status);
 const h=await response.json(),p=stateAt(id,jd),angular=Math.acos(Math.max(-1,Math.min(1,dot(h.position,p.position)/(norm(h.position)*norm(p.position)))))*180/Math.PI;
 const radialError=Math.abs(norm(h.position)-norm(p.position))/norm(h.position);
 rows.push({date,id,approxAU:norm(p.position)/AU,horizonsAU:norm(h.position)/AU,angularDegrees:angular,radialRelativeError:radialError,positionErrorMeters:norm(sub(h.position,p.position)),velocityErrorMS:norm(sub(h.velocity,p.velocity)),frame:h.frame,timeScale:h.timeScale,passed:angular<1&&radialError<.01});
 }catch(e){rows.push({date,id,passed:false,error:e.message});}
 console.log(rows.at(-1));
}
await mkdir('artifacts',{recursive:true});
await writeFile('artifacts/inner-planets-validation.json',JSON.stringify({source:base,criterion:'Direction within 1 degree and radius within 1%; diagnostic thresholds, not claimed model precision.',rows},null,2));
if(rows.some(x=>!x.passed))process.exitCode=1;
