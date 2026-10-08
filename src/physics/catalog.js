import {CAMERA_DEFAULTS} from '../navigation/settings.js';
import {transferPlan,sphereOfInfluence} from './transfers.js';
import { body, solarSystem, DEFAULT_SETTINGS } from './body.js';
import { G, AU, DAY, EARTH_MASS, EARTH_RADIUS, EARTH_AXIS, SOLAR_MASS, OBLIQUITY, julianDate, add, scale, cross, unit } from './units.js';
import { stateFromElements } from './orbital.js';
import { defaultRocket, rocketMass, EARTH_ROTATION } from './vehicles.js';
import { schwarzschild } from './exotic.js';

export const MOONS=[
 ['moon','Moon','earth',7.342e22,1737400,384400000,27.321661,'301'],
 ['phobos','Phobos','mars',1.066e16,11267,9376000,.31891,'401'],
 ['deimos','Deimos','mars',1.476e15,6200,23463000,1.26244,'402'],
 ['io','Io','jupiter',8.932e22,1821600,421700000,1.76914,'501'],
 ['europa','Europa','jupiter',4.80e22,1560800,671034000,3.55118,'502'],
 ['ganymede','Ganymede','jupiter',1.4819e23,2634100,1070412000,7.15455,'503'],
 ['callisto','Callisto','jupiter',1.0759e23,2410300,1882709000,16.689,'504'],
 ['titan','Titan','saturn',1.3452e23,2574730,1221870000,15.945,'606'],
 ['enceladus','Enceladus','saturn',1.0802e20,252100,237948000,1.370218,'602'],
 ['rhea','Rhea','saturn',2.3065e21,763500,527200000,4.518,'605'],
 ['iapetus','Iapetus','saturn',1.8056e21,734500,3560820000,79.3215,'608'],
 ['dione','Dione','saturn',1.0955e21,561400,377700000,2.7369,'604'],
 ['ariel','Ariel','uranus',1.2511e21,578900,190929000,2.5204,'701'],
 ['umbriel','Umbriel','uranus',1.2750e21,584700,265986000,4.144,'702'],
 ['miranda','Miranda','uranus',6.4426e19,235800,129846000,1.4135,'705'],
 ['titania','Titania','uranus',3.527e21,788900,435910000,8.706,'703'],
 ['oberon','Oberon','uranus',3.014e21,761400,583520000,13.463,'704'],
 ['triton','Triton','neptune',2.14e22,1353400,354759000,-5.87685,'801'],
];
export const HORIZONS={sun:'10',mercury:'199',venus:'299',earth:'399',mars:'499',jupiter:'599',
 saturn:'699',uranus:'799',neptune:'899',...Object.fromEntries(MOONS.map(x=>[x[0],x[7]])),
 pluto:'999',ceres:'2000001',voyager1:'-31',voyager2:'-32',jwst:'-170'};
export function toEcliptic([x,y,z]) {return [x,y*Math.cos(OBLIQUITY)-z*Math.sin(OBLIQUITY),y*Math.sin(OBLIQUITY)+z*Math.cos(OBLIQUITY)];}
export function toEquatorial([x,y,z]) {return [x,y*Math.cos(OBLIQUITY)+z*Math.sin(OBLIQUITY),-y*Math.sin(OBLIQUITY)+z*Math.cos(OBLIQUITY)];}
export function realityBodies(jd) {
  const bodies=solarSystem(jd);
  const earth=bodies.find(b=>b.id==='earth');earth.name='Earth';earth.mass=EARTH_MASS;earth.spin.axis=[...EARTH_AXIS];
  for(let index=0;index<MOONS.length;index++) {
    const [id,name,parentId,mass,radius,distance,days]=MOONS[index],parent=bodies.find(b=>b.id===parentId);
    // Mean circular paths with illustrative J2000 phases, not precision moon ephemerides.
    const phase=(jd-2451545)/(days)*2*Math.PI+index*1.618,frequency=2*Math.PI/(days*DAY);
    const local=toEcliptic([Math.cos(phase)*distance,Math.sin(phase)*distance,0]);
    const velocity=toEcliptic([-Math.sin(phase)*distance*frequency,Math.cos(phase)*distance*frequency,0]);
    if(id==='moon') {
      const fraction=mass/(mass+earth.mass);
      earth.position=add(earth.position,scale(local,-fraction));earth.velocity=add(earth.velocity,scale(velocity,-fraction));
    }
    bodies.push(body({id,name,type:'moon',parentId,mass,radius,color:id==='io'?'#c9aa63':'#a7abae',
      position:add(parent.position,local),velocity:add(parent.velocity,velocity),spin:{axis:[...EARTH_AXIS],period:days*DAY},
      metadata:{orbitModel:'Circular mean orbit; illustrative phase, use Horizons for accurate positions'}}));
  }
  return bodies;
}
export function earthBody() {
  return body({id:'earth',name:'Earth',type:'planet',mass:EARTH_MASS,radius:EARTH_RADIUS,material:'earth',color:'#47719d',
    spin:{axis:[...EARTH_AXIS],period:86164.0905},axialTilt:23.43928,atmosphere:{density:1.225,color:'#6e9cc9',height:100000}});
}
export function spacecraftAt(primary,orbit={},index=0,jd=julianDate()) {
  const r=primary.radius+(orbit.altitude??400000);
  const state=stateFromElements({a:r,e:orbit.e??0,i:(orbit.inclination??51.6)*Math.PI/180,Omega:(orbit.node??0)*Math.PI/180,
    omega:(orbit.periapsis??0)*Math.PI/180,M:(orbit.phase??index*30)*Math.PI/180},G*primary.mass);
  return body({id:'sat-'+index,name:orbit.name??'Satellite '+(index+1),type:'satellite',mass:800,radius:2,
    color:'#b9c6ce',material:'spacecraft',parentId:primary.id,massless:true,collisionMode:'none',
    position:add(primary.position,toEcliptic(state.position)),velocity:add(primary.velocity,toEcliptic(state.velocity)),
    trail:{length:800,color:'#dfb66c',mode:'history',width:1.2,duration:7200},
    spacecraft:{range:4e7,battery:1,capacityWh:1000,solarWatts:600,loadWatts:220,payload:'standby',orientation:[1,0,0],epochJD:jd}});
}
export const DEFAULT_VIEW={quality:'auto',exaggeration:1500,scale:'system',cameraMode:'orbit',labels:true,
  bloom:true,orbits:true,trails:true,vectors:false,markers:true,plane:false,links:false,showHill:false,showRoche:false,
  selected:'earth',panel:null,workspaceVersion:4,scaleMode:'visibility',realDistances:true,realRadii:false,distanceScale:1,planetScale:1500,moonScale:1500,spacecraftScale:10000,trailScale:1,labelScale:1,showMoons:true,showSOI:false,predictionPaths:true,transferPath:true,autoArrival:true,gravityGrid:'off',showAcceleration:false,showBarycenter:false,miniMap:false,miniMapMode:'system',pip:false,units:{mass:'kg',length:'km',radius:'km',velocity:'km/s',time:'d',angle:'deg'},
  navigation:{...CAMERA_DEFAULTS},timeBookmarks:[],showLagrange:false,terminator:false,textScale:1,highContrast:false,reducedMotion:false,camera:null,keyframes:[],savedCameras:[],exposure:1};
export function baseScenario(name='Solar system') {
  const jd=julianDate();
  return {version:2,name,mode:'sandbox',jd,bodies:[],settings:{...DEFAULT_SETTINGS},events:[],eventSerial:0,
    view:structuredClone(DEFAULT_VIEW),tags:[],description:'',provenance:{source:'custom',epochJD:jd,note:''},
    maneuvers:[],stations:[],telemetry:[],mission:{name,epochJD:jd}};
}
export const PRESETS=[
 ['solar-now','Solar system · now','astronomy','Approximate planets and mean circular moon paths'],
 ['solar-real','Solar system · real scale','astronomy','Physical orbital distances and radii'],
 ['earth-moon','Earth–Moon system','astronomy','Local Earth and Moon exploration'],
 ['jupiter-system','Jupiter system','astronomy','Galilean moons and the giant planet'],
 ['saturn-system','Saturn system','astronomy','Saturn, rings and major moons'],
 ['mars-transfer','Earth → Mars','mission','Lambert-initialized cruise outside Earth SOI'],
 ['venus-transfer','Earth → Venus','mission','Inner-planet cruise demonstration'],
 ['jupiter-transfer','Jupiter flyby','mission','Outer-planet cruise demonstration'],
 ['moon-transfer','Moon transfer','mission','Earth-centered Lambert transfer from parking orbit'],
 ['jupiter-heavy','Jupiter ×1000','dynamics','Mass edit in the live solar system'],
 ['solar-escape','Solar escape','mission','Explorer beyond solar escape speed'],
 ['earth-mars-impact','Earth vs Mars','dynamics','Fragmenting impact experiment'],
 ['asteroid-impact','Asteroid vs Earth','dynamics','High-speed asteroid impact'],
 ['star-impact','Two stars collision','dynamics','Merging stellar encounter'],
 ['empty','Empty workspace','sandbox','Build a system from first principles'],
 ['binary','Binary stars','dynamics','Two equal stars with barycentric velocities'],
 ['jupiter-star','Jupiter ignition','dynamics','Jupiter at 0.1 solar mass'],
 ['flyby','Stellar encounter','dynamics','A passing solar-mass perturber'],
 ['ten-moons','Ten moons','dynamics','Earth with a ring of circular moons'],
 ['rings','Tidal ring formation','dynamics','A satellite inside a giant planet’s Roche boundary'],
 ['collision','Giant impact','dynamics','Collision and resolved fragmentation'],
 ['figure-eight','Figure-eight','dynamics','Equal-mass periodic three-body initial state'],
 ['black-hole','Dark Sun','extreme','Solar mass black hole replaces the Sun'],
 ['galactic','Galactic center','extreme','4.3 million solar masses; Newtonian stellar orbit'],
 ['wormhole','Wormhole laboratory','extreme','Linked experimental transport mouths'],
 ['pulsar','Pulsar system','extreme','Rotating neutron star with an orbiting tracer'],
 ['asteroids','Asteroid field · 5000','particles','Massless tracers; octree gravity'],
 ['comet','Comet encounter','astronomy','Illustrative eccentric comet orbit'],
 ['rocket','Launch vehicle','mission','Two-stage point-mass launch from rotating Earth'],
 ['leo','Low Earth orbit','satellite','400 km / 51.6°'],
 ['meo','Medium Earth orbit','satellite','20200 km / 55°'],
 ['geo','Geosynchronous orbit','satellite','Sidereal circular equatorial orbit'],
 ['polar','Polar orbit','satellite','600 km / 90°'],
 ['sso','Sun-synchronous-like','satellite','700 km / 98°; J2 nodal precession not modeled'],
 ['elliptical','Elliptical Earth orbit','satellite','Eccentricity 0.35'],
 ['molniya','Highly elliptical orbit','satellite','Approximate 12-hour / 63.4° orbit'],
 ['constellation','Constellation','satellite','24 vehicles in six orbital planes'],
].map(([id,name,category,description])=>({id,name,category,description,tags:[category]}));
export function makePreset(id) {
  const entry=PRESETS.find(x=>x.id===id);if(!entry)throw new Error('Unknown preset');
  const s=baseScenario(entry.name);s.description=entry.description;s.tags=entry.tags;
  if(['binary','jupiter-star','flyby','asteroids','empty'].includes(id)){s.view.scale='system';s.view.cameraMode='orbit';}
  const solar=()=>{s.bodies=realityBodies(s.jd);s.provenance={source:'jpl',epochJD:s.jd,note:'JPL Table 1 planets; illustrative mean moon phases'};};
  if(id==='solar-now'){solar();s.mode='reality';}
  else if(['solar-real','earth-moon','jupiter-system','saturn-system','jupiter-heavy','solar-escape'].includes(id)){
   solar();s.view.scale='system';s.view.cameraMode='orbit';
   if(id==='solar-real'){s.mode='reality';s.view.realRadii=true;s.view.scaleMode='scientific';}
   if(['earth-moon','jupiter-system','saturn-system'].includes(id)){s.mode='reality';s.view.selected={'earth-moon':'earth','jupiter-system':'jupiter','saturn-system':'saturn'}[id];s.view.scale='planetary';}
   if(id==='jupiter-heavy')s.bodies.find(b=>b.id==='jupiter').mass*=1000;
   if(id==='solar-escape'){const b=spacecraftAt(s.bodies[0],{altitude:AU-s.bodies[0].radius,inclination:0},0,s.jd);b.velocity=b.velocity.map(x=>x*1.6);b.name='Escape explorer';s.bodies.push(b);s.view.selected=b.id;}
  }
  else if(['mars-transfer','venus-transfer','jupiter-transfer','moon-transfer'].includes(id)){
   solar();const source=s.bodies.find(b=>b.id==='earth'),target={'mars-transfer':'mars','venus-transfer':'venus','jupiter-transfer':'jupiter','moon-transfer':'moon'}[id],days={'mars-transfer':259,'venus-transfer':146,'jupiter-transfer':998,'moon-transfer':4.5}[id];
   const b=spacecraftAt(source,{altitude:200000,inclination:0},0,s.jd);b.id='transfer-explorer';b.name='Transfer explorer';b.type='spacecraft';b.spacecraft.range=1e14;
   if(target!=='moon'){const initial=transferPlan(s,'earth',target,days),distance=sphereOfInfluence(source,s.bodies,s.settings)*1.05;b.position=add(source.position,scale(unit(initial.departureVector),distance));b.parentId='sun';}
   s.bodies.push(b);const plan=transferPlan(s,b.id,target,days);b.velocity=plan.departureVelocity;s.mission={name:entry.name,epochJD:s.jd,targetId:target,transfer:plan};s.view={...s.view,selected:b.id,targetId:target,scale:target==='moon'?'planetary':'system',cameraMode:'orbit',transferPreview:plan,transferPath:true,showSOI:true,panel:'mission'};s.settings={...s.settings,stepSeconds:target==='moon'?30:1800,timeScale:target==='moon'?1000:DAY,adaptive:true,roche:false,collisionMode:'none',softening:10};
  }
  else if(['earth-mars-impact','asteroid-impact','star-impact'].includes(id)){
   const source=solarSystem(s.jd),earth=earthBody(),other=structuredClone(source.find(b=>b.id===(id==='star-impact'?'sun':'mars')));earth.parentId=null;other.parentId=null;
   if(id==='star-impact')Object.assign(earth,{type:'star',mass:SOLAR_MASS,radius:6.957e8,name:'Star A'});
   if(id==='asteroid-impact')Object.assign(other,{type:'asteroid',mass:1e16,radius:10000,name:'Asteroid'});
   other.id='impactor';other.position=[(earth.radius+other.radius)*4,0,0];other.velocity=[-20000,1000,0];s.bodies=[earth,other];s.settings={...s.settings,collisionMode:id==='star-impact'?'merge':'fragment',roche:false,stepSeconds:1,timeScale:100};s.view.selected='earth';s.view.scale='planetary';
  }
  else if(id==='empty')s.view.selected=null;
  else if(['black-hole','jupiter-star','flyby','ten-moons','comet','wormhole'].includes(id)) {
    solar();
    if(id==='black-hole') {
      const sun=s.bodies[0];sun.type='blackHole';sun.radius=schwarzschild(sun.mass);sun.luminosity=0;sun.color='#171b21';
      s.view.selected='sun';sun.blackHole={diskSize:12,temperature:15000,doppler:true,photonSphere:true,accretedMass:0,spin:0};
    }
    if(id==='jupiter-star')Object.assign(s.bodies.find(b=>b.id==='jupiter'),{mass:0.1*SOLAR_MASS,type:'star',radius:1e8,temperature:3200,luminosity:1e24});
    if(id==='flyby')s.bodies.push(body({id:'visitor',name:'Visitor',type:'star',mass:SOLAR_MASS,radius:6.957e8,color:'#bdcee4',
      position:[-30*AU,8*AU,0],velocity:[50000,0,0]}));
    if(id==='ten-moons')for(let i=0;i<10;i++){const b=spacecraftAt(s.bodies.find(b=>b.id==='earth'),{altitude:4e8,phase:i*36},i,s.jd);
      b.id='extra-moon-'+i;b.name='Moon '+(i+1);b.type='moon';b.mass=7e18;b.radius=1e5;b.massless=false;b.spacecraft=null;s.bodies.push(b);}
    if(id==='comet'){const state=stateFromElements({a:17.8*AU,e:.967,i:162.3*Math.PI/180,M:0},G*SOLAR_MASS);
      s.bodies.push(body({id:'comet',name:'Halley-like comet',type:'comet',mass:2.2e14,radius:5500,parentId:'sun',...state}));s.view.selected='comet';}
    if(id==='wormhole') {
      const earth=s.bodies.find(b=>b.id==='earth'),mars=s.bodies.find(b=>b.id==='mars');
      for(const [index,p] of [earth,mars].entries())s.bodies.push(body({id:'mouth-'+index,name:'Mouth '+(index?'B':'A'),type:'wormholeMouth',mass:0,massless:true,locked:true,
        radius:2e8,position:add(p.position,[4e8,0,0]),wormhole:{pairId:'mouth-'+(1-index),throatRadius:2e8,orientation:[0,0,0,1],transformVelocity:true,cooldown:30}}));
      s.view.selected='mouth-0';
    }
  } else if(id==='binary') {
    const distance=AU,speed=Math.sqrt(G*SOLAR_MASS/(4*distance));
    s.bodies=[-1,1].map((sign,i)=>body({id:'star-'+i,name:'Star '+(i+1),type:'star',mass:SOLAR_MASS,radius:6.957e8,color:i?'#d8e8ff':'#f6d0a0',
      position:[sign*distance,0,0],velocity:[0,sign*speed,0],luminosity:3.8e26,temperature:i?7000:5200}));
    s.view.selected='star-0';
  } else if(id==='figure-eight') {
    const m=1e26,L=1e10,V=Math.sqrt(G*m/L);
    s.bodies=[[-.97000436,.24308753,.466203685,.43236573],[.97000436,-.24308753,.466203685,.43236573],[0,0,-.93240737,-.86473146]]
      .map(([x,y,vx,vy],i)=>body({id:'three-'+i,name:'Body '+i,mass:m,radius:1e7,position:[x*L,y*L,0],velocity:[vx*V,vy*V,0]}));
    s.settings.stepSeconds=500;s.view.selected='three-0';s.view.scale='planetary';
  } else if(id==='galactic'||id==='pulsar') {
    const mass=id==='galactic'?4.3e6*SOLAR_MASS:1.4*SOLAR_MASS,radius=id==='galactic'?schwarzschild(mass):12000;
    const central=body({id:'central',name:id==='galactic'?'Sagittarius A* model':'Pulsar',type:id==='galactic'?'blackHole':'pulsar',mass,radius,
      spin:{axis:[0,0,1],period:.1},blackHole:id==='galactic'?{diskSize:10,temperature:20000,doppler:true,photonSphere:true,spin:0,accretedMass:0}:null});
    const state=stateFromElements({a:id==='galactic'?1000*AU:1e9,e:.2},G*mass);
    s.bodies=[central,body({id:'orbiter',name:'Orbiter',type:'star',mass:1e24,radius:1e7,parentId:'central',...state})];
    s.settings.stepSeconds=id==='galactic'?86400:1;s.view.selected='central';
  } else if(id==='collision'||id==='rings') {
    const earth=earthBody();earth.id='primary';earth.name='Primary';s.bodies=[earth];s.settings.timeScale=500;s.settings.stepSeconds=5;
    if(id==='collision'){s.bodies.push(body({id:'impactor',name:'Impactor',mass:6e23,radius:3e6,position:[2e7,0,0],velocity:[-15000,1500,0]}));s.settings.collisionMode='fragment';s.settings.roche=false;}
    else {const moon=spacecraftAt(earth,{altitude:1.1e7,inclination:0},0,s.jd);Object.assign(moon,{id:'tidal-moon',name:'Tidal moon',type:'moon',mass:7e22,radius:2e6,massless:false,spacecraft:null,collisionMode:'inherit'});s.bodies.push(moon);}
    s.view.selected='primary';s.view.scale='planetary';
  } else if(id==='asteroids') {
    s.bodies=realityBodies(s.jd).slice(0,12);
    for(let i=0;i<5000;i++){const a=(2+(i%997)/997)*AU,phase=i*2.399963;const speed=Math.sqrt(G*SOLAR_MASS/a);
      s.bodies.push(body({id:'asteroid-'+i,name:'Asteroid '+i,type:'asteroid',mass:0,massless:true,radius:10000,
        position:[Math.cos(phase)*a,Math.sin(phase)*a,Math.sin(i*1.7)*.05*AU],velocity:[-Math.sin(phase)*speed,Math.cos(phase)*speed,0]}));}
    s.settings.solver='tree';s.settings.roche=false;s.settings.collisionMode='none';s.view.selected='sun';s.view.labels=false;
  } else {
    const earth=earthBody();s.bodies=[earth];s.settings={...s.settings,stepSeconds:10,softening:1,timeScale:60,collisionMode:'none',roche:false};
    s.stations=[{id:'equator',name:'Equatorial station',bodyId:'earth',latitude:0,longitude:0,altitude:10},
      {id:'canberra',name:'Canberra model',bodyId:'earth',latitude:-35.4,longitude:148.98,altitude:700},
      {id:'madrid',name:'Madrid model',bodyId:'earth',latitude:40.4,longitude:-4.25,altitude:800}];
    if(id==='rocket') {
      const rocket=defaultRocket(),r=[EARTH_RADIUS+30,0,0];
      s.bodies.push(body({id:'launch-vehicle',name:'LV-01',type:'rocket',mass:rocketMass(rocket),radius:5,massless:true,locked:true,parentId:'earth',collisionMode:'none',
        position:r,velocity:cross(scale(EARTH_AXIS,EARTH_ROTATION),r),rocket,material:'spacecraft'}));
      s.settings.stepSeconds=.25;s.settings.timeScale=10;s.view.selected='launch-vehicle';s.view.scale='vehicle';s.view.cameraMode='rocket chase';s.view.panel='mission';
    } else {
      const orbits={leo:{altitude:400000,inclination:51.6},meo:{altitude:20200000,inclination:55},
        geo:{altitude:Math.cbrt(G*earth.mass*(86164.0905/(2*Math.PI))**2)-earth.radius,inclination:0},
        polar:{altitude:600000,inclination:90},sso:{altitude:700000,inclination:98},
        elliptical:{altitude:12000000,e:.35,inclination:45},molniya:{altitude:26600000-earth.radius,e:.74,inclination:63.4}};
      for(let i=0;i<(id==='constellation'?24:1);i++)s.bodies.push(spacecraftAt(earth,id==='constellation'?{altitude:20200000,inclination:55,node:Math.floor(i/4)*60,phase:(i%4)*90}:orbits[id],i,s.jd));
      s.view.selected='sat-0';s.view.scale='earth';s.view.panel='mission';s.view.links=true;
    }
    s.provenance={source:'custom',epochJD:s.jd,note:'Earth-centered inertial mission, axes parallel to J2000 ecliptic'};
  }
  return s;
}
