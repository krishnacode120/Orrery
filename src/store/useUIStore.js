import {create} from 'zustand';
export const useUIStore=create(set=>({tool:'select',spawnKind:'planet',placementPreview:null,dialog:null,help:false,
 update:patch=>set(patch)}));
