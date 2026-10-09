import {MIN_JD,SANDBOX_MAX_JD} from '../physics/units.js';
const vector=(x,n,limit)=>Array.isArray(x)&&x.length===n&&x.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=limit);
export function validUniversePose(p){return !!p&&vector(p.positionSI,3,1e24)&&vector(p.targetSI,3,1e24)&&vector(p.orientation,4,2)&&Math.hypot(...p.orientation)>.001&&['free','orbit'].includes(p.mode)&&Number.isFinite(p.fov)&&p.fov>=.1&&p.fov<=120&&(p.navigationSpeed==null||Number.isFinite(p.navigationSpeed)&&p.navigationSpeed>=1&&p.navigationSpeed<=1e23);}
export function validateSession(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!['nearby','milky','group','system'].includes(input.section)||!Number.isFinite(input.span)||input.span<1000||input.span>1e24||!Number.isFinite(input.jd)||input.jd<MIN_JD||input.jd>=SANDBOX_MAX_JD||input.pose&&!validUniversePose(input.pose))throw new Error('Invalid exploration session');
 if(input.selected!=null&&(typeof input.selected!=='string'||input.selected.length>120)||input.systemId!=null&&(typeof input.systemId!=='string'||input.systemId.length>120)||input.name!=null&&(typeof input.name!=='string'||input.name.length>80))throw new Error('Invalid exploration selection');
 return {id:typeof input.id==='string'?input.id.slice(0,80):crypto.randomUUID(),name:input.name||'Exploration',section:input.section,selected:input.selected??null,systemId:input.systemId??null,span:input.span,jd:input.jd,pose:input.pose?structuredClone(input.pose):null,hz:!!input.hz,labels:!!input.labels,educational:!!input.educational,overlay:null};
}
