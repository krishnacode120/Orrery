import { expose, transfer } from 'comlink';
import { createWorkerCore } from './workerCore.js';
import { predict } from './prediction.js';
import {compareExperiments,sensitivity} from './experimentAnalysis.js';
import {findEvents} from '../astronomy/events.js';
const core=createWorkerCore();
expose({
  initialize:core.initialize,
  predict,compareExperiments,sensitivity,findEvents,
  advance(seconds,selectedId) {
    const result=core.advance(seconds,selectedId);
    return result.state?transfer(result,[result.state,result.render]):result;
  },
});
