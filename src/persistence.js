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
 const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('scenarios',value?'readwrite':'readonly'),store=tx.objectStore('scenarios');let record=value;if(value){record={baseline:validateScenario(value.baseline),experiment:validateScenario(value.experiment),original:validateScenario(value.original)};if(JSON.stringify(record).length>64*1024*1024)throw new Error('Experiment session exceeds 64 MiB');}const request=value?store.put(record,'whatif-session'):store.get('whatif-session');tx.oncomplete=()=>resolve(value?undefined:request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Experiment persistence aborted'));});}finally{db.close();}
}

export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { ...options,
    headers: { 'Content-Type':'application/json', ...options.headers }, signal: AbortSignal.timeout(30000) });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : `Request failed (${response.status})`);
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
 const db=await database();
 try{return await new Promise((resolve,reject)=>{
 const tx=db.transaction('scenarios',action==='list'?'readonly':'readwrite'),store=tx.objectStore('scenarios');let request;
 if(action==='save')request=store.put({id:id??crypto.randomUUID(),updatedAt:new Date().toISOString(),scenario:validateScenario(value)},'saved:'+(id??value.name));
 else if(action==='delete')request=store.delete(id);
 else request=store.getAll();
 tx.oncomplete=()=>resolve(action==='list'?request.result.filter(x=>x?.scenario).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)):request.result);
 tx.onerror=()=>reject(tx.error);
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
