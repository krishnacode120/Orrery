import asyncio
import csv
import io
import json
import math
import time
from typing import Annotated
import httpx
from fastapi import APIRouter, HTTPException, Query, Request
from backend.db import connection

router = APIRouter(prefix='/api/horizons', tags=['horizons'])


def vector_rows(payload):
    if not isinstance(payload,dict) or payload.get('error'):
        raise ValueError('Invalid Horizons response')
    text=payload.get('result')
    if not isinstance(text,str) or '$$SOE' not in text or '$$EOE' not in text:
        raise ValueError('Horizons returned no state vectors')
    segment=text.split('$$SOE',1)[1].split('$$EOE',1)[0].strip()
    states=[]
    for row in csv.reader(io.StringIO(segment)):
        if not row or not any(x.strip() for x in row):
            continue
        if len(row)<8:
            raise ValueError('Incomplete vector')
        epoch=float(row[0].strip().replace('D','E'))
        values=[float(x.strip().replace('D','E'))*1000 for x in row[2:8]]
        if not math.isfinite(epoch) or not all(math.isfinite(x) for x in values):
            raise ValueError('Non-finite Horizons vector')
        states.append({'jd':epoch,'position':values[:3],'velocity':values[3:]})
    return states


def parse_vectors(payload, target, jd):
    states=vector_rows(payload)
    if len(states)!=1 or not math.isclose(states[0]['jd'],jd,rel_tol=0,abs_tol=5e-8):
        raise ValueError('Horizons returned the wrong epoch')
    signature=payload.get('signature',{})
    return {'target':target,**states[0],'timeScale':'UTC',
            'frame':'heliocentric J2000 ecliptic','units':'m, m/s',
            'source':'NASA/JPL Horizons','apiVersion':signature.get('version') if isinstance(signature,dict) else None}


@router.get('')
async def horizons(request: Request,
                   target: Annotated[str, Query(pattern=r'^-?[0-9]{1,8}$')],
                   jd: Annotated[float, Query(ge=2378496.5, lt=2470172.5)]):
    if not math.isfinite(jd):
        raise HTTPException(422, 'Julian date must be finite')
    key = f'{target}:{jd:.9f}:ecliptic:utc:v2'
    with connection() as db:
        row = db.execute('SELECT payload FROM horizons_cache WHERE key=? AND expires_at>?', (key, time.time())).fetchone()
    if row:
        return {**json.loads(row['payload']), 'cached': True}
    parameters = {'format': 'json', 'COMMAND': f"'{target}'", 'OBJ_DATA': "'NO'",
                  'MAKE_EPHEM': "'YES'", 'EPHEM_TYPE': "'VECTORS'", 'CENTER': "'500@10'",
                  'TLIST': f"'{jd:.9f}'", 'TLIST_TYPE': "'JD'", 'TIME_TYPE': "'UT'",
                  'REF_PLANE': "'ECLIPTIC'", 'REF_SYSTEM': "'ICRF'", 'OUT_UNITS': "'KM-S'",
                  'VEC_TABLE': "'2'", 'VEC_CORR': "'NONE'", 'CSV_FORMAT': "'YES'"}
    try:
        # Limit concurrent upstream work. Never accept a user-controlled URL.
        async with asyncio.timeout(25):
            async with request.app.state.horizons_slots:
                response = await request.app.state.http.get('https://ssd.jpl.nasa.gov/api/horizons.api', params=parameters)
                response.raise_for_status()
                result = parse_vectors(response.json(), target, jd)
    except (TimeoutError, httpx.TimeoutException) as error:
        raise HTTPException(504, 'Horizons timed out; try again') from error
    except (httpx.HTTPError, ValueError, IndexError, StopIteration, csv.Error) as error:
        raise HTTPException(502, 'Horizons could not supply a valid vector for this target/date') from error
    with connection() as db:
        db.execute('DELETE FROM horizons_cache WHERE expires_at<?', (time.time(),))
        db.execute('INSERT OR REPLACE INTO horizons_cache VALUES (?,?,?)',
                   (key, json.dumps(result), time.time()+7*86400))
    return {**result, 'cached': False}


@router.get('/series')
async def series(request: Request,
                 target: Annotated[str, Query(pattern=r'^-?[0-9]{1,8}$')],
                 jd: Annotated[float, Query(ge=2378496.5, lt=2470172.5)],
                 days: Annotated[float, Query(gt=0, le=32)] = 1,
                 samples: Annotated[int, Query(ge=2, le=129)] = 33):
    if not math.isfinite(jd+days) or jd+days >= 2470172.5:
        raise HTTPException(422, 'Coverage must stay within 1800–2050')
    key = f'series:{target}:{jd:.9f}:{days}:{samples}:utc:v2'
    with connection() as db:
        row = db.execute('SELECT payload FROM horizons_cache WHERE key=? AND expires_at>?', (key, time.time())).fetchone()
    if row:
        return {**json.loads(row['payload']), 'cached': True}
    epochs = [jd+days*i/(samples-1) for i in range(samples)]
    parameters = {'format': 'json', 'COMMAND': f"'{target}'", 'OBJ_DATA': "'NO'",
                  'MAKE_EPHEM': "'YES'", 'EPHEM_TYPE': "'VECTORS'", 'CENTER': "'500@10'",
                  'TLIST': "'"+','.join(f'{x:.9f}' for x in epochs)+"'", 'TLIST_TYPE': "'JD'", 'TIME_TYPE': "'UT'",
                  'REF_PLANE': "'ECLIPTIC'", 'REF_SYSTEM': "'ICRF'", 'OUT_UNITS': "'KM-S'",
                  'VEC_TABLE': "'2'", 'VEC_CORR': "'NONE'", 'CSV_FORMAT': "'YES'"}
    try:
        async with asyncio.timeout(25):
            async with request.app.state.horizons_slots:
                response = await request.app.state.http.get('https://ssd.jpl.nasa.gov/api/horizons.api', params=parameters)
                response.raise_for_status()
                payload = response.json()
                states=vector_rows(payload)
                if len(states)!=samples or any(not math.isclose(state['jd'],epoch,rel_tol=0,abs_tol=5e-8) for state,epoch in zip(states,epochs)):
                    raise ValueError('Incomplete or mismatched ephemeris')
                result = {'target': target, 'samples': states, 'timeScale': 'UTC', 'frame': 'heliocentric J2000 ecliptic', 'units': 'm, m/s'}
    except (TimeoutError, httpx.TimeoutException) as error:
        raise HTTPException(504, 'Horizons timed out') from error
    except (httpx.HTTPError, ValueError, KeyError, IndexError, csv.Error) as error:
        raise HTTPException(502, 'Horizons could not supply this playback interval') from error
    with connection() as db:
        db.execute('INSERT OR REPLACE INTO horizons_cache VALUES (?,?,?)', (key, json.dumps(result), time.time()+7*86400))
    return {**result, 'cached': False}
