import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {setCameraMode} from '../navigation/actions.js';

// Selection is an editor/highlight target, never a camera command.
export function selectObject(id){
 const sim=useSimStore.getState(),ui=useUIStore.getState();
 if(id!==null&&!sim.scenario.bodies.some(b=>b.id===id))return;
 sim.configureView({selected:id});
 ui.update({infoObjectId:id&&ui.showInfoOnSelection?id:null,infoCollapsed:false,context:null});
}
export const clearSelection=()=>selectObject(null);
export function showObjectInfo(id){if(useSimStore.getState().scenario.bodies.some(b=>b.id===id))useUIStore.getState().update({infoObjectId:id,infoCollapsed:false});}
export const closeObjectInfo=()=>useUIStore.getState().update({infoObjectId:null});
export function canSelect(ui){return ui.tool==='select'&&!ui.draggingBody&&!ui.nodePick&&!ui.dialog&&!ui.context;}
export function escapeSelection(){
 const ui=useUIStore.getState();
 if(ui.context){ui.update({context:null});return;}
 if(!canSelect(ui)){ui.update({tool:'select',placementPreview:null,nodePick:null,dialog:null});return;}
 clearSelection();
 if(useSimStore.getState().scenario.view.cameraMode!=='free')setCameraMode('free');
}
