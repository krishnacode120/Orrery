import {download} from './persistence.js';
let recorder=null,stream=null,canvas=null,timer=null;
export function captureScreenshot() {
 const source=document.querySelector('#orrery-viewport canvas')??document.querySelector('canvas');
 if(!source)throw new Error('Renderer is unavailable');
 source.toBlob(blob=>{if(blob)download(blob,'orrery-viewport.png');},'image/png');
}
export function startRecording({fps=30,resolution=1080,onStop=()=>{}}={}) {
 if(recorder)throw new Error('Recording already active');
 const source=document.querySelector('canvas');
 if(!source?.captureStream||typeof MediaRecorder==='undefined')throw new Error('WebM capture is unavailable in this browser');
 canvas=document.createElement('canvas');canvas.height=resolution;canvas.width=Math.round(resolution*source.width/source.height);
 const ctx=canvas.getContext('2d');timer=setInterval(()=>ctx.drawImage(source,0,0,canvas.width,canvas.height),1000/fps);
 stream=canvas.captureStream(fps);const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
 if(!mime){clearInterval(timer);stream.getTracks().forEach(t=>t.stop());throw new Error('WebM encoding unavailable');}
 const chunks=[];recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000});
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 recorder.onstop=()=>{download(new Blob(chunks,{type:mime}),'orrery-recording.webm');clearInterval(timer);stream.getTracks().forEach(t=>t.stop());recorder=null;canvas=null;onStop();};
 recorder.start(1000);
}
export function stopRecording(){if(recorder&&recorder.state!=='inactive')recorder.stop();}
export function saveViewpoint(){window.dispatchEvent(new CustomEvent('orrery-camera',{detail:{type:'snapshot'}}));}
export function restoreViewpoint(pose){window.dispatchEvent(new CustomEvent('orrery-camera',{detail:{type:'restore',pose}}));}
