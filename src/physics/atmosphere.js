// Dry, still-air layered hydrostatic approximation. Not CFD or a weather model.
const R=287.05287,g=9.80665,gamma=1.4;
const bounds=[0,11000,20000,32000,47000,51000,71000,84852];
const lapse=[-.0065,0,.001,.0028,0,-.0028,-.002];
const base=[{height:0,temperature:288.15,pressure:101325}];
for(let k=0;k<lapse.length;k++){
 const b=base[k],h=bounds[k+1],L=lapse[k],T=b.temperature+L*(h-b.height);
 base.push({height:h,temperature:T,pressure:L===0?b.pressure*Math.exp(-g*(h-b.height)/(R*b.temperature)):b.pressure*(T/b.temperature)**(-g/(R*L))});
}
export function atmosphere(primary,altitude){
 if(!Number.isFinite(altitude))throw new Error('Finite atmosphere altitude required');
 const h=Math.max(0,altitude),earth=primary.id==='earth',mars=primary.id==='mars';
 if(!primary.atmosphere)return {density:0,pressure:0,temperature:0,speedOfSound:0,model:'Vacuum'};
 if(earth){
  let k=bounds.findIndex((x,i)=>i>0&&h<x)-1;if(k<0)k=lapse.length-1;
  const b=base[k],L=lapse[k],T=h<=84852?b.temperature+L*(h-b.height):186.946;
  let p=h<=84852?(L===0?b.pressure*Math.exp(-g*(h-b.height)/(R*T)):b.pressure*(T/b.temperature)**(-g/(R*L))):base.at(-1).pressure*Math.exp(-(h-84852)/6500);
  if(h>=150000)p=0;
  return {density:p/(R*T),pressure:p,temperature:T,speedOfSound:Math.sqrt(gamma*R*T),model:'Layered dry standard atmosphere + exponential upper extension · APPROXIMATE'};
 }
 const T=mars?Math.max(130,210-.001*h):250,gas=mars?188.92:R,H=mars?11100:8500;
 const density=h<Math.max(150000,primary.atmosphere.height*2)?primary.atmosphere.density*Math.exp(-h/H):0;
 return {density,pressure:density*gas*T,temperature:T,speedOfSound:Math.sqrt((mars?1.29:gamma)*gas*T),model:(''+(mars?'Mars CO₂':'Generic')+' exponential atmosphere · APPROXIMATE')};
}
export function flightAtmosphere(primary,altitude,airSpeed,noseRadius=1){
 const air=atmosphere(primary,altitude);
 return {...air,mach:air.density>0&&air.speedOfSound>0?airSpeed/air.speedOfSound:null,q:.5*air.density*airSpeed**2,
  heatingProxy:1.83e-4*Math.sqrt(air.density/Math.max(.01,noseRadius))*airSpeed**3,heatingModel:'Sutton–Graves-shaped convective heating proxy · APPROXIMATE W/m²; no ablation'};
}
export function enginePerformance(stage,pressure=0,command=1){
 const p=Math.max(0,Math.min(1,pressure/101325)),vacThrust=stage.vacuumThrust??stage.thrust,seaThrust=stage.seaLevelThrust??stage.thrust;
 const vacuumIsp=stage.vacuumIsp??stage.isp,seaIsp=stage.seaLevelIsp??stage.isp;
 const throttle=command<=0?0:Math.max(stage.minThrottle??0,Math.min(stage.maxThrottle??1,command));
 const thrust=(vacThrust+(seaThrust-vacThrust)*p)*(stage.engineCount??1)*throttle,isp=vacuumIsp+(seaIsp-vacuumIsp)*p;
 return {thrust,isp,throttle,massFlow:thrust/(9.80665*isp)};
}
