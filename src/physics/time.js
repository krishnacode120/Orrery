import {DAY,julianDate} from './units.js';
// Effective UTC dates and TAI−UTC seconds. Dates before 1972 are intentionally unsupported.
export const LEAP_SECONDS=[['1972-01-01',10],['1972-07-01',11],['1973-01-01',12],['1974-01-01',13],['1975-01-01',14],['1976-01-01',15],['1977-01-01',16],['1978-01-01',17],['1979-01-01',18],['1980-01-01',19],['1981-07-01',20],['1982-07-01',21],['1983-07-01',22],['1985-07-01',23],['1988-01-01',24],['1990-01-01',25],['1991-01-01',26],['1992-07-01',27],['1993-07-01',28],['1994-07-01',29],['1996-01-01',30],['1997-07-01',31],['1999-01-01',32],['2006-01-01',33],['2009-01-01',34],['2012-07-01',35],['2015-07-01',36],['2017-01-01',37]].map(([date,offset])=>({jd:julianDate(date+'T00:00:00Z'),offset}));
export function timeScales(utcJD,epochJD=utcJD){
 if(!Number.isFinite(utcJD)||utcJD<LEAP_SECONDS[0].jd)throw new Error('Explicit UTC/TT conversion supports dates from 1972');
 const leap=LEAP_SECONDS.findLast(x=>utcJD>=x.jd),ttJD=utcJD+(leap.offset+32.184)/DAY;
 const g=(357.53+.9856003*(ttJD-2451545))*Math.PI/180;
 const tdbJD=ttJD+(.001657*Math.sin(g)+.000022*Math.sin(2*g))/DAY;
 return {utcJD,ttJD,tdbJD,met:(utcJD-epochJD)*DAY,taiMinusUtc:leap.offset,
  model:'UTC-derived TT; low-order periodic TDB approximation. Future leap seconds use the last known offset.'};
}
