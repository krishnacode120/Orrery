import {AU} from '../physics/units.js';
// Display transforms never modify the worker's Float64 SI coordinates.
export function viewSpace(s) {
 const selected=s.bodies.find(b=>b.id===s.view.selected),parent=s.bodies.find(b=>b.id===selected?.parentId);
 let unit=AU/4,origin=s.bodies.find(b=>b.id==='sun')?.position??[0,0,0];
 if(s.view.scale==='earth'){const earth=s.bodies.find(b=>b.id==='earth')??parent??selected;unit=(earth?.radius??6371000)/4;origin=earth?.position??origin;}
 if(s.view.scale==='planetary'){const p=selected?.type==='moon'||selected?.spacecraft||selected?.rocket?parent??selected:selected;unit=Math.max((p?.radius??6371000)*2,1);origin=p?.position??origin;}
 if(['vehicle','true'].includes(s.view.scale)){unit=Math.max(selected?.radius??10,1)/2;origin=selected?.position??origin;}
 const compressed=s.view.scale==='system'&&s.view.realDistances===false;
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
 return b.radius/space.unit*multiplier*space.distanceScale;
}
export function scalePreset(mode){return {scaleMode:mode,realDistances:mode!=='educational',realRadii:mode==='scientific',exaggeration:mode==='educational'?2500:1500};}
