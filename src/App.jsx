import { Component, useEffect, useState, lazy, Suspense } from 'react';
const PictureInPicture=lazy(()=>import('./components/Scene.jsx').then(m=>({default:m.PictureInPicture})));
const Scene=lazy(()=>import('./components/Scene.jsx'));
import {useUIStore} from './store/useUIStore.js';
import HUD from './ui/HUD.jsx';
import { GlobalStyle, Shell, Notice } from './ui/styles.js';
import { useSimStore } from './store/useSimStore.js';
import { connectWorker } from './physics/workerApi.js';
import { api, localScenario } from './persistence.js';
import { usePrediction } from './usePrediction.js';
import {useReplay} from './useReplay.js';

class SceneBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error: error.message }; }
  render() {
    return this.state.error ? <div className="canvas-fallback" role="alert">3D renderer unavailable: {this.state.error}</div> : this.props.children;
  }
}

export default function App() {
  usePrediction();useReplay();
  const panel=useSimStore(state=>!!state.scenario.view.panel),ui=useUIStore();
  const [ready,setReady] = useState(false), [storageError,setStorageError] = useState('');
  useEffect(() => {
    let cancelled = false;
    const bootRevision = useSimStore.getState().revision;
    (async () => {
      try {
        const match = location.pathname.match(/^\/s\/([A-Za-z0-9_-]+)$/);
        const saved = match ? await api(`/scenarios/${match[1]}`) : await localScenario();
        if (!cancelled && saved && useSimStore.getState().revision===bootRevision) useSimStore.getState().replace(saved);
        if(!cancelled&&!match&&useSimStore.getState().scenario.view.workspaceVersion!==4){const state=useSimStore.getState();state.configureView({workspaceVersion:4,scale:'system',selected:state.scenario.bodies.some(b=>b.id==='earth')?'earth':state.scenario.view.selected,panel:null,cameraMode:'orbit',camera:null});}
      if(!cancelled&&window.matchMedia('(max-width:800px)').matches)useSimStore.getState().configureView({panel:null});
      if(!cancelled&&window.matchMedia('(max-width:800px)').matches)useUIStore.getState().workspace({left:false,right:false});
      } catch(error) { if(!cancelled)setStorageError(error.message); }
      finally { if(!cancelled)setReady(true); }
    })();
    return () => { cancelled=true; };
  },[]);
  useEffect(() => {
    if (!ready) return;
    return connectWorker(useSimStore.getState,
      frame=>useSimStore.getState().frame(frame), error=>useSimStore.getState().fail(error));
  },[ready]);
  useEffect(() => {
    if (!ready) return;
    let pending=false;
    const timer=setInterval(async()=>{
      if(pending)return;
      pending=true;
      try { await localScenario(useSimStore.getState().scenario); }
      catch(error) { setStorageError(`Autosave unavailable: ${error.message}`); }
      finally { pending=false; }
    },5000);
    return ()=>clearInterval(timer);
  },[ready]);
  return <><GlobalStyle /><Shell data-hidden={ui.hidden} data-top={ui.top} data-left={ui.left} data-right={ui.right} data-bottom={ui.bottom} data-hud={ui.hud} data-rail={ui.rail}>
    <div className="viewport-stage" data-panel={panel} onDoubleClick={()=>{if(ui.hidden)ui.toggleInterface();}}><SceneBoundary><Suspense fallback={<div className="canvas-fallback">Preparing renderer…</div>}><Scene /></Suspense></SceneBoundary></div><Suspense fallback={null}><PictureInPicture/></Suspense><HUD />
    {(!ready || storageError) && <Notice role="status">{!ready?'Loading scenario…':storageError}
      {storageError && <button style={{marginLeft:10}} onClick={()=>setStorageError('')}>Dismiss</button>}</Notice>}
  </Shell></>;
}
