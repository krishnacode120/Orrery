import {AU} from '../physics/units.js';
export function viewSpace(s) {
 const selected=s.bodies.find(b=>b.id===s.view.selected);
 const parent=s.bodies.find(b=>b.id===selected?.parentId);
 let unit=AU/4,origin=s.bodies.find(b=>b.id==='sun')?.position??[0,0,0];
 if(s.view.scale==='earth'){const earth=s.bodies.find(b=>b.id==='earth')??parent??selected;unit=(earth?.radius??6371000)/4;origin=earth?.position??origin;}
 if(s.view.scale==='planetary'){const p=selected?.type==='moon'||selected?.spacecraft||selected?.rocket?parent??selected:selected;unit=Math.max((p?.radius??6371000)*2,1);origin=p?.position??origin;}
 if(['vehicle','true'].includes(s.view.scale)){unit=Math.max(selected?.radius??10,1)/2;origin=selected?.position??origin;}
 const transform=p=>[(p[0]-origin[0])/unit,(p[2]-origin[2])/unit,-(p[1]-origin[1])/unit];
 return {unit,origin,transform};
}
export function displayRadius(b,s,space) {
 const size=s.view.scale==='system'?s.view.exaggeration:1;
 const multiplier=b.type==='star'?Math.sqrt(size)*2:size;
 return Math.max(b.radius/space.unit*(s.view.scale==='system'?multiplier:1),b.type==='satellite'||b.type==='spacecraft'?.06:0);
}
