import {fromJulianDate} from '../physics/units.js';
import {useUIStore} from '../store/useUIStore.js';
import {useSimStore} from '../store/useSimStore.js';
import {fmt} from './Fields.jsx';
export const stamp=jd=>fromJulianDate(jd).toISOString().replace('T',' ').slice(0,19)+' UTC';
export const metric=(x,unit='',factor=1)=>x==null?'Unknown':fmt(x/factor,4)+(unit?' '+unit:'');
export const go=panel=>{useUIStore.getState().workspace({right:true});useSimStore.getState().configureView({panel});};
export function ScienceTable({columns,rows}){return <div className="science-table-scroll"><table className="science-table"><thead><tr>{columns.map(x=><th key={x} scope="col">{x}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((v,k)=><td key={k}>{v}</td>)}</tr>)}</tbody></table></div>;}
