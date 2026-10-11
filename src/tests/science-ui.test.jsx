import React from 'react';
import {renderToString} from 'react-dom/server';
import {it,expect} from 'vitest';
import ScienceWorkbench from '../ui/ScienceWorkbench.jsx';
import VehicleDynamics from '../ui/VehicleDynamics.jsx';
import {useScienceStore} from '../store/useScienceStore.js';
import {landingScenario} from '../physics/flightScenarios.js';
for(const tab of ['mission','accuracy','windows','numerical','stress']){
 it('renders scientific '+tab+' without invalid readouts',()=>{
  useScienceStore.setState({tab});
  const html=renderToString(<ScienceWorkbench run={()=>{}}/>);
  expect(html).toContain('Analysis runs in a separate worker');
  expect(html).not.toContain('NaN');expect(html).not.toContain('undefined');
 });
}
it('makes optional structural limits explicit in vehicle controls',()=>{
 const s=landingScenario('moon'),b=s.bodies[1];
 const html=renderToString(<VehicleDynamics body={b} bodies={s.bodies} edit={()=>{}} disabled={false}/>);
 expect(html).toContain('Structural warning limits enabled');
 expect(html).not.toContain('Dynamic pressure limit');
 b.rocket.limits={maxQ:80000,maxAcceleration:60,maxHeating:1e7};
 expect(renderToString(<VehicleDynamics body={b} bodies={s.bodies} edit={()=>{}} disabled={false}/>)).toContain('Dynamic pressure limit');
});
