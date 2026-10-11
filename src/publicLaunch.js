// Only named, bounded examples can be launched from public content links.
export const PUBLIC_LAUNCHES=new Set(['solar','orbits','rocket','satellite','geo','sandbox','whatif','universe','planner','reference']);
export function publicLaunch(search){const p=new URLSearchParams(search),launch=p.get('launch');return PUBLIC_LAUNCHES.has(launch)?{launch,experiment:['jupiter10','duplicateMoon','removeMoon','sun90'].includes(p.get('experiment'))?p.get('experiment'):null}:null;}
export async function applyPublicLaunch(config){
 const {useSimStore}=await import('./store/useSimStore.js'),sim=useSimStore.getState();
 const presets={solar:'solar-now',orbits:'leo',rocket:'rocket',satellite:'leo',geo:'geo',sandbox:'solar-now',whatif:'solar-now',universe:'solar-now',planner:'solar-now',reference:'solar-now'};
 sim.preset(presets[config.launch]);useSimStore.setState({paused:true});
 if(config.launch==='sandbox')useSimStore.getState().sandbox();
 if(config.launch==='whatif'){const {useWhatIfStore}=await import('./store/useWhatIfStore.js');useWhatIfStore.getState().begin();if(config.experiment)useWhatIfStore.getState().quick(config.experiment);}
 if(config.launch==='universe'){const {useExplorerStore}=await import('./store/useExplorerStore.js');useExplorerStore.getState().enter();}
 const panels={orbits:'mission',rocket:'mission',satellite:'mission',geo:'mission',sandbox:'tools',whatif:'whatif',planner:'science',reference:'science'};
 if(panels[config.launch])useSimStore.getState().configureView({panel:panels[config.launch]});
 if(config.launch==='planner'||config.launch==='reference'){const {useScienceStore}=await import('./store/useScienceStore.js');useScienceStore.getState().open(config.launch==='planner'?'windows':'mission');}
}
