import { expose, transfer } from 'comlink';
import { createWorkerCore } from './workerCore.js';
import { predict } from './prediction.js';
const core=createWorkerCore();
expose({
  initialize:core.initialize,
  predict,
  advance(seconds,selectedId) {
    const result=core.advance(seconds,selectedId);
    return result.state?transfer(result,[result.state,result.render]):result;
  },
});
