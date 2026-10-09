import {create} from 'zustand';
import {useSimStore} from './useSimStore.js';
import {useUIStore} from './useUIStore.js';
import {checkpointHistory,restoreHistory,historyCounts} from './history.js';
import {validateScenario} from '../physics/scenario.js';
import {applyOperation,quickOperations,presetOperations} from '../physics/experimentOps.js';
import {DAY} from '../physics/units.js';
import {scenarioLibrary,localExperiment} from '../persistence.js';
const id=()=>crypto.randomUUID();
const clone=s=>structuredClone(s);
function keepView(s){const view=clone(useSimStore.getState().scenario.view),ids=new Set(s.bodies.map(b=>b.id));if(!ids.has(view.selected))view.selected=ids.has(s.view.selected)?s.view.selected:s.bodies[0]?.id??null;if(view.cameraTarget&&!ids.has(view.cameraTarget)){view.cameraTarget=null;view.cameraMode='free';view.navigation={...view.navigation,reference:'inertial',referenceId:null};}return validateScenario({...clone(s),view});}
export const useWhatIfStore=create((set,get)=>({
 active:false,original:null,baseline:null,originalHistory:null,originalLayout:null,branchId:null,parentId:null,changes:[],branches:[],result:null,sweep:null,busy:false,error:null,job:null,serial:0,autoCompare:true,
 options:{duration:DAY*365.25,resolution:80,maxMs:4000},overlay:true,baselinePaths:true,experimentPaths:true,before:null,after:null,chaos:[],
 begin(){
  if(get().active)return;if(useSimStore.getState().catalogActive)throw new Error('Return to the simulation before What-If.');if(useSimStore.getState().replayActive)throw new Error('Return to Live before What-If.');
  const sim=useSimStore.getState(),baseline=clone(sim.scenario),branchId=id(),parentId=baseline.branch?.id??id();
  const scenario=validateScenario({...clone(baseline),mode:'sandbox',ephemeris:null,branch:{id:branchId,parentId,epochJD:baseline.jd,name:'Experiment'},view:{...baseline.view,panel:'whatif'}});
  set({active:true,original:{scenario:baseline,paused:sim.paused},baseline,originalHistory:checkpointHistory(),originalLayout:useUIStore.getState().layout,branchId,parentId,changes:[],branches:[],result:null,sweep:null,error:null,before:null,after:null,chaos:[],job:null,busy:false,serial:get().serial+1});
  useSimStore.setState({scenario,paused:true,stepRequest:false,experimentActive:true,revision:sim.revision+1,stats:null,prediction:null,...restoreHistory()});useUIStore.getState().setLayout('whatif');
 },
 reset(){
  if(!get().active)return;const sim=useSimStore.getState(),s=get(),scenario=keepView({...clone(s.baseline),mode:'sandbox',ephemeris:null,branch:{id:s.branchId,parentId:s.parentId,epochJD:s.baseline.jd,name:'Experiment'}});
  useSimStore.setState({scenario,paused:true,stepRequest:false,revision:sim.revision+1,stats:null,prediction:null,...restoreHistory()});set({changes:[],result:null,sweep:null,job:null,busy:false,error:null,chaos:[],before:null,after:null,serial:s.serial+1});
 },
 exit(apply=false){
  const s=get();if(!s.active)return;const sim=useSimStore.getState(),experiment=clone(sim.scenario),target=keepView(s.original.scenario);restoreHistory(s.originalHistory);
  useSimStore.setState({scenario:target,experimentActive:false,paused:apply?true:s.original.paused,stepRequest:false,revision:sim.revision+1,stats:null,prediction:null,...historyCounts()});
  if(apply)useSimStore.getState().edit(()=>experiment);
  set({active:false,job:null,busy:false,chaos:[],result:null,sweep:null,serial:s.serial+1});useUIStore.getState().setLayout(s.originalLayout??'explore');
 },
 operate(operations,label='Parameter experiment'){
  if(!get().active)throw new Error('Enter What-If before editing an experiment');const list=Array.isArray(operations)?operations:[operations];
  useSimStore.getState().edit(s=>{for(const op of list)applyOperation(s,op);});set({changes:[...get().changes,{id:id(),jd:useSimStore.getState().scenario.jd,label,operations:clone(list)}].slice(-80),result:null,error:null});
 },
 quick(key){const s=useSimStore.getState().scenario;get().operate(quickOperations(s,key,id()),key);},
 preset(key){get().operate(presetOperations(useSimStore.getState().scenario,key,id()),'Experimental preset: '+key);},
 schedule(operation,jd){
  if(!get().active)throw new Error('Enter What-If first');if(jd<useSimStore.getState().scenario.jd)throw new Error('Scheduled changes must be at or after the current epoch');
  useSimStore.getState().edit(s=>s.experimentEvents.push({id:id(),jd,operation:clone(operation),executed:false}));set({result:null});
 },
 request(type='compare',parameters={}){
  if(!get().active)throw new Error('Enter What-If first');set({job:{type,parameters},serial:get().serial+1,busy:true,error:null});
 },
 cancel(){set({job:null,busy:false,serial:get().serial+1});},
 capture(which){if(!get().active)throw new Error('Enter What-If first');set({[which]:clone(useSimStore.getState().scenario)});},
 async save(name='What-If experiment'){
  if(!get().active)throw new Error('Enter What-If first');const scenario=clone(useSimStore.getState().scenario);scenario.name=(name.trim()||'What-If experiment').slice(0,120);scenario.branch.name=scenario.name;scenario.tags=[...new Set([...scenario.tags,'what-if','experimental'])].slice(0,20);
  await scenarioLibrary('save',scenario,scenario.branch.id);set({branches:[...get().branches,{id:scenario.branch.id,parentId:scenario.branch.parentId,name:scenario.name,jd:scenario.jd}].slice(-40)});return scenario;
 },
 fork(name='Child experiment'){
  if(!get().active)throw new Error('Enter What-If first');const sim=useSimStore.getState(),baseline=clone(sim.scenario),parentId=get().branchId,branchId=id();
  sim.edit(s=>s.branch={id:branchId,parentId,epochJD:s.jd,name:name.slice(0,120)});
  set({baseline,branchId,parentId,changes:[],result:null,sweep:null,job:null,busy:false,chaos:[],before:null,after:null,serial:get().serial+1});useSimStore.setState(restoreHistory());
 },
 planRandom(chaos=false){
  if(!get().active)throw new Error('Enter What-If first');const s=useSimStore.getState().scenario,candidates=s.bodies.filter(b=>!b.rocket&&!b.massless&&b.type!=='blackHole').slice(0,32);
  const operations=[];for(let i=0;i<(chaos?3:1)&&candidates.length;i++){const b=candidates.splice(Math.floor(Math.random()*candidates.length),1)[0],factor=Number((.85+Math.random()*.3).toFixed(3));operations.push({kind:i===1?'velocity':'mass',bodyId:b.id,mode:'multiply',value:factor,factor,vector:[0,0,0],relative:true});}set({chaos:operations});
 },
 executeRandom(){const ops=get().chaos;if(!ops.length)return;get().operate(ops,'Bounded random experiment');set({chaos:[]});},
 async recover(){
  if(get().active)throw new Error('Exit or apply the current experiment before recovery');
  const saved=await localExperiment();if(!saved)throw new Error('No saved experiment session');if(get().active)throw new Error('Exit or apply the current experiment before recovery');get().begin();const sim=useSimStore.getState();
  set({baseline:clone(saved.baseline),original:{scenario:clone(saved.original),paused:saved.originalPaused},originalHistory:null,branchId:saved.experiment.branch.id,parentId:saved.experiment.branch.parentId,changes:[],result:null});
  useSimStore.setState({scenario:keepView(saved.experiment),paused:true,revision:sim.revision+1});
 }
}));
