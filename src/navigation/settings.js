const AU=149597870700;
export const CAMERA_MODES=['free','orbit','follow','chase','target-lock','cinematic','surface','rocket','satellite'];
export const CAMERA_DEFAULTS={
 speed:AU*.01,adaptiveSpeed:true,vertical:'world',sensitivity:.0025,invertY:false,unrestricted:false,
 translationDamping:8,rotationDamping:14,zoomDamping:10,followDamping:5,precisionFactor:.001,boostFactor:10,
 chaseOrientation:'velocity',pointerLock:false,collision:true,allowInterior:false,clearance:10,chaseDistance:15,chaseHeight:4,
 reference:'inertial',referenceId:null,fov:42,surfaceLatitude:0,surfaceLongitude:0,surfaceAltitude:100,
 minimalSpeed:true,minimalDate:false,minimalTarget:false,showNavigation:true,
};
export function cameraMode(mode){return ({'rocket chase':'rocket','satellite chase':'satellite',destination:'target-lock',side:'chase',nose:'chase',flyby:'cinematic'})[mode]??(CAMERA_MODES.includes(mode)?mode:'orbit');}
export function validateNavigation(input={}){
 const s={...CAMERA_DEFAULTS,...input};
 if(!Number.isFinite(s.speed)||s.speed<.01||s.speed>10*AU)throw new Error('Camera speed must be 0.01 m/s–10 AU/s');
 if(!['velocity','attitude'].includes(s.chaseOrientation))throw new Error('Invalid chase orientation');
 if(!['world','camera'].includes(s.vertical))throw new Error('Invalid camera vertical axis');
 if(!['inertial','sun','planet','moon','spacecraft','velocity'].includes(s.reference))throw new Error('Invalid camera reference frame');
 for(const key of ['translationDamping','rotationDamping','zoomDamping','followDamping'])if(!Number.isFinite(s[key])||s[key]<0||s[key]>100)throw new Error('Invalid camera damping');
 if(!Number.isFinite(s.sensitivity)||s.sensitivity<.0001||s.sensitivity>.05)throw new Error('Invalid mouse sensitivity');
 if(!Number.isFinite(s.fov)||s.fov<.1||s.fov>120)throw new Error('Camera FOV must be 0.1–120 degrees');
 for(const key of ['adaptiveSpeed','invertY','unrestricted','pointerLock','collision','allowInterior','minimalSpeed','minimalDate','minimalTarget','showNavigation'])if(typeof s[key]!=='boolean')throw new Error('Invalid camera option: '+key);
 for(const key of ['clearance','chaseDistance','chaseHeight','surfaceAltitude'])if(!Number.isFinite(s[key])||s[key]<0||s[key]>1e12)throw new Error('Invalid camera distance');
 if(!Number.isFinite(s.surfaceLatitude)||Math.abs(s.surfaceLatitude)>90||!Number.isFinite(s.surfaceLongitude)||Math.abs(s.surfaceLongitude)>180)throw new Error('Invalid surface coordinates');
 if(!(s.precisionFactor>0&&s.precisionFactor<=1&&s.boostFactor>=1&&s.boostFactor<=1000))throw new Error('Invalid camera speed modifier');
 return s;
}
export function validPose(p){
 return !!p&&['positionSI','targetSI'].every(k=>Array.isArray(p[k])&&p[k].length===3&&p[k].every(x=>Number.isFinite(x)&&Math.abs(x)<=1e20))
 &&Array.isArray(p.orientation)&&p.orientation.length===4&&p.orientation.every(Number.isFinite)&&Math.hypot(...p.orientation)>.001
 &&CAMERA_MODES.includes(p.mode)&&Number.isFinite(p.fov)&&p.fov>=.1&&p.fov<=120;
}
