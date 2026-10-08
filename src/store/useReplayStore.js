import {create} from 'zustand';
import {validateScenario} from '../physics/scenario.js';
const LIMIT=32*1024*1024;
export function validateReplay(input){
 if(input?.version!==1||!Array.isArray(input.frames)||input.frames.length<1||input.frames.length>240)throw new Error('Replay requires 1–240 recorded snapshots');
 return {version:1,name:String(input.name??'Mission replay').slice(0,120),frames:input.frames.map(frame=>({scenario:validateScenario(frame.scenario),wallTime:Number.isFinite(frame.wallTime)?frame.wallTime:0}))};
}
export const useReplayStore=create((set,get)=>({
 recording:false,frames:[],bytes:0,error:null,playback:false,playing:false,index:0,live:null,
 start(){set({recording:true,frames:[],bytes:0,error:null});},
 stop(){set({recording:false});},
 capture(s){
  if(!get().recording||get().playback)return;
  if(s.bodies.length>1000){set({recording:false,error:'Exact replay recording is limited to 1,000 bodies.'});return;}
  const frame={scenario:structuredClone(s),wallTime:Date.now()},bytes=new TextEncoder().encode(JSON.stringify(frame)).length;
  if(get().frames.length>=240||get().bytes+bytes>LIMIT){set({recording:false,error:'Replay snapshot budget reached (240 frames / 32 MiB).'});return;}
  if(get().frames.at(-1)?.scenario.jd===s.jd)return;
  set({frames:[...get().frames,frame],bytes:get().bytes+bytes});
 },
 load(input){const data=validateReplay(input),bytes=new TextEncoder().encode(JSON.stringify(data)).length;if(bytes>LIMIT)throw new Error('Replay exceeds 32 MiB');set({frames:data.frames,bytes,index:0,recording:false,playing:false,error:null});},
}));
