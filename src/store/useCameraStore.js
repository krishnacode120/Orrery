import {create} from 'zustand';
import {validPose} from '../navigation/settings.js';
let bookmarks=[];try{const parsed=JSON.parse(localStorage.getItem('orrery-camera-bookmarks')||'[]');if(Array.isArray(parsed))bookmarks=parsed.filter(validPose).slice(0,100);}catch{}
let serial=0;
export const useCameraStore=create((set,get)=>({
 command:null,live:null,bookmarks,history:[],index:-1,debug:false,performance:false,frameRevision:0,
 request(type,data={}){set({command:{...data,type,serial:++serial}});},
 publish(live){set({live});},
 record(pose){if(!validPose(pose))return;const s=get(),list=s.history.slice(0,s.index+1);list.push(structuredClone(pose));set({history:list.slice(-64),index:Math.min(63,list.length-1)});},
 travel(direction){const s=get(),index=Math.max(0,Math.min(s.history.length-1,s.index+direction));if(index===s.index)return;const history=s.history.map((p,i)=>i===s.index&&validPose(s.live?.pose)?structuredClone(s.live.pose):p);set({index,history});get().request('restore',{pose:s.history[index],history:false});},
 save(name){const p=get().live?.pose;if(!validPose(p))throw new Error('Camera is still initializing');const list=[...get().bookmarks,{...structuredClone(p),id:crypto.randomUUID(),name:name.trim().slice(0,80)||'Viewpoint'}].slice(-100);get().storeBookmarks(list);},
 storeBookmarks(bookmarks){set({bookmarks});try{localStorage.setItem('orrery-camera-bookmarks',JSON.stringify(bookmarks));}catch{}},
 rename(id,name){get().storeBookmarks(get().bookmarks.map(p=>p.id===id?{...p,name:name.slice(0,80)}:p));},
 remove(id){get().storeBookmarks(get().bookmarks.filter(p=>p.id!==id));},
 toggle(key){set({[key]:!get()[key]});},
}));
