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


def parse_vectors(payload, target, jd):
    text = payload.get('result', '')
    if payload.get('error') or '$$SOE' not in text or '$$EOE' not in text:
        raise ValueError('Horizons returned no state vector for this target/date')
    segment = text.split('$$SOE', 1)[1].split('$$EOE', 1)[0].strip()
    row = next(csv.reader(io.StringIO(segment)))
    # VEC_TABLE=2: JD, calendar date, X, Y, Z, VX, VY, VZ, trailing comma.
    values = [float(x.strip().replace('D', 'E')) * 1000 for x in row[2:8]]
    if len(values) != 6 or not all(math.isfinite(x) for x in values):
        raise ValueError('Invalid Horizons state vector')
    return {'target': target, 'jd': jd, 'timeScale': 'UTC',
            'frame': 'heliocentric J2000 ecliptic', 'units': 'm, m/s',
            'position': values[:3], 'velocity': values[3:],
            'source': 'NASA/JPL Horizons', 'apiVersion': payload.get('signature', {}).get('version')}


@router.get('')
async def horizons(request: Request,
                   target: Annotated[str, Query(pattern=r'^-?[0-9]{1,8}$')],
                   jd: Annotated[float, Query(ge=2378496.5, lt=2470172.5)]):
    if not math.isfinite(jd):
        raise HTTPException(422, 'Julian date must be finite')
    key = f'{target}:{jd:.9f}:ecliptic:utc:v1'
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
    except (httpx.HTTPError, ValueError, IndexError, StopIteration) as error:
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
    key = f'series:{target}:{jd:.9f}:{days}:{samples}:utc:v1'
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
                segment = payload['result'].split('$$SOE', 1)[1].split('$$EOE', 1)[0].strip()
                states = []
                for row in csv.reader(io.StringIO(segment)):
                    if not row:
                        continue
                    values = [float(x.strip().replace('D', 'E'))*1000 for x in row[2:8]]
                    if len(values) != 6 or not all(math.isfinite(x) for x in values):
                        raise ValueError('Invalid vector')
                    states.append({'jd': float(row[0]), 'position': values[:3], 'velocity': values[3:]})
                if len(states) != samples:
                    raise ValueError('Incomplete ephemeris')
                result = {'target': target, 'samples': states, 'timeScale': 'UTC', 'frame': 'heliocentric J2000 ecliptic', 'units': 'm, m/s'}
    except (TimeoutError, httpx.TimeoutException) as error:
        raise HTTPException(504, 'Horizons timed out') from error
    except (httpx.HTTPError, ValueError, KeyError, IndexError) as error:
        raise HTTPException(502, 'Horizons could not supply this playback interval') from error
    with connection() as db:
        db.execute('INSERT OR REPLACE INTO horizons_cache VALUES (?,?,?)', (key, json.dumps(result), time.time()+7*86400))
    return {**result, 'cached': False}
