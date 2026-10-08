let frame=null,effects=0;
export function setVisualFrame(source,visual,dt,paused){frame={source,visual};if(!paused||!source.view.pauseVisualEffects)effects+=Math.min(.1,Math.max(0,dt));}
export function renderScenario(s){return frame?.source.bodies===s.bodies&&frame.source.jd===s.jd?{...s,bodies:frame.visual.bodies,jd:frame.visual.jd}:s;}
export const effectTime=()=>effects;
export function clearVisualFrame(){frame=null;}
