import {useEffect} from 'react';
import {wrap} from 'comlink';
import {useSimStore} from './store/useSimStore.js';
import {useUIStore} from './store/useUIStore.js';
import {createBody} from './store/actions.js';
import {viewSpace} from './components/viewSpace.js';
import {sub} from './physics/units.js';
export function usePrediction() {
 const revision=useSimStore(s=>s.revision),selected=useSimStore(s=>s.scenario.view.selected),duration=useSimStore(s=>s.scenario.view.predictionDuration),
 enabled=useSimStore(s=>s.scenario.view.predictionEnabled),resolution=useSimStore(s=>s.scenario.view.predictionResolution),mass=useSimStore(s=>s.previewMass);
 const placement=useUIStore(s=>s.placementPreview),kind=useUIStore(s=>s.spawnKind),tool=useUIStore(s=>s.tool);
 useEffect(()=>{
 if(!enabled&&!placement){useSimStore.setState({prediction:null,predicting:false});return;}
 let worker,cancelled=false;
 const timer=setTimeout(async()=>{
 const state=useSimStore.getState(),snapshot=structuredClone(state.scenario);let ids=[selected].filter(Boolean);
 if(mass!==null){const b=snapshot.bodies.find(b=>b.id===selected);if(b)b.mass*=mass;ids=[...new Set([...ids,...snapshot.bodies.filter(b=>!b.massless).slice(0,10).map(b=>b.id)])];}
 if(placement){const space=viewSpace(snapshot),velocity=sub(placement[1],placement[0]).map(x=>x/(space.unit/10000));
 if(tool==='spawn'&&kind!=='wormhole'){const b=createBody(kind,placement[0],velocity);b.id='placement-preview';snapshot.bodies.push(b);ids=[b.id];}
 else if(tool==='move'){const b=snapshot.bodies.find(b=>b.id===selected);if(b)b.position=[...placement[1]];}
 else if(tool==='throw'){const b=snapshot.bodies.find(b=>b.id===selected);if(b)b.velocity=b.velocity.map((x,k)=>x+velocity[k]);}}
 useSimStore.setState({predicting:true});
 try{worker=new Worker(new URL('./physics/worker.js',import.meta.url),{type:'module'});const rpc=wrap(worker);
 const result=await rpc.predict(snapshot,{duration:duration??86400*30,resolution:resolution??120,ids,maxMs:1600});
 if(!cancelled&&useSimStore.getState().revision===revision)useSimStore.setState({prediction:result,predicting:false});
 }catch(error){if(!cancelled)useSimStore.setState({predicting:false,error:'Prediction: '+error.message});}finally{worker?.terminate();}
 },placement?200:500);
 return()=>{cancelled=true;clearTimeout(timer);worker?.terminate();};
 },[revision,selected,duration,resolution,enabled,mass,placement,kind,tool]);
}
