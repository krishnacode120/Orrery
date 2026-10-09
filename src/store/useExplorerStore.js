import {create} from 'zustand';
import {useSimStore} from './useSimStore.js';
import {useCameraStore} from './useCameraStore.js';
import {useUIStore} from './useUIStore.js';
import {validateSession} from '../astronomy/session.js';
const read=key=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.slice(-100).filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'||x&&typeof x.id==='string'&&typeof x.label==='string'):[];}catch{return [];}};
const persist=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{throw new Error('Local exploration storage is unavailable');}};
export const useExplorerStore=create((set,get)=>({
 active:false,section:'nearby',selected:'hyg-0',systemId:null,pose:null,command:null,serial:0,span:30*3.085677581491367e16,baseline:null,solar:null,
 favorites:read('orrery-universe-favorites'),sessions:read('orrery-universe-sessions'),history:[],index:-1,educational:true,hz:true,labels:true,compare:[],overlay:null,
 update:patch=>set(patch),
 enter(section='nearby'){const sim=useSimStore.getState();if(sim.experimentActive||sim.replayActive)throw new Error('Exit What-If or recorded replay before catalog navigation');if(!get().active){const scenario=structuredClone(sim.scenario),pose=useCameraStore.getState().live?.pose;if(pose&&useCameraStore.getState().live?.pose)scenario.view.camera=structuredClone(pose);set({baseline:{scenario,paused:sim.paused},active:true});useSimStore.setState({paused:true,catalogActive:true,revision:sim.revision+1,stepRequest:false});}set({section,serial:get().serial+1,command:{type:'overview'}});useUIStore.getState().workspace({right:true});useSimStore.getState().configureView({panel:'universe'});},
 leave(){if(!get().active)return;const baseline=get().baseline,sim=useSimStore.getState();set({active:false,baseline:null});useSimStore.setState({scenario:baseline.scenario,paused:baseline.paused,catalogActive:false,revision:sim.revision+1,stats:null,stepRequest:false});useCameraStore.getState().request('load');},
 select(id){set({selected:id});},
 focus(id){set({selected:id,serial:get().serial+1,command:{type:'focus',id}});get().remember();},
 overview(section){get().enter(section);get().remember();},
 openSystem(id){get().enter('system');set({systemId:id,selected:id,serial:get().serial+1,command:{type:'overview'}});get().remember();},
 remember(){const s=get(),entry={section:s.section,selected:s.selected,systemId:s.systemId,span:s.span,pose:s.pose};const h=s.history.slice(0,s.index+1);h.push(structuredClone(entry));set({history:h.slice(-64),index:Math.min(63,h.length-1)});},
 travel(direction){const s=get(),index=s.index+direction;if(index<0||index>=s.history.length)return;const next=structuredClone(s.history[index]);get().enter(next.section);set({...next,index,serial:get().serial+1,command:{type:next.pose?'restore':'overview',pose:next.pose}});},
 scale(span){if(!Number.isFinite(span)||span<1000||span>1e24)throw new Error('Invalid exploration scale');set({span,serial:get().serial+1,command:{type:'scale',span}});},
 favorite(id,label,kind='object'){const list=get().favorites.some(x=>x.id===id)?get().favorites.filter(x=>x.id!==id):[...get().favorites,{id,label,kind}].slice(-100);persist('orrery-universe-favorites',list);set({favorites:list});},
 saveSession(name){const s=get(),sim=useSimStore.getState(),record=validateSession({id:crypto.randomUUID(),name:name.trim().slice(0,80)||'Exploration',section:s.section,selected:s.selected,systemId:s.systemId,span:s.span,pose:s.pose,jd:sim.scenario.jd,hz:s.hz,labels:s.labels,educational:s.educational,overlay:s.overlay});const list=[...s.sessions,record].slice(-30);persist('orrery-universe-sessions',list);set({sessions:list});return record;},
 removeSession(id){const list=get().sessions.filter(x=>x.id!==id);persist('orrery-universe-sessions',list);set({sessions:list});},
 loadSession(input){const record=validateSession(input);get().enter(record.section);set({section:record.section,selected:record.selected,systemId:record.systemId,span:record.span,sessionJD:record.jd,hz:!!record.hz,labels:!!record.labels,educational:!!record.educational,overlay:record.overlay??null,pose:record.pose,serial:get().serial+1,command:{type:record.pose?'restore':'overview',pose:record.pose}});},
 editable(scenario){const sim=useSimStore.getState();if(sim.experimentActive||sim.replayActive)throw new Error('Exit What-If or Replay before loading a system');const old=get().active?get().baseline:{scenario:structuredClone(sim.scenario),paused:sim.paused};if(!get().solar)set({solar:old});get().leave();useSimStore.getState().replace(scenario);useUIStore.getState().setLayout('physics');useSimStore.getState().configureView({panel:'builder'});},
 restoreSolar(){const s=get().solar;if(!s)throw new Error('No preserved simulation');if(useSimStore.getState().experimentActive||useSimStore.getState().replayActive)throw new Error('Exit What-If or replay first');get().leave();useSimStore.getState().replace(s.scenario);useSimStore.setState({paused:s.paused});set({solar:null});useUIStore.getState().setLayout('explore');},
}));
