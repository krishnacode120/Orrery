import {AU} from '../physics/units.js';
import {getRenderFrame} from '../navigation/renderFrame.js';
// Display transforms never modify the worker's Float64 SI coordinates.
export function viewSpace(s,useCameraFrame=true) {
 const selected=s.bodies.find(b=>b.id===(s.view.cameraTarget??s.view.selected)),parent=s.bodies.find(b=>b.id===selected?.parentId);
 let unit=AU/4,origin=s.bodies.find(b=>b.id==='sun')?.position??[0,0,0];
 if(s.view.scale==='earth'){const earth=s.bodies.find(b=>b.id==='earth')??parent??selected;unit=(earth?.radius??6371000)/4;origin=earth?.position??origin;}
 if(s.view.scale==='planetary'){const p=selected?.type==='moon'||selected?.spacecraft||selected?.rocket?parent??selected:selected;unit=Math.max((p?.radius??6371000)*2,1);origin=p?.position??origin;}
 if(['vehicle','true'].includes(s.view.scale)){unit=Math.max(selected?.radius??10,1)/2;origin=selected?.position??origin;}
 const compressed=s.view.scale==='system'&&s.view.realDistances===false;
 const frame=useCameraFrame?getRenderFrame():null;
 if(frame&&!compressed){unit=frame.unit;origin=frame.origin;}
 const distanceScale=s.view.scaleMode==='custom'?(s.view.distanceScale??1):1;
 const transform=p=>{
  let v=[(p[0]-origin[0])/unit,(p[2]-origin[2])/unit,-(p[1]-origin[1])/unit],r=Math.hypot(...v);
  if(compressed&&r>0)v=v.map(x=>x/r*Math.log1p(r)*12);
  return v.map(x=>x*distanceScale);
 };
 const inverse=p=>{
  let v=p.map(x=>x/distanceScale),r=Math.hypot(...v);
  if(compressed&&r>0)v=v.map(x=>x/r*Math.expm1(r/12));
  return [origin[0]+v[0]*unit,origin[1]-v[2]*unit,origin[2]+v[1]*unit];
 };
 return {unit,origin,transform,inverse,compressed,distanceScale};
}
export function displayRadius(b,s,space) {
 const real=s.view.realRadii===true||s.view.scaleMode==='scientific'||s.view.scale==='true';
 let multiplier=1;
 if(!real&&s.view.scale==='system')multiplier=b.type==='star'?Math.sqrt(s.view.exaggeration)*2:s.view.exaggeration;
 if(!real&&s.view.scaleMode==='custom')multiplier=b.spacecraft||b.rocket?(s.view.spacecraftScale??1):b.type==='moon'?(s.view.moonScale??1):(s.view.planetScale??1);
 const physical=b.radius/space.unit*space.distanceScale;
 if(real||multiplier<=1||b.massless||b.type==='asteroid'||b.disrupted)return physical*multiplier;
 // Cap only exaggeration, never true surfaces or centres. The cap is shared
 // by mesh, picking and focus. Small debris does not shrink major planets.
 const cap=visibilityCaps(s,space).get(b.id)??Infinity;
 return Math.max(physical,Math.min(physical*multiplier,cap/space.unit*space.distanceScale));
}
const caps=new WeakMap();
function visibilityCaps(s,space){
 if(caps.has(s))return caps.get(s);
 const list=s.bodies.filter(b=>b.visible&&!b.disrupted&&!b.massless&&b.type!=='asteroid'&&(s.view.showMoons!==false||b.type!=='moon')).slice(0,512),map=new Map();
 for(const a of list){let nearest=Infinity;for(const b of list){if(a.id===b.id)continue;
 const d=space.compressed?Math.hypot(...space.transform(a.position).map((x,k)=>x-space.transform(b.position)[k]))*space.unit/space.distanceScale:Math.hypot(...a.position.map((x,k)=>x-b.position[k]));
 nearest=Math.min(nearest,d);
 }map.set(a.id,nearest*.4);}
 caps.set(s,map);return map;
}
export function scalePreset(mode){return {scaleMode:mode,realDistances:mode!=='educational',realRadii:mode==='scientific',exaggeration:mode==='educational'?2500:1500};}
