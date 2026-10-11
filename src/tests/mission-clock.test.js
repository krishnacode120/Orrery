import {it,expect} from 'vitest';
import {createWorkerCore} from '../physics/workerCore.js';
import {makePreset} from '../physics/catalog.js';
import {certifyMission} from '../physics/certification.js';
it('actual worker mission clock is independent of 30/60/144 Hz request segmentation',async()=>{
 const s=makePreset('leo'),results=[];s.settings.computeMode='cpu';
 for(const fps of [30,60,144]){const core=createWorkerCore();core.initialize(s,false);let frame;for(let i=0;i<fps*4;i++)frame=await core.advanceAsync(1/fps,s.view.selected);results.push(Array.from(new Float64Array(frame.state)));expect(frame.stats.accepted).toBe(4);}
 expect(results[0]).toEqual(results[1]);expect(results[1]).toEqual(results[2]);
});
it('certification fails an unbound target encounter and distinguishes running from completion',()=>{
 const s=makePreset('leo'),b=s.bodies[1],options={vehicleId:b.id,targetId:s.bodies[0].id,minimumPeriapsis:100000,maximumApoapsis:1e7,completed:true};
 expect(certifyMission(s,options).status).toBe('SUCCESS');expect(certifyMission(s,{...options,completed:false}).status).toBe('RUNNING');
 b.velocity=[1e5,0,0];expect(certifyMission(s,options).status).not.toBe('SUCCESS');expect(certifyMission(s,options,{energyDrift:5,conservationReliable:true}).status).toBe('NUMERICALLY UNRELIABLE');
});
