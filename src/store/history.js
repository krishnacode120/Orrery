import { enablePatches, produceWithPatches, applyPatches } from 'immer';
enablePatches();
const undo = [], redo = [];
export function editWithHistory(state, recipe) {
  const [next, forward, inverse] = produceWithPatches(state, recipe);
  if (forward.length) {
    undo.push({ forward, inverse, before: state, after: next });
    if (undo.length > 80) undo.shift();
    redo.length = 0;
  }
  return next;
}
export function travel(state, direction) {
  const source = direction === 'undo' ? undo : redo;
  const destination = direction === 'undo' ? redo : undo;
  const item = source.pop();
  if (!item) return state;
  destination.push(item);
  const expected=direction==='undo'?item.after:item.before;
  const sameTopology=state.bodies.length===expected.bodies.length && state.bodies.every((b,i)=>b.id===expected.bodies[i].id);
  // Array-index patches must never hit the wrong body after a physical event.
  if(!sameTopology)return direction==='undo'?item.before:item.after;
  return applyPatches(state, direction === 'undo' ? item.inverse : item.forward);
}
export const historyCounts = () => ({ undoCount: undo.length, redoCount: redo.length });
export function checkpointHistory(){return {undo:[...undo],redo:[...redo]};}
export function restoreHistory(snapshot){undo.splice(0,undo.length,...(snapshot?.undo??[]));redo.splice(0,redo.length,...(snapshot?.redo??[]));return historyCounts();}
