import {it,expect,afterEach} from 'vitest';
import {PerspectiveCamera,Group,Vector3} from 'three';
import {solarSystem} from '../physics/body.js';
import {makePreset} from '../physics/catalog.js';
import {AU,julianDate,norm,sub} from '../physics/units.js';
import {positionSanity} from '../physics/positionSanity.js';
import {viewSpace,displayRadius,scalePreset} from '../components/viewSpace.js';
import {setRenderFrame,clearRenderFrame} from '../navigation/renderFrame.js';
import {RenderInterpolator} from '../rendering/interpolation.js';
import {pickBody} from '../interaction/picking.js';
import {selectObject,clearSelection,showObjectInfo,closeObjectInfo,escapeSelection,canSelect} from '../interaction/selection.js';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {useCameraStore} from '../store/useCameraStore.js';
import {focusCamera,setCameraMode} from '../navigation/actions.js';
import {NavigationController} from '../navigation/controller.js';
import {createWorkerCore} from '../physics/workerCore.js';
afterEach(()=>{clearRenderFrame();useUIStore.setState({tool:'select',context:null,dialog:null,nodePick:null,draggingBody:false});});
for(const date of ['2000-01-01','2026-10-12','2026-10-13','2030-01-01','2050-01-01']){
 it('keeps Mercury/Venus SI states distinct and sane at '+date,()=>{
  const s=makePreset('solar-now');s.jd=julianDate(date);s.bodies=solarSystem(s.jd);
  expect(positionSanity(s)).toEqual([]);
  const m=s.bodies.find(b=>b.id==='mercury'),v=s.bodies.find(b=>b.id==='venus');
  expect(norm(sub(m.position,v.position))).toBeGreaterThan(m.radius+v.radius);
  for(const mode of ['scientific','visibility','educational']){
   s.view={...s.view,...scalePreset(mode)};const original=structuredClone(s.bodies);
   for(const origin of [[0,0,0],s.bodies.find(b=>b.id==='earth').position,[AU*30,-AU*12,AU*7]]){
    setRenderFrame({origin,unit:AU/4});const sp=viewSpace(s);
    if(!sp.compressed){
     const a=new Float32Array(sp.transform(m.position)),b=new Float32Array(sp.transform(v.position));
     const actual=Array.from(a,(x,k)=>x-b[k]),expected=[m.position[0]-v.position[0],m.position[2]-v.position[2],v.position[1]-m.position[1]].map(x=>x/sp.unit);
     expect(norm(sub(actual,expected))/norm(expected)).toBeLessThan(3e-5);
    }
    const separation=norm(sub(sp.transform(m.position),sp.transform(v.position)));
    expect(displayRadius(m,s,sp)+displayRadius(v,s,sp)).toBeLessThan(separation);
    if(mode==='scientific')expect(displayRadius(m,s,sp)).toBe(m.radius/sp.unit);
   }
   expect(s.bodies).toEqual(original);
  }
 });
}
it('uses one SI subtraction/conversion with Sun, Earth and camera origins',()=>{
 const s=makePreset('solar-now'),p=[AU,2*AU,3*AU];
 for(const origin of [[0,0,0],[AU,0,0],[7*AU,8*AU,9*AU]]){
  setRenderFrame({origin,unit:AU/4});const sp=viewSpace(s),r=sp.transform(p);
  expect(r).toEqual([(p[0]-origin[0])*4/AU,(p[2]-origin[2])*4/AU,-(p[1]-origin[1])*4/AU]);
  expect(norm(sub(sp.inverse(r),p))).toBeLessThan(.001);
 }
});
it('detects corrupt states without silently repairing them',()=>{
 const s=makePreset('solar-now');s.bodies[1].position=[NaN,0,0];s.bodies[2].position=[0,0,0];
 const warnings=positionSanity(s);expect(warnings.some(x=>x.includes('non-finite'))).toBe(true);expect(warnings.some(x=>x.includes('venus'))).toBe(true);expect(Number.isNaN(s.bodies[1].position[0])).toBe(true);
});
it('worker topology metadata and interpolation map reordered bodies by stable ID',()=>{
 const s=makePreset('solar-now');s.bodies.reverse();const core=createWorkerCore();core.initialize(s,false);
 const pub=core.advance(0,'mercury'),state=new Float64Array(pub.state);
 for(const id of ['mercury','venus']){const i=pub.bodies.findIndex(b=>b.id===id);expect([...state.slice(i*6,i*6+3)]).toEqual(s.bodies.find(b=>b.id===id).position);}
 const interpolation=new RenderInterpolator();interpolation.publish(s,1,0);
 const next={...s,jd:s.jd+1,bodies:[...s.bodies].reverse().map(b=>({...b,position:b.position.map(x=>x+100)}))};
 interpolation.publish(next,1,.1);const sample=interpolation.sample(next,{revision:1,now:.15});
 for(const id of ['mercury','venus'])expect(norm(sub(sample.bodies.find(b=>b.id===id).position,s.bodies.find(b=>b.id===id).position.map(x=>x+50)))).toBeLessThan(.001);
});
it('bounds exaggerated radii without hiding physical intersections',()=>{
 const s=makePreset('solar-now');s.view={...s.view,scaleMode:'custom',planetScale:1e9,distanceScale:.001};
 const sp=viewSpace(s),m=s.bodies.find(b=>b.id==='mercury'),v=s.bodies.find(b=>b.id==='venus'),before=structuredClone(m);
 expect(displayRadius(m,s,sp)+displayRadius(v,s,sp)).toBeLessThan(norm(sub(sp.transform(m.position),sp.transform(v.position))));expect(m).toEqual(before);
 const overlap={...s,bodies:[{...m,position:[0,0,0]},{...v,position:[1,0,0]}]};
 expect(displayRadius(overlap.bodies[0],overlap,viewSpace(overlap))).toBe(m.radius/sp.unit*sp.distanceScale);
});
it('keeps selection, optional information and camera ownership independent',()=>{
 const s=makePreset('solar-now');s.view.cameraMode='free';s.view.cameraTarget=null;
 useSimStore.setState({scenario:s});useUIStore.setState({showInfoOnSelection:false});
 const before=structuredClone(s.bodies),revision=useSimStore.getState().revision,command=useCameraStore.getState().command;
 selectObject('earth');expect(useUIStore.getState().infoObjectId).toBe(null);
 showObjectInfo('mercury');expect(useSimStore.getState().scenario.view.selected).toBe('earth');
 closeObjectInfo();expect(useSimStore.getState().scenario.view.selected).toBe('earth');
 clearSelection();expect(useSimStore.getState().scenario.view.selected).toBe(null);
 useUIStore.setState({showInfoOnSelection:true});selectObject('venus');expect(useUIStore.getState().infoObjectId).toBe('venus');
 escapeSelection();expect(useSimStore.getState().scenario.view.selected).toBe(null);
 expect(useSimStore.getState().scenario.view.cameraMode).toBe('free');expect(useCameraStore.getState().command).toBe(command);
 expect(useSimStore.getState().scenario.bodies).toEqual(before);expect(useSimStore.getState().revision).toBe(revision);
});
it('focus and follow are explicit; exit preserves controller pose',()=>{
 const s=makePreset('solar-now');useSimStore.setState({scenario:s});const before=structuredClone(s.bodies);
 selectObject('mercury');focusCamera('mercury');clearSelection();focusCamera('venus','follow');
 expect(useSimStore.getState().scenario.bodies).toEqual(before);
 const c=new NavigationController();c.setMode('follow','venus');const pose=c.snapshot();
 setCameraMode('free');const command=useCameraStore.getState().command;c.setMode(command.mode,command.targetId);
 expect(c.position).toEqual(pose.positionSI);expect(c.orientation.toArray()).toEqual(pose.orientation);
 expect(useSimStore.getState().scenario.view.cameraTarget).toBe(null);
 expect(useSimStore.getState().scenario.view.selected).toBe('venus');
});
it('tool/drag/node/modal input cannot clear a selection',()=>{
 selectObject('earth');
 for(const patch of [{tool:'spawn'},{nodePick:{bodyId:'earth'}},{draggingBody:true},{dialog:'catalog'}]){
  const ui={tool:'select',nodePick:null,draggingBody:false,dialog:null,...patch};expect(canSelect(ui)).toBe(false);
 }
 useUIStore.setState({tool:'spawn'});escapeSelection();expect(useSimStore.getState().scenario.view.selected).toBe('earth');expect(useUIStore.getState().tool).toBe('select');
});
it('actual visible surface beats enlarged targets; helpers are ordered independently of array order',()=>{
 const near={id:'mercury',position:[0,0,-5],radius:1,inFront:true,screen:[51,50]},far={id:'venus',position:[0,0,-10],radius:2,inFront:true,screen:[50,50]};
 for(const list of [[near,far],[far,near]])expect(pickBody(list,[0,0,0],[0,0,-1],[50,50]).id).toBe('mercury');
 const helper={...near,position:[2,0,-5],radius:.001,screen:[50,50]};
 expect(pickBody([helper,far],[0,0,0],[0,0,-1],[50,50]).id).toBe('venus');
 const a={...helper,id:'a',screen:[54,50]},b={...helper,id:'b',screen:[52,50]};
 expect(pickBody([a,b],[0,0,0],[0,0,-1],[50,50]).id).toBe('b');
 expect(pickBody([a,b],[0,0,0],[0,0,-1],[100,100])).toBe(null);
});
