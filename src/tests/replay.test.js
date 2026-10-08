import {it,expect} from 'vitest';
import {makePreset} from '../physics/catalog.js';
import {useReplayStore,validateReplay} from '../store/useReplayStore.js';
import {useSimStore} from '../store/useSimStore.js';
import {enterReplay,replayFrame,exitReplay} from '../useReplay.js';
it('replay captures immutable exact snapshots and never fabricates uncaptured states',()=>{
 const replay=useReplayStore.getState(),s=makePreset('leo');replay.start();replay.capture(s);const first=structuredClone(useReplayStore.getState().frames[0].scenario);
 s.jd+=1/86400;s.bodies[1].position[0]+=123;replay.capture(s);replay.stop();expect(useReplayStore.getState().frames).toHaveLength(2);expect(useReplayStore.getState().frames[0].scenario).toEqual(first);
 const data=validateReplay({version:1,frames:useReplayStore.getState().frames});expect(data.frames[1].scenario.bodies[1].position).toEqual(s.bodies[1].position);
});
it('replay seeking is read-only and Return to Live restores exact physical state',()=>{
 const s=makePreset('leo'),replay=useReplayStore.getState();replay.start();replay.capture(s);s.jd+=10/86400;s.bodies[1].velocity[0]+=5;replay.capture(s);replay.stop();
 const live=makePreset('rocket');useSimStore.getState().replace(live);const before=structuredClone(useSimStore.getState().scenario);enterReplay();expect(useSimStore.getState().replayActive).toBe(true);expect(()=>useSimStore.getState().edit(d=>d.bodies[0].mass*=2)).toThrow('read-only');
 replayFrame(1);expect(useSimStore.getState().scenario.bodies).toEqual(validateReplay({version:1,frames:useReplayStore.getState().frames}).frames[1].scenario.bodies);
 exitReplay();expect(useSimStore.getState().replayActive).toBe(false);expect(useSimStore.getState().scenario.bodies).toEqual(before.bodies);expect(useSimStore.getState().scenario.jd).toBe(before.jd);
});
it('invalid replay and excessive recording counts are rejected explicitly',()=>{
 expect(()=>validateReplay({version:2,frames:[]})).toThrow();expect(()=>validateReplay({version:1,frames:[{scenario:{}}]})).toThrow();
 const s=makePreset('empty');s.bodies=Array.from({length:1001},(_,i)=>({id:String(i)}));const r=useReplayStore.getState();r.start();r.capture(s);expect(useReplayStore.getState().recording).toBe(false);expect(useReplayStore.getState().error).toContain('1,000 bodies');
});
