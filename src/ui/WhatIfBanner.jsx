import {useWhatIfStore} from '../store/useWhatIfStore.js';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
export function WhatIfBanner(){
 const active=useWhatIfStore(s=>s.active),name=useWhatIfStore(s=>s.baseline?.name),hidden=useUIStore(s=>s.hidden);
 if(!active||hidden)return null;
 return <div className="whatif-banner" role="status"><strong>WHAT-IF ACTIVE</strong><span>Baseline preserved · {name}</span><button onClick={()=>{useUIStore.getState().workspace({right:true});useSimStore.getState().configureView({panel:'whatif'});}}>Experiment</button><button onClick={()=>useWhatIfStore.getState().exit(false)}>Exit without saving</button></div>;
}
