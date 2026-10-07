import {useState,useRef,useEffect} from 'react';
import {Field} from './styles.js';
import {UNITS} from '../physics/units.js';
export const fmt=(x,d=3)=>x==null||!Number.isFinite(x)?'—':Math.abs(x)>=1e7||Math.abs(x)>0&&Math.abs(x)<.001?x.toExponential(d):x.toLocaleString(undefined,{maximumFractionDigits:d});
export function NumberField({label,value,commit,disabled=false,title,unit='',units}) {
 const [draft,setDraft]=useState(String(value??0)),[localUnit,setLocalUnit]=useState(unit),focus=useRef(false),dirty=useRef(false);
 useEffect(()=>setLocalUnit(unit),[unit]);const factor=UNITS[localUnit]??1;
 useEffect(()=>{if(!focus.current)setDraft(Number.isFinite(value)?String(Number((value/factor).toPrecision(10))):'');},[value,factor]);
 return <Field title={title??label}>{label}<span className="row"><input aria-label={label} type="number" step="any" value={draft} disabled={disabled}
 onFocus={()=>{focus.current=true;dirty.current=false;}} onChange={e=>{dirty.current=true;setDraft(e.target.value);}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}
 onBlur={()=>{focus.current=false;if(dirty.current&&draft.trim()&&Number.isFinite(+draft)&&+draft*factor!==value)commit(+draft*factor);dirty.current=false;setDraft(Number.isFinite(value)?String(Number((value/factor).toPrecision(10))):'');}}/>
 {units?<select className="unit" aria-label={label+' unit'} value={localUnit} onChange={e=>setLocalUnit(e.target.value)}>{units.map(x=><option key={x}>{x}</option>)}</select>:unit&&<small>{unit}</small>}</span></Field>;
}
export function Toggle({label,value,commit,title,disabled=false}){return <label className="row" title={title??label} style={{fontSize:11}}><input type="checkbox" disabled={disabled} checked={!!value} onChange={e=>commit(e.target.checked)}/>{label}</label>;}
export function Select({label,value,options,commit,disabled=false}){return <Field>{label}<select aria-label={label} disabled={disabled} value={value} onChange={e=>commit(e.target.value)}>{options.map(x=><option key={Array.isArray(x)?x[0]:x} value={Array.isArray(x)?x[0]:x}>{Array.isArray(x)?x[1]:x}</option>)}</select></Field>;}
export function VectorField({label,value,commit,unit='m',disabled=false}){const options=unit===''||unit==='m/s²'?null:unit.includes('/s')?['m/s','km/s']:['m','km','AU'];return <div className="stack"><small>{label}</small><div className="triple">{['X','Y','Z'].map((axis,k)=><NumberField key={axis} label={label+' '+axis} value={value[k]} unit={unit} units={options} disabled={disabled} commit={x=>commit(value.map((v,i)=>i===k?x:v))}/>)}</div></div>;}
export function Readouts({values}){return <dl>{values.map(([label,value])=><span key={label} style={{display:'contents'}}><dt>{label}</dt><dd>{value}</dd></span>)}</dl>;}
