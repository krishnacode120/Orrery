import { create } from 'zustand';
import {useCameraStore} from './useCameraStore.js';
import {useReplayStore} from './useReplayStore.js';
import { DEFAULT_SETTINGS, solarSystem } from '../physics/body.js';
import { julianDate } from '../physics/units.js';
import { validateScenario } from '../physics/scenario.js';
import { makePreset, realityBodies } from '../physics/catalog.js';
import { godAction, brush, createBody, mouthPair } from './actions.js';
import { editWithHistory, travel, historyCounts } from './history.js';

function initial() {
  return makePreset('solar-now');
}
export const useSimStore = create((set, get) => ({
  scenario: initial(), revision: 0, paused: false, stepRequest: false,
  stats: null, render: null, transport: 'Connecting', error: null,
  prediction: null, predicting: false, previewMass: null, fps: 0, frameMs: 0, qualityLevel: 'medium',
  undoCount: 0, redoCount: 0,
  edit(recipe) {
    if(get().catalogActive)throw new Error('Return to the active simulation before editing catalog objects.');
    if(get().replayActive)throw new Error('Recorded replay is read-only. Return to Live before editing physics.');
    // Assignment-expression recipes are common in controls. Only an explicit
    // scenario return value means replacement; scalar/array returns are ignored.
    const apply=draft=>{const result=recipe(draft);if(result&&typeof result==='object'&&result.version&&Array.isArray(result.bodies))return result;};
    // Validate before touching history; failed edits cannot poison undo/redo.
    const candidate = structuredClone(get().scenario);
    const replacement = apply(candidate);
    validateScenario(replacement ?? candidate);
    const next = editWithHistory(get().scenario, apply);
    set({ scenario: next, revision: get().revision+1, stats: null, error: null, prediction:null, ...historyCounts() });
  },
  replace(s) { if(get().experimentActive)throw new Error('Apply or exit What-If before loading another scenario.');const next = validateScenario(s); get().edit(() => next); set({ paused: true });useCameraStore.getState().request('load'); },
  undo() { if(get().catalogActive)return get().fail('Return to simulation before Undo.'); if(get().replayActive)return get().fail('Return to Live before Undo.');set({ scenario: travel(get().scenario,'undo'), revision: get().revision+1,
    stats: null, paused: true, ...historyCounts() }); },
  redo() { if(get().catalogActive)return get().fail('Return to simulation before Redo.'); if(get().replayActive)return get().fail('Return to Live before Redo.');set({ scenario: travel(get().scenario,'redo'), revision: get().revision+1,
    stats: null, paused: true, ...historyCounts() }); },
  reality() { get().replace(initial()); },
  sandbox() { get().edit(s => { s.mode = 'sandbox'; s.name = 'Solar system sandbox'; s.ephemeris=null;if(s.provenance.source==='horizons')s.provenance.note='Horizons initialization, locally propagated Newtonian state'; }); },
  preset(id) { get().replace(makePreset(id)); },
  configureView(patch) {set({scenario:{...get().scenario,view:{...get().scenario.view,...patch}}});},
  action(id,action,value) {get().edit(s=>godAction(s,id,action,value));},
  brush(id,kind,count) {get().edit(s=>brush(s,id,kind,count));},
  spawn(kind,position,velocity) {get().edit(s=>{
    if(s.mode!=='sandbox')throw new Error('Convert to Sandbox before spawning');
    if(kind==='wormhole'){mouthPair(s,position);return;}
    const b=createBody(kind,position,velocity);s.bodies.push(b);s.view.selected=b.id;
  });},
  jump(date) {
    const jd = julianDate(date);
    const s=initial();s.jd=jd;s.provenance.epochJD=jd;s.bodies=realityBodies(jd);
    get().replace(s);
  },
  togglePause() { if(get().catalogActive)return; if(get().replayActive){const replay=useReplayStore.getState();useReplayStore.setState({playing:!replay.playing});return;}set({ paused: !get().paused }); },
  step() { if(get().catalogActive)return; if(get().replayActive)return get().fail('Use the recorded-frame scrubber to step replay.');set({ paused: true, stepRequest: true }); },
  frame({ jd, stats, state, render, transport, stepped=false, bodies, count, events, eventSerial, dynamic=[], maneuvers, telemetry, experimentEvents, settings }) {
    const previousEventSerial=get().scenario.eventSerial??0;
    const metadata=bodies??get().scenario.bodies;
    const updates=new Map(dynamic.map(b=>[b.id,b]));
    if(metadata.length!==count || state.length!==count*6)throw new Error('Incomplete worker frame');
    set({ scenario: { ...get().scenario, jd, events:events??get().scenario.events, eventSerial,
      maneuvers:maneuvers??get().scenario.maneuvers,telemetry:telemetry??get().scenario.telemetry,
      experimentEvents:experimentEvents??get().scenario.experimentEvents,settings:settings??get().scenario.settings,
      bodies: metadata.map((b,i) => ({ ...b,...updates.get(b.id),
      position: Array.from(state.subarray(i*6,i*6+3)), velocity: Array.from(state.subarray(i*6+3,i*6+6)) })) },
      stats, render, transport, stepRequest: stepped?false:get().stepRequest });
    const selected=get().scenario.bodies.find(b=>b.id===get().scenario.view.selected);
    const view=get().scenario.view;
    if(view.autoArrival&&['follow','chase','rocket','satellite'].includes(view.cameraMode)&&(view.cameraTarget??view.selected)===selected?.id&&selected?.parentId===view.targetId&&events?.some(e=>e.id>previousEventSerial&&e.kind==='soi'&&e.bodyIds[0]===selected.id)){get().configureView({scale:'planetary',cameraMode:'follow',cameraTarget:selected.parentId,camera:null});useCameraStore.getState().request('focus',{id:selected.parentId,mode:'follow'});}
  },
  fail(error) { set({ error, paused: true }); },
}));
