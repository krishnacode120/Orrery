import { validateScenario } from './physics/scenario.js';

function database() {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open('orrery',1);
    request.onupgradeneeded = () => request.result.createObjectStore('scenarios');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function localScenario(value) {
  const db = await database();
  try {
    return await new Promise((resolve,reject) => {
      const tx = db.transaction('scenarios', value ? 'readwrite' : 'readonly');
      const store = tx.objectStore('scenarios');
      const request = value ? store.put(validateScenario(value),'autosave') : store.get('autosave');
      tx.oncomplete = () => resolve(value ? undefined : request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Storage transaction aborted'));
    });
  } finally { db.close(); }
}
export async function localExperiment(value) {
 const normalize=record=>{
  if(!record)return null;const validated={baseline:validateScenario(record.baseline),experiment:validateScenario(record.experiment),original:validateScenario(record.original),originalPaused:record.originalPaused??true};
  if(!validated.experiment.branch||typeof validated.originalPaused!=='boolean')throw new Error('Invalid saved experiment session');
  if(new TextEncoder().encode(JSON.stringify(validated)).byteLength>64*1024*1024)throw new Error('Experiment session exceeds 64 MiB');return validated;
 };
 const record=value?normalize(value):null,db=await database();
 try{const saved=await new Promise((resolve,reject)=>{const tx=db.transaction('scenarios',value?'readwrite':'readonly'),store=tx.objectStore('scenarios'),request=value?store.put(record,'whatif-session'):store.get('whatif-session');tx.oncomplete=()=>resolve(value?undefined:request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Experiment persistence aborted'));});return value?undefined:normalize(saved);}finally{db.close();}
}

export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { ...options,
    headers: { 'Content-Type':'application/json', ...options.headers }, signal: options.signal??AbortSignal.timeout(30000) });
  if(response.status===204)return null;
  const text=await response.text();let result;
  try{result=text?JSON.parse(text):null;}catch{if(!response.ok)throw new Error(`Request failed (${response.status})`);throw new Error('API returned invalid JSON');}
  if (!response.ok) throw new Error(typeof result?.detail === 'string' ? result.detail : `Request failed (${response.status})`);
  return result;
}
export function exportScenario(scenario) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(validateScenario(scenario),null,2)], { type:'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'orrery-scenario.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}

export function download(blob,name) {
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function scenarioLibrary(action='list',value=null,id=null) {
 if(!['list','save','delete'].includes(action))throw new Error('Unknown scenario library action');
 const scenario=action==='save'?validateScenario(value):null,recordId=id??crypto.randomUUID(),db=await database();
 try{return await new Promise((resolve,reject)=>{
 const tx=db.transaction('scenarios',action==='list'?'readonly':'readwrite'),store=tx.objectStore('scenarios');let request,keys;
 if(action==='save')request=store.put({id:recordId,updatedAt:new Date().toISOString(),scenario},'saved:'+recordId);
 else {request=store.getAll();keys=store.getAllKeys();if(action==='delete')keys.onsuccess=()=>{request.result.forEach((item,i)=>{if(item?.scenario&&(item.id===id||keys.result[i]===id))store.delete(keys.result[i]);});};}
 tx.oncomplete=()=>resolve(action==='list'?request.result.map((item,i)=>item?.scenario?{...item,storageKey:keys.result[i]}:null).filter(x=>x&&typeof x.id==='string'&&typeof x.updatedAt==='string').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)):action==='save'?recordId:undefined);
 tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Scenario library transaction aborted'));
 });}finally{db.close();}
}
export function exportTelemetry(s,format='csv') {
 const samples=s.telemetry;
 if(format==='json'){download(new Blob([JSON.stringify(samples,null,2)],{type:'application/json'}),'orrery-telemetry.json');return;}
 const keys=['jd','bodyId','met','altitude','speed','acceleration','verticalSpeed','horizontalSpeed','groundSpeed','propellant','thrust','totalMass','q','apoapsis','periapsis','energy','latitude','longitude','communication'];
 const escape=x=>'"'+String(x??'').replaceAll('"','""')+'"';
 download(new Blob([[keys.join(','),...samples.map(x=>keys.map(k=>escape(x[k])).join(','))].join('\r\n')],{type:'text/csv'}),'orrery-telemetry.csv');
}
export function missionReport(s) {
 const lines=['# '+s.name,'','UTC epoch: '+new Date((s.jd-2440587.5)*86400000).toISOString(),'','Physics: '+s.settings.integrator+' / '+s.settings.solver,'','Reference frame: SI, J2000 ecliptic inertial','',s.provenance.note??'','', '## Events','',...s.events.map(e=>'- JD '+e.jd.toFixed(8)+' · '+e.kind+': '+e.message),'','## Snapshot','',JSON.stringify({bodies:s.bodies.filter(b=>b.rocket||b.spacecraft),mission:s.mission},null,2)];
 download(new Blob([lines.join('\n')],{type:'text/markdown'}),'orrery-mission-report.md');
}
