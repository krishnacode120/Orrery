import { wrap } from 'comlink';

// Exactly one RPC is in flight. On resolution, copy the completed shared frame
// before requesting another write. This ownership protocol prevents torn frames.
export function connectWorker(getState, onFrame, onError) {
  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  const api = wrap(worker);
  let stopped = false, timer, revision = -1, failedRevision = null, buffers = null, last = performance.now();
  const shared = globalThis.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined'
    && !new URLSearchParams(location.search).has('fallback');
  worker.onerror = (event) => onError(event.message || 'Physics worker failed');
  async function tick() {
    try {
      const current = getState();
      if(current.replayActive){last=performance.now();if(!stopped)timer=setTimeout(tick,100);return;}
      if (failedRevision === current.revision) {
        if (!stopped) timer = setTimeout(tick, 100);
        return;
      }
      if (revision !== current.revision) {
        buffers = await api.initialize(current.scenario, shared);
        revision = current.revision;
        last = performance.now();
      }
      const now = performance.now();
      const seconds = current.stepRequest ? Math.sign(current.scenario.settings.timeScale)*current.scenario.settings.stepSeconds
        : current.paused ? 0 : Math.min((now-last)/1000, 0.1)*current.scenario.settings.timeScale;
      last = now;
      const result = await api.advance(seconds,current.scenario.view?.selected);
      if (!stopped && !getState().replayActive && getState().revision === revision) {
        const state = new Float64Array(buffers?.state ?? result.state).slice(0,result.count*6);
        const render = new Float32Array(buffers?.render ?? result.render).slice(0,result.count*3);
        onFrame({ ...result, state, render, transport: shared ? 'Shared memory' : 'Transferable messages' });
      }
      if (!stopped) timer = setTimeout(tick, 33);
    } catch (error) {
      if (!stopped) {
        failedRevision = getState().revision;
        revision = -1;
        onError(`${error.message}. Edit a parameter or return to Reality to retry.`);
        timer = setTimeout(tick, 100);
      }
    }
  }
  tick();
  return () => { stopped = true; clearTimeout(timer); worker.terminate(); };
}
