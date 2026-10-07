export const vertex=`
 #include <common>
 #include <logdepthbuf_pars_vertex>
 varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUv;
 void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);vPosition=(modelViewMatrix*vec4(position,1.)).xyz;
 gl_Position=projectionMatrix*vec4(vPosition,1.);
 #include <logdepthbuf_vertex>
 }
`;
export const planetFragment=`
 #include <logdepthbuf_pars_fragment>

 uniform vec3 baseColor;uniform vec3 lightDirection;uniform float kind;uniform float time;
 uniform sampler2D surfaceMap;uniform sampler2D nightMap;uniform sampler2D cloudMap;uniform float mapped;uniform float cloudVisibility;
 varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUv;
 float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453123);}
 float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float fbm(vec3 p){float a=.5,n=0.;for(int i=0;i<5;i++){n+=a*noise(p);p=p*2.03+vec3(17.1,3.2,5.4);a*=.5;}return n;}
 void main(){
 #include <logdepthbuf_fragment>

 vec3 n=normalize(vNormal);float lon=vUv.x*6.283185,lat=(vUv.y-.5)*3.14159;
 vec3 p=vec3(cos(lat)*cos(lon),sin(lat),cos(lat)*sin(lon));
 float terrain=fbm(p*4.5),detail=fbm(p*65.);vec3 color=baseColor*(.65+.55*terrain+.13*detail);
 if(kind>0.5&&kind<1.5){
 float land=smoothstep(.49,.52,terrain+.08*sin(lon*2.));color=mix(vec3(.015,.075,.15),mix(vec3(.10,.16,.10),vec3(.3,.26,.17),detail),land);
 color=mix(color,vec3(.67,.72,.73),smoothstep(.8,.96,abs(p.y)+.04*terrain));
 float clouds=smoothstep(.59,.75,fbm(p*8.+vec3(time*.002,0,0)));color=mix(color,vec3(.85),clouds*.7);
 } else if(kind>1.5&&kind<2.5){float bands=sin(lat*65.+fbm(p*9.)*9.);color=baseColor*(.68+.22*bands+.25*terrain);}
 if(mapped>.5){color=texture2D(surfaceMap,vUv).rgb;if(kind>.5&&kind<1.5){float cloud=texture2D(cloudMap,vec2(fract(vUv.x+time*.0000003),vUv.y)).r;color=mix(color,vec3(.8),smoothstep(.2,.9,cloud)*.8*cloudVisibility);}}
 if(kind>.5&&kind<1.5&&cloudVisibility<.5)color=vec3(.055,.085,.068)+vec3(.045,.045,.035)*fbm(p*3500.);
 float diffuse=max(0.,dot(n,normalize(lightDirection)));float rim=pow(1.-max(0.,dot(n,normalize(-vPosition))),3.);
 vec3 lit=color*(.018+.98*diffuse);
 if(kind>.5&&kind<1.5){float darkness=smoothstep(.1,-.3,dot(n,normalize(lightDirection)));lit+=texture2D(nightMap,vUv).rgb*darkness*.8;lit+=vec3(.09,.22,.37)*rim*pow(diffuse,.5)*.55;float ocean=1.-smoothstep(.02,.12,color.r);vec3 halfVector=normalize(normalize(lightDirection)+normalize(-vPosition));lit+=vec3(.15)*pow(max(0.,dot(n,halfVector)),70.)*ocean*diffuse;}
 if(kind>2.5)lit=color*(2.3+.6*detail);
 gl_FragColor=vec4(lit,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
export const atmosphereFragment=`
 #include <logdepthbuf_pars_fragment>

 uniform vec3 color;varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUv;
 void main(){
 #include <logdepthbuf_fragment>
float f=pow(1.-abs(dot(normalize(vNormal),normalize(-vPosition))),3.5);
 gl_FragColor=vec4(color,f*.35);}
`;
export const diskFragment=`
 #include <logdepthbuf_pars_fragment>

 uniform float time;uniform float doppler;uniform float temperature;varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUv;
 void main(){
 #include <logdepthbuf_fragment>
vec2 p=vUv-.5;float r=length(p)*2.;float a=atan(p.y,p.x);
 float inner=.16;if(r<inner||r>1.)discard;
 float heat=pow(max(r/inner,1.),-.75);float turbulence=.7+.3*sin(a*22.-time*2.+log(r)*50.)*sin(r*190.+time);
 vec3 c=mix(vec3(.32,.065,.012),mix(vec3(1.,.49,.12),vec3(.8,.9,1.),clamp((temperature-10000.)/30000.,0.,1.)),heat);
 float beam=mix(1.,1.+.65*cos(a),doppler);
 gl_FragColor=vec4(c*(1.+3.*heat)*turbulence*beam,smoothstep(1.,.7,r)*smoothstep(inner,inner+.03,r));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
export const lensFragment=`
 #include <logdepthbuf_pars_fragment>

 varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUv;uniform float time;
 float stars(vec2 p){vec2 i=floor(p*150.);vec2 f=fract(p*150.)-.5;float h=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453);return step(.989,h)*exp(-dot(f,f)*150.);}
 void main(){
 #include <logdepthbuf_fragment>
vec2 p=vUv-.5;float r=length(p)*2.;vec2 warped=p*(1.+.07/max(r*r,.005));float ring=exp(-pow((r-.67)*70.,2.));vec3 col=vec3(.45,.60,.75)*stars(warped)+vec3(.9,.64,.29)*ring*.65;col*=smoothstep(.48,.54,r);gl_FragColor=vec4(col,1.);}
`;
export const portalFragment=`
 #include <logdepthbuf_pars_fragment>

 uniform sampler2D portal;uniform float time;varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUv;
 void main(){
 #include <logdepthbuf_fragment>
vec2 p=vUv-.5;float r=length(p)*2.;vec2 uv=.5+p*(1.+.07*sin(r*18.-time)*pow(r,4.));vec3 c=texture2D(portal,uv).rgb;
 float rim=pow(1.-abs(dot(normalize(vNormal),normalize(-vPosition))),5.);gl_FragColor=vec4(c+vec3(.25,.45,.6)*rim,1.);}
`;
