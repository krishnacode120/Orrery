// This module contains display coordinates only. Workers never import it.
let frame=null;
export function getRenderFrame(){return frame;}
export function setRenderFrame(value){frame=value?{origin:[...value.origin],unit:value.unit}:null;}
export function clearRenderFrame(){frame=null;}
