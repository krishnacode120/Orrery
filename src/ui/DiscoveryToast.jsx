import {useEffect,useRef,useState} from 'react';
import {useSimStore} from '../store/useSimStore.js';
import {useUIStore} from '../store/useUIStore.js';
export default function DiscoveryToast(){const s=useSimStore(x=>x.scenario),hidden=useUIStore(x=>x.hidden),last=useRef(null),lastWall=useRef(0),[message,setMessage]=useState(null);
 useEffect(()=>{if(last.current==null){last.current=s.eventSerial;return;}const previous=last.current;last.current=s.eventSerial;if(!s.view.discoveryNotifications)return;const categories={mission:['mission','burn','staging','insertion','deploy'],science:['eclipse','soi','apsis'],physics:['merge','bounce','fragment','tidal','capture']},allowed=s.view.notificationCategory==='all'?Object.values(categories).flat():categories[s.view.notificationCategory??'mission'];const event=[...s.events].reverse().find(e=>e.id>previous&&allowed?.includes(e.kind));if(event&&Date.now()-lastWall.current>10000){lastWall.current=Date.now();setMessage(event.message);}},[s.eventSerial,s.view.discoveryNotifications,s.view.notificationCategory]);
 useEffect(()=>{if(!message)return;const t=setTimeout(()=>setMessage(null),6000);return()=>clearTimeout(t);},[message]);return !hidden&&message?<div className="catalog-event-toast" role="status">{message}<button aria-label="Dismiss event notification" onClick={()=>setMessage(null)}>×</button></div>:null;
}
