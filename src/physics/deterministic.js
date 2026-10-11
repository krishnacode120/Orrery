import {Engine} from './engine.js';
import {applyFuelBurn} from './flight.js';
import {norm,sub} from './units.js';
export function applyMissionCommand(engine,command){
 const b=engine.s.bodies.find(x=>x.id===command.bodyId);
 if(command.type==='burn'){if(!b)throw new Error('Replay burn body is missing');applyFuelBurn(b,command.vector);}
 else if(command.type==='control'){if(!b)throw new Error('Replay vehicle is missing');if(command.locked!==undefined)b.locked=command.locked;Object.assign(b.rocket??b.spacecraft,command.patch);}
 else if(command.type==='settings')Object.assign(engine.s.settings,command.patch);
 else throw new Error('Unsupported deterministic command');
}
export function replayMissionTape(tape){
 if(tape.version!==1||!Array.isArray(tape.steps)||tape.steps.length>200000||!Array.isArray(tape.commands)||tape.commands.length>4096)throw new Error('Invalid deterministic tape');
 const e=new Engine();e.load(tape.initial);const commands=[...tape.commands].sort((a,b)=>a.step-b.step);let cursor=0;
 for(let k=0;k<tape.steps.length;k++){
  while(commands[cursor]?.step===k)applyMissionCommand(e,commands[cursor++]);
  const dt=tape.steps[k];if(!Number.isFinite(dt)||dt<=0||dt>86400)throw new Error('Invalid recorded step');
  e.s.settings.stepSeconds=dt;e.advance(dt,{deterministic:true});
 }
 while(commands[cursor]?.step===tape.steps.length)applyMissionCommand(e,commands[cursor++]);
 if(cursor!==commands.length)throw new Error('Replay command refers to unavailable step');
 return e.s;
}
export function compareReplay(a,b,positionTolerance=1,velocityTolerance=1e-5){
 const differences=a.bodies.map(x=>{const y=b.bodies.find(y=>y.id===x.id);return {id:x.id,positionError:y?norm(sub(x.position,y.position)):null,velocityError:y?norm(sub(x.velocity,y.velocity)):null};});
 return {equivalent:a.bodies.length===b.bodies.length&&differences.every(x=>x.positionError!==null&&x.positionError<=positionTolerance&&x.velocityError<=velocityTolerance),positionTolerance,velocityTolerance,differences};
}
export class LogicalSimulation {
 constructor(scenario,quantum=.25){if(!Number.isFinite(quantum)||quantum<.01||quantum>86400)throw new Error('Invalid logical quantum');this.engine=new Engine();this.engine.load(scenario);this.quantum=quantum;this.tick=0;this.credit=0;this.commands=[];}
 schedule(tick,command){if(!Number.isInteger(tick)||tick<this.tick)throw new Error('Commands must be scheduled at a future logical tick');this.commands.push({tick,command});}
 renderElapsed(seconds,maxTicks=10000){if(!Number.isFinite(seconds)||seconds<0||!Number.isInteger(maxTicks)||maxTicks<1||maxTicks>200000)throw new Error('Invalid render elapsed input');this.credit+=seconds;let count=0;
  while(this.credit+1e-10>=this.quantum&&count<maxTicks){for(const entry of this.commands.filter(x=>x.tick===this.tick))applyMissionCommand(this.engine,entry.command);
   this.engine.s.settings.stepSeconds=this.quantum;this.engine.advance(this.quantum,{deterministic:true});this.credit-=this.quantum;this.tick++;count++;}
  return {ticks:count,backlogSeconds:Math.max(0,this.credit),state:this.engine.s};
 }
}
