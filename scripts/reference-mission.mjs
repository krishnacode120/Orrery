import {writeFile,mkdir} from 'node:fs/promises';
import {runReferenceMission} from '../src/physics/referenceMission.js';
import {replayMissionTape,compareReplay} from '../src/physics/deterministic.js';
const started=performance.now();
const result=await runReferenceMission({progress:p=>{if(p.phase.includes('target')||p.fraction===1)console.log(p.phase,p.error??'');}});
if(result.status==='SUCCESS'){const replayed=replayMissionTape(result.tape);result.replay=compareReplay(result.final,replayed);if(!result.replay.equivalent)result.status='NUMERICALLY UNRELIABLE';}
await mkdir('artifacts',{recursive:true});
await writeFile('artifacts/reference-mission-result.json',JSON.stringify({...result,snapshots:undefined},null,2));
console.log(JSON.stringify({status:result.status,error:result.error,metrics:result.metrics,checks:result.checks,replay:result.replay,steps:result.tape.steps.length,elapsedMs:performance.now()-started},null,2));
process.exitCode=result.status==='SUCCESS'?0:1;