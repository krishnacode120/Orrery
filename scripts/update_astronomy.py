"""Refresh a bounded, attributed offline catalog. No runtime catalog/network dependency."""
from pathlib import Path
from datetime import datetime, timezone
import csv, io, json, math, hashlib
import httpx

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'src'/'astronomy'/'data'
HYG='https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv'
TAP='https://exoplanetarchive.ipac.caltech.edu/TAP/sync'
HOSTS=['Proxima Cen','TRAPPIST-1','Kepler-186','Kepler-452','TOI-700']
def number(value):
    try:
        result=float(value)
        return result if math.isfinite(result) else None
    except (ValueError,TypeError):
        return None
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    with httpx.Client(timeout=90,follow_redirects=True) as client:
        response=client.get(HYG);response.raise_for_status()
        rows=list(csv.DictReader(io.StringIO(response.text)))
        retained=[r for r in rows if number(r['dist']) is not None and 0<=float(r['dist'])<=30]
        aliases={'Gl 551':'Proxima Centauri','Gl 699':"Barnard's Star",'Gl 406':'Wolf 359','Gl 411':'Lalande 21185','Gl 559A':'Alpha Centauri A','Gl 559B':'Alpha Centauri B','Gl 244A':'Sirius A','Gl 244B':'Sirius B','Gl 144':'Epsilon Eridani','Gl 71':'Tau Ceti','Gl 280A':'Procyon A','Gl 280B':'Procyon B'}
        stars=[]
        for r in retained:
            name='Sun' if r['id']=='0' else aliases.get(r['gl']) or r['proper'] or r['gl'] or ('HIP '+r['hip'] if r['hip'] else 'HYG '+r['id'])
            stars.append({'id':'hyg-'+r['id'],'name':name,'aliases':[r['proper'],r['gl'],r['bf']],'distancePc':number(r['dist']),'raDeg':number(r['ra'])*15,'decDeg':number(r['dec']),'spectralType':r['spect'] or None,'apparentMagnitude':number(r['mag']),'absoluteMagnitude':number(r['absmag']),'luminositySolar':number(r['lum']),'colorIndex':number(r['ci']),'positionEquatorialPc':[0,0,0] if r['id']=='0' else [number(r[k]) for k in ['x','y','z']],'source':'HYG v4.1','status':'Catalog value'})
        columns='pl_name,hostname,ra,dec,sy_dist,st_mass,st_rad,st_teff,st_lum,st_spectype,pl_orbper,pl_orbsmax,pl_rade,pl_bmasse,pl_bmassprov,pl_orbeccen,pl_eqt,pl_orbincl,discoverymethod,disc_year,pl_radeerr1,pl_radeerr2,pl_bmasseerr1,pl_bmasseerr2'
        query="select "+columns+" from pscomppars where hostname in ("+','.join("'"+h+"'" for h in HOSTS)+") order by hostname,pl_orbper"
        response=client.get(TAP,params={'query':query,'format':'json'});response.raise_for_status()
        planets=response.json()
        if not isinstance(planets,list) or not planets:
            raise ValueError('NASA archive returned no planets')
    metadata={'retrievedAt':datetime.now(timezone.utc).isoformat(),'frame':'J2000 equatorial; application rotates into J2000 ecliptic','hygUrl':HYG,'hygLicense':'CC BY-SA 4.0','archiveUrl':TAP,'archiveTable':'pscomppars','archiveQuery':query,'notice':'Composite parameters may combine different publications; missing values are null. Snapshot, not a live discovery feed.'}
    for name,value in [('stars.json',stars),('exoplanets.json',planets),('metadata.json',metadata)]:
        (OUT/name).write_text(json.dumps(value,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    print(f'Bundled {len(stars)} stars and {len(planets)} exoplanets from {len(set(p["hostname"] for p in planets))} systems')
    for expected in ['Proxima Centauri','Alpha Centauri A','Alpha Centauri B',"Barnard's Star",'Sirius A','Sirius B','Wolf 359','Lalande 21185']:
        print(expected,[(s['id'],s['aliases']) for s in stars if s['name']==expected])
if __name__=='__main__':
    main()
