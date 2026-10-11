import {baseScenario,earthBody,makePreset} from './catalog.js';
import {body} from './body.js';
import {defaultRocket,rocketMass} from './vehicles.js';
import {G,add,scale,unit,cross} from './units.js';
export function reentryScenario(kind='capsule'){
 if(!['capsule','spaceplane','generic'].includes(kind))throw new Error('Unknown entry vehicle');
 const s=makePreset('leo'),earth=s.bodies[0],b=s.bodies[1];s.name='Earth entry · '+kind;
 b.position=[earth.radius+120000,0,0];b.velocity=[-200,7600,0];
 b.spacecraft.aerodynamics={area:kind==='spaceplane'?80:kind==='capsule'?12:5,cd:kind==='capsule'?1.2:.6,noseRadius:kind==='capsule'?2:.5};
 b.spacecraft.landingEnabled=true;b.spacecraft.landingSpeed=5;s.settings.stepSeconds=.25;s.settings.integrator='rk4';s.settings.collisionMode='none';s.settings.roche=false;
 s.mission={name:s.name,epochJD:s.jd,model:'Ballistic entry with spherical surface and approximate drag/heating; spaceplane changes ballistic coefficient only, no lift or ablation'};
 return s;
}
export function landingScenario(target='moon'){
 if(!['moon','mars'].includes(target))throw new Error('Landing target must be Moon or Mars');
 const s=baseScenario(target+' powered landing'),primary=body({id:target,name:target==='moon'?'Moon':'Mars',type:target==='moon'?'moon':'planet',mass:target==='moon'?7.342e22:6.4171e23,radius:target==='moon'?1737400:3389500,spin:{axis:[0,0,1],period:target==='moon'?2360591:88642.7},atmosphere:target==='mars'?{density:.02,color:'#a67b61',height:60000}:null});
 const rocket=defaultRocket();rocket.stages=[{name:'Descent engine',dryMass:1000,fuel:1200,capacity:1200,thrust:30000,isp:320}];rocket.payloadMass=500;rocket.phase='powered descent';rocket.engineOn=true;rocket.autopilot=true;rocket.landingAutopilot='descent';rocket.landingEnabled=true;rocket.landingSpeed=5;rocket.attitudeMode='launch';
 const p=[primary.radius+5000,0,0],ground=cross(scale(unit(primary.spin.axis),2*Math.PI/primary.spin.period),p);
 s.bodies=[primary,body({id:'lander',name:'Descent validation vehicle',type:'rocket',mass:rocketMass(rocket),radius:2,position:p,velocity:add(ground,[-50,30,0]),massless:true,parentId:target,rocket,collisionMode:'none'})];
 s.mode='sandbox';s.settings={...s.settings,integrator:'rk4',stepSeconds:.25,softening:1,collisionMode:'none',roche:false,timeScale:10};s.view.selected='lander';s.view.panel='mission';s.view.scale='vehicle';s.mission={name:s.name,epochJD:s.jd,model:'Feedback thrust landing over spherical terrain; touchdown speed must be below 5 m/s'};return s;
}
