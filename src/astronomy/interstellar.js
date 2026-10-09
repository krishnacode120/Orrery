import {C} from './coordinates.js';
export const PROPULSION=[
 ['Chemical','Operational',30000,'Rocket propulsion; chosen speed is a hypothetical mission input.'],
 ['Nuclear Thermal','Demonstrated',50000,'Ground-tested engines; no operational interstellar mission.'],
 ['Ion','Operational',90000,'Low-thrust electric propulsion used in space; model omits power limits.'],
 ['Solar Sail','Demonstrated',100000,'Sail operation demonstrated; cruise profile here is a kinematic approximation.'],
 ['Laser Sail','Conceptual',.1*C,'Requires external beaming infrastructure.'],
 ['Fusion Concept','Conceptual',.05*C,'No operational fusion spacecraft engine.'],
 ['Nuclear Pulse Concept','Conceptual',.03*C,'Unflown engineering concept.'],
 ['Antimatter Concept','Speculative',.5*C,'Storage, production and propulsion are unresolved.'],
 ['Custom','Exact configuration value',.1*C,'User-specified kinematic profile.']
];
const valid=(x,name,positive=false)=>{if(!Number.isFinite(x)||(positive?x<=0:x<0))throw new Error('Invalid '+name);};
export function relativisticCruise(distance,speed,mass=1000){valid(distance,'distance');valid(speed,'speed',true);valid(mass,'mass',true);if(speed>=C)throw new Error('A massive spacecraft must travel below c');const beta=speed/C,root=Math.sqrt(1-beta*beta),gamma=1/root,earthTime=distance/speed;return {distance,speed,beta,gamma,earthTime,properTime:earthTime*root,kineticEnergy:mass*C*C*beta*beta/(root*(1+root)),oneWay:distance/C,roundTrip:2*distance/C};}
// Constant proper acceleration, coast, then constant proper deceleration.
// Uses flat-spacetime kinematics; no gravity, fuel, power or engine feasibility model.
export function interstellarMission({distance,speed=.1*C,mass=1000,acceleration=0,deceleration=0}){
 const cruise=relativisticCruise(distance,speed,mass);valid(acceleration,'acceleration');valid(deceleration,'deceleration');
 if(!acceleration&&!deceleration)return {...cruise,profile:'Constant cruise; acceleration excluded',accelerationTime:0,decelerationTime:0,coastTime:cruise.earthTime,totalEnergyLowerBound:cruise.kineticEnergy};
 if(!acceleration||!deceleration)throw new Error('Specify both acceleration and deceleration, or set both to zero');
 // Keep gamma minus one separate so meter-scale trips do not round to zero.
 const inverse=1/acceleration+1/deceleration,root=Math.sqrt(1-cruise.beta*cruise.beta),delta=Math.min(cruise.beta*cruise.beta/(root*(1+root)),distance/(C*C*inverse)),peakGamma=1+delta,sinhEta=Math.sqrt(delta*(2+delta)),peak=C*sinhEta/peakGamma,eta=Math.asinh(sinhEta),rampDistance=C*C*delta*inverse,coastDistance=Math.max(0,distance-rampDistance),coastTime=peak?coastDistance/peak:0,accelerationTime=peakGamma*peak/acceleration,decelerationTime=peakGamma*peak/deceleration;
 return {...cruise,speed:peak,beta:peak/C,gamma:peakGamma,earthTime:accelerationTime+coastTime+decelerationTime,properTime:C*eta*inverse+coastTime/peakGamma,accelerationTime,decelerationTime,coastTime,kineticEnergy:delta*mass*C*C,totalEnergyLowerBound:2*delta*mass*C*C,profile:coastDistance>0?'Proper acceleration / coast / deceleration':'Acceleration-limited turnaround'};
}
export function communicationTimeline(jd,distance,replySeconds=0){valid(distance,'distance');valid(replySeconds,'reply wait');const delay=distance/C;return {sent:jd,arrival:jd+delay/86400,replySent:jd+(delay+replySeconds)/86400,replyArrival:jd+(2*delay+replySeconds)/86400,delay};}
