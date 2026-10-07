import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Color,Vector3,DoubleSide,BackSide,AdditiveBlending} from 'three';
import {useSimStore} from '../store/useSimStore.js';
import {AU,sub} from '../physics/units.js';
import {vertex} from '../shaders/materials.js';
function useSunlight(body,extra){
 const uniforms=useMemo(()=>({...extra,lightDirection:{value:new Vector3(1,0,0)}}),[body.id,body.color,body.radius,body.atmosphere?.color,body.rings?.opacity]);
 useFrame(({camera})=>{const s=useSimStore.getState().scenario,star=s.bodies.find(x=>x.type==='star'&&x.id!==body.id),b=s.bodies.find(x=>x.id===body.id)??body;
 const light=star?sub(star.position,b.position):[AU,AU*.2,0];uniforms.lightDirection.value.set(light[0],light[2],-light[1]).transformDirection(camera.matrixWorldInverse);});
 return uniforms;
}
const atmosphere=`
#include <logdepthbuf_pars_fragment>
uniform vec3 tint;uniform vec3 lightDirection;
varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUv;
void main(){
#include <logdepthbuf_fragment>
vec3 n=normalize(vNormal),view=normalize(-vPosition);
float edge=pow(1.-abs(dot(n,view)),4.);
float light=smoothstep(-.28,.65,dot(n,normalize(lightDirection)));
vec3 c=mix(tint*.25,tint,light);
gl_FragColor=vec4(c,edge*(.055+.24*light));
}`;
export function Atmosphere({body,radius}){
 const uniforms=useSunlight(body,{tint:{value:new Color(body.atmosphere.color)}});
 const height=Math.min(.025,Math.max(.003,body.atmosphere.height/body.radius));
 return <mesh><sphereGeometry args={[radius*(1+height),64,40]}/><shaderMaterial vertexShader={vertex} fragmentShader={atmosphere} uniforms={uniforms} transparent side={BackSide} depthWrite={false} blending={AdditiveBlending}/></mesh>;
}
const ringVertex=`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vNormal;varying vec3 vPosition;varying vec3 vCenter;varying float radiusRatio;
uniform float planetRadius;
void main(){vNormal=normalize(normalMatrix*normal);vPosition=(modelViewMatrix*vec4(position,1.)).xyz;vCenter=(modelViewMatrix*vec4(0.,0.,0.,1.)).xyz;radiusRatio=length(position.xy)/planetRadius;gl_Position=projectionMatrix*vec4(vPosition,1.);
#include <logdepthbuf_vertex>
}`;
const ringFragment=`
#include <logdepthbuf_pars_fragment>
uniform vec3 lightDirection;uniform float opacity;uniform float planetRadius;
varying vec3 vNormal;varying vec3 vPosition;varying vec3 vCenter;varying float radiusRatio;
void main(){
#include <logdepthbuf_fragment>
float r=radiusRatio;
float detail=.64+.12*sin(r*83.)+.07*sin(r*197.)+.045*sin(r*431.);
float cassini=1.-smoothstep(1.94,1.96,r)*(1.-smoothstep(2.025,2.05,r));
float cRing=mix(.24,1.,smoothstep(1.50,1.61,r));
vec3 col=mix(vec3(.22,.19,.15),vec3(.65,.60,.48),smoothstep(1.48,1.7,r))*detail;
vec3 L=normalize(lightDirection),p=vPosition-vCenter;float projection=dot(p,L);
float shadow=step(projection,0.)*step(dot(p,p)-projection*projection,planetRadius*planetRadius);
float illumination=.22+.78*abs(dot(normalize(vNormal),L));
gl_FragColor=vec4(col*illumination*mix(1.,.10,shadow),clamp(opacity*detail*cRing*cassini,0.,.95));
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
export function PlanetRings({body,radius}){
 const uniforms=useSunlight(body,{opacity:{value:body.rings.opacity},planetRadius:{value:radius}});
 uniforms.planetRadius.value=radius;uniforms.opacity.value=body.rings.opacity;
 return <mesh rotation={[Math.PI/2,0,0]}><ringGeometry args={[radius*body.rings.inner/body.radius,radius*body.rings.outer/body.radius,256]}/><shaderMaterial vertexShader={ringVertex} fragmentShader={ringFragment} uniforms={uniforms} transparent side={DoubleSide} depthWrite={false}/></mesh>;
}
const haloFragment=`
#include <logdepthbuf_pars_fragment>
varying vec2 vUv;void main(){
#include <logdepthbuf_fragment>
float r=length(vUv-.5)*2.;float halo=exp(-r*6.)*(1.-smoothstep(.75,1.,r));gl_FragColor=vec4(vec3(1.,.61,.22),halo*.36);}`;
export function SolarHalo({radius}){
 const ref=useRef();useFrame(({camera})=>{ref.current.quaternion.copy(camera.quaternion);});
 return <mesh ref={ref} renderOrder={1}><planeGeometry args={[radius*8,radius*8]}/><shaderMaterial vertexShader={vertex} fragmentShader={haloFragment} transparent depthWrite={false} blending={AdditiveBlending}/></mesh>;
}
