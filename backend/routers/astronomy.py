"""Read-only, bounded offline astronomy snapshot; never creates gravity sources."""
import json
from pathlib import Path
from functools import lru_cache
from fastapi import APIRouter, Query, HTTPException
router=APIRouter(prefix='/api/astronomy',tags=['astronomy'])
ROOT=Path(__file__).resolve().parents[2]/'src'/'astronomy'/'data'
@lru_cache(maxsize=1)
def dataset():
    return {name:json.loads((ROOT/(name+'.json')).read_text(encoding='utf-8')) for name in ('stars','exoplanets','metadata')}
@router.get('/metadata')
def metadata():
    data=dataset()
    return {**data['metadata'],'starCount':len(data['stars']),'planetCount':len(data['exoplanets']),'systemCount':len({p['hostname'] for p in data['exoplanets']})}
@router.get('/catalog')
def catalog(q:str=Query(default='',max_length=120),kind:str=Query(default='all',pattern='^(all|star|exoplanet)$'),limit:int=Query(default=40,ge=1,le=100)):
    data=dataset();needle=q.casefold();items=[]
    if kind in ('all','star'):
        items.extend({'id':s['id'],'name':s['name'],'type':'star','distancePc':s['distancePc'],'spectralType':s['spectralType'],'source':s['source'],'status':s['status']} for s in data['stars'] if needle in ' '.join([s['name'],*s['aliases']]).casefold())
    if kind in ('all','exoplanet'):
        items.extend({'id':'planet:'+p['pl_name'],'name':p['pl_name'],'type':'exoplanet','host':p['hostname'],'distancePc':p['sy_dist'],'source':'NASA Exoplanet Archive pscomppars'} for p in data['exoplanets'] if needle in (p['pl_name']+' '+p['hostname']).casefold())
    return {'items':items[:limit],'matched':len(items),'limit':limit,'catalogOnly':True}
@router.get('/systems')
def systems():
    groups={}
    for p in dataset()['exoplanets']:
        groups.setdefault(p['hostname'],[]).append(p)
    return {'systems':[{'name':name,'planets':planets,'source':'NASA Exoplanet Archive pscomppars','geometry':'Orbit orientation/phase unavailable; editable copies configure illustrative geometry'} for name,planets in groups.items()]}
@router.get('/stars/{star_id}')
def star(star_id:str):
    result=next((s for s in dataset()['stars'] if s['id']==star_id),None)
    if not result:
        raise HTTPException(404,'Catalog star not found')
    return result
