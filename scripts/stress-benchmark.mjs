import {writeFile,mkdir} from 'node:fs/promises';
import {Engine} from '../src/physics/engine.js';
import {stressScenario} from '../src/physics/scientific.js';
import {body} from '../src/physics/body.js';
import {AU,G,SOLAR_MASS} from '../src/physics/units.js';
const rows=[];
for(const count of [1000,5000,10000]){
 const s=stressScenario(count);
 for(let i=0;i<49;i++){const a=AU*(5+i*.1),angle=i*2.39996,v=Math.sqrt(G*SOLAR_MASS/a);s.bodies.push(body({id:'source-'+i,mass:1e24,radius:6e6,position:[a*Math.cos(angle),a*Math.sin(angle),0],velocity:[-v*Math.sin(angle),v*Math.cos(angle),0],collisionMode:'none'}));}
 for(const solver of ['direct','tree']){s.settings.solver=solver;const e=new Engine();e.load(s);const memory=process.memoryUsage().heapUsed,started=performance.now();const stats=e.advance(10*s.settings.stepSeconds,{deterministic:true,maxSteps:10});const elapsedMs=performance.now()-started;rows.push({count,massive:50,solver,elapsedMs,steps:stats.accepted,stepsPerSecond:stats.accepted*1000/elapsedMs,heapDeltaBytes:process.memoryUsage().heapUsed-memory});}
}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/stress-benchmark.json',JSON.stringify({runtime:process.version,scope:'Headless worker-equivalent CPU physics only; not FPS or total browser memory',rows},null,2));console.table(rows);
