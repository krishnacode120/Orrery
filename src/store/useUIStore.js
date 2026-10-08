import {create} from 'zustand';
const defaults={layout:'explore',hidden:false,top:true,left:true,right:false,bottom:true,hud:true,rail:true};
let saved={};try{saved=JSON.parse(localStorage.getItem('orrery-workspace')||'{}');}catch{}
export const useUIStore=create((set,get)=>({
 ...defaults,...saved,tool:'select',spawnKind:'planet',placementPreview:null,dialog:null,help:false,context:null,
 navigation:[],navigationIndex:-1,measurementFrom:null,measurementTo:null,
 update:patch=>set(patch),
 workspace(patch){set(patch);try{const s=get();localStorage.setItem('orrery-workspace',JSON.stringify(Object.fromEntries(Object.keys(defaults).map(k=>[k,s[k]]))));}catch{}},
 toggleInterface(){get().workspace({hidden:!get().hidden});},
 setLayout(layout){get().workspace({...defaults,layout,...({explore:{right:false},physics:{right:true},mission:{right:true,left:false},satellite:{right:true,left:false},god:{right:true},whatif:{right:true,left:false},minimal:{left:false,right:false,rail:false},presentation:{top:false,left:false,right:false,rail:false,bottom:false},cinema:{hidden:true}}[layout]??{})});},
 remember(pose){const s=get();if(JSON.stringify(s.navigation[s.navigationIndex])===JSON.stringify(pose))return;const history=s.navigation.slice(0,s.navigationIndex+1);history.push(pose);set({navigation:history.slice(-64),navigationIndex:Math.min(history.length-1,63)});},
 navigate(direction){const s=get(),index=Math.max(0,Math.min(s.navigation.length-1,s.navigationIndex+direction));if(index===s.navigationIndex)return null;set({navigationIndex:index});return s.navigation[index];},
}));
