import React from 'react';
import {renderToString} from 'react-dom/server';
import {it,expect} from 'vitest';
import {ObjectInfoContent} from '../ui/ObjectInfo.jsx';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
import {useExplorerStore} from '../store/useExplorerStore.js';
import {selectObject,closeObjectInfo,clearSelection} from '../interaction/selection.js';
import {makePreset} from '../physics/catalog.js';
const render=()=>renderToString(<ObjectInfoContent sim={useSimStore.getState()} ui={useUIStore.getState()}/>);
it('renders scientific physical values independently of display scaling; closing keeps actions',()=>{
 const s=makePreset('solar-now');s.view.exaggeration=9999;s.view.cameraMode='free';useSimStore.setState({scenario:s});
 useUIStore.setState({hidden:false,right:false,showInfoOnSelection:true});selectObject('mercury');
 const html=render();expect(html).toContain('Mercury');expect(html).toContain('2,439.7');expect(html).not.toMatch(/NaN|undefined/);
 closeObjectInfo();const actions=render();expect(actions).toContain('Info</button>');expect(actions).not.toContain('Sun distance');
 expect(useSimStore.getState().scenario.view.selected).toBe('mercury');clearSelection();expect(render()).toBe('');
});
it('catalog selection/info never changes the catalog camera command or active physics',()=>{
 const sim=useSimStore.getState(),state=sim.scenario,command=useExplorerStore.getState().command,serial=useExplorerStore.getState().serial;
 useUIStore.setState({showInfoOnSelection:false});useExplorerStore.getState().select('hyg-0');
 expect(useExplorerStore.getState().infoId).toBe(null);useExplorerStore.getState().update({infoId:'hyg-0'});
 useExplorerStore.getState().update({infoId:null});expect(useExplorerStore.getState().selected).toBe('hyg-0');
 useExplorerStore.getState().select(null);expect(useExplorerStore.getState().selected).toBe(null);
 expect(useExplorerStore.getState().command).toBe(command);expect(useExplorerStore.getState().serial).toBe(serial);expect(useSimStore.getState().scenario).toBe(state);
});
