export const catalogVertex=`
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 color;
uniform float pointSize;
varying vec3 vColor;
void main(){
 vColor=color;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
 gl_PointSize=pointSize;
 #include <logdepthbuf_vertex>
}
`;
export const catalogFragment=`
#include <logdepthbuf_pars_fragment>
uniform float opacity;
uniform vec3 tint;
varying vec3 vColor;
void main(){
 #include <logdepthbuf_fragment>
 float radius=length(gl_PointCoord-vec2(.5))*2.;
 if(radius>1.)discard;
 float alpha=exp(-3.5*radius*radius)*(1.-smoothstep(.7,1.,radius))*opacity;
 gl_FragColor=vec4(vColor*tint,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}
`;
