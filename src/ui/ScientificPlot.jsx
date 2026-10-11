import {useMemo,useRef,useState} from 'react';
import {fmt} from './Fields.jsx';
export default function ScientificPlot({samples=[],field,label,unit='',events=[]}){
 const [window,setWindow]=useState([0,1]),[cursor,setCursor]=useState(null),drag=useRef(null);
 const data=useMemo(()=>samples.filter(x=>Number.isFinite(x.met)&&Number.isFinite(x[field])),[samples,field]);
 if(data.length<2)return <small>{label}: awaiting recorded samples.</small>;
 const first=data[0].met,span=Math.max(1,data.at(-1).met-first),lo=first+span*window[0],hi=first+span*window[1];
 const visible=data.filter(x=>x.met>=lo&&x.met<=hi),stride=Math.max(1,Math.ceil(visible.length/600)),draw=visible.filter((_,i)=>i%stride===0);
 const min=Math.min(...visible.map(x=>x[field])),max=Math.max(...visible.map(x=>x[field])),range=max-min||1;
 const x=t=>40+(t-lo)/(hi-lo)*500,y=v=>130-(v-min)/range*105;
 const pan=e=>{const rect=e.currentTarget.getBoundingClientRect(),fraction=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),time=lo+fraction*(hi-lo);
  setCursor(visible.reduce((best,s)=>!best||Math.abs(s.met-time)<Math.abs(best.met-time)?s:best,null));
  if(drag.current){const width=drag.current.window[1]-drag.current.window[0],delta=(e.clientX-drag.current.x)/rect.width*width,start=Math.max(0,Math.min(1-width,drag.current.window[0]-delta));setWindow([start,start+width]);}
 };
 return <div className="stack"><div className="row spread"><strong>{label}</strong><small className="mono">{cursor?fmt(cursor[field])+' '+unit+' · T+'+fmt(cursor.met,1)+' s':''}</small></div>
 <svg viewBox="0 0 560 160" style={{width:'100%',touchAction:'none',background:'#0b1118',border:'1px solid #2b3642'}} role="img" aria-label={label+' versus mission elapsed seconds. Scroll to zoom, drag to pan.'}
 onPointerMove={pan} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,window};}} onPointerUp={()=>drag.current=null}
 onWheel={e=>{const center=(window[0]+window[1])/2,width=Math.min(1,Math.max(.005,(window[1]-window[0])*Math.exp(e.deltaY*.001))),start=Math.max(0,Math.min(1-width,center-width/2));setWindow([start,start+width]);}}>
 {[25,77,130].map(py=><path key={py} d={'M40 '+py+'H540'} stroke="#293440" strokeWidth=".6"/>)}
 {events.filter(e=>e.met>=lo&&e.met<=hi).map((e,i)=><path key={i} d={'M'+x(e.met)+' 20V130'} stroke="#ae915f" strokeWidth=".6" strokeDasharray="2 3"><title>{e.message}</title></path>)}
 <polyline points={draw.map(s=>x(s.met)+','+y(s[field])).join(' ')} fill="none" stroke="#9fbdd0" strokeWidth="1.3"/>
 <text x="4" y="20" fontSize="9" fill="#9aabba">{fmt(max,2)}</text><text x="4" y="136" fontSize="9" fill="#9aabba">{fmt(min,2)}</text>
 <text x="40" y="151" fontSize="9" fill="#9aabba">{fmt(lo,0)} s</text><text x="540" y="151" textAnchor="end" fontSize="9" fill="#9aabba">{fmt(hi,0)} s</text>
 {cursor&&<circle cx={x(cursor.met)} cy={y(cursor[field])} r="3" fill="#dbe8f0"/>}
 </svg><div className="row"><button onClick={()=>setWindow([0,1])}>Reset plot</button><button onClick={()=>{const width=(window[1]-window[0])/2,center=(window[0]+window[1])/2;setWindow([center-width/2,center+width/2]);}}>Zoom in</button><small>Scroll to zoom · drag to pan</small></div></div>;
}
