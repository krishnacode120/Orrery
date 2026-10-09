import {AU,DAY,YEAR,OBLIQUITY,norm,sub} from '../physics/units.js';
export const C=299792458,LY=C*YEAR,PC=AU*648000/Math.PI;
export const DISTANCE_UNITS={m:1,km:1000,AU,'light-seconds':C,'light-minutes':C*60,'light-hours':C*3600,'light-days':C*DAY,ly:LY,pc:PC};
export const equatorialToEcliptic=v=>[v[0],v[1]*Math.cos(OBLIQUITY)+v[2]*Math.sin(OBLIQUITY),-v[1]*Math.sin(OBLIQUITY)+v[2]*Math.cos(OBLIQUITY)];
export const eclipticToEquatorial=v=>[v[0],v[1]*Math.cos(OBLIQUITY)-v[2]*Math.sin(OBLIQUITY),v[1]*Math.sin(OBLIQUITY)+v[2]*Math.cos(OBLIQUITY)];
export function sphericalPosition(raDeg,decDeg,distance){const a=raDeg*Math.PI/180,d=decDeg*Math.PI/180;return equatorialToEcliptic([distance*Math.cos(d)*Math.cos(a),distance*Math.cos(d)*Math.sin(a),distance*Math.sin(d)]);}
const GALACTIC=[[-.0548755604162154,-.873437090234885,-.4838350155487132],[.4941094278755837,-.4448296299600112,.7469822444972189],[-.8676661490190047,-.1980763734312015,.4559837761750669]];
export function galacticCoordinates(position){const e=eclipticToEquatorial(position),g=GALACTIC.map(row=>row.reduce((n,x,i)=>n+x*e[i],0)),distance=norm(g);return {longitude:((Math.atan2(g[1],g[0])*180/Math.PI)%360+360)%360,latitude:distance?Math.asin(g[2]/distance)*180/Math.PI:0,distance};}
export function galacticToEcliptic(v){return equatorialToEcliptic(GALACTIC[0].map((_,i)=>GALACTIC.reduce((n,row,k)=>n+row[i]*v[k],0)));}
export function formatDistance(m,preferred='auto'){if(!Number.isFinite(m))return 'Unknown';let unit=preferred;if(unit==='auto')unit=Math.abs(m)>=PC?'pc':Math.abs(m)>=LY*.1?'ly':Math.abs(m)>=AU*.1?'AU':Math.abs(m)>=1000?'km':'m';return new Intl.NumberFormat(undefined,{maximumSignificantDigits:4}).format(m/(DISTANCE_UNITS[unit]??1))+' '+unit;}
export function formatDuration(s){if(!Number.isFinite(s))return 'Unknown';const [factor,label]=Math.abs(s)>=YEAR?[YEAR,'yr']:Math.abs(s)>=DAY?[DAY,'d']:Math.abs(s)>=3600?[3600,'h']:Math.abs(s)>=60?[60,'min']:[1,'s'];return new Intl.NumberFormat(undefined,{maximumSignificantDigits:4}).format(s/factor)+' '+label;}
export function lightDelay(a,b){const distance=norm(sub(a.position,b.position));return {distance,oneWay:distance/C,roundTrip:2*distance/C};}
// Render coordinates are always a difference in Float64, scaled before Float32 upload.
export const relativeRender=(position,origin,unit)=>[(position[0]-origin[0])/unit,(position[2]-origin[2])/unit,-(position[1]-origin[1])/unit];
