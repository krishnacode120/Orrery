import csv
import io
import json
import time
from typing import Annotated
from fastapi import APIRouter, HTTPException, Header, Response
from pydantic import BaseModel, Field, ConfigDict, ValidationError
from backend.db import connection
from backend.routers.scenarios import existing, authorize
from backend.models import Scenario

router = APIRouter(prefix='/api', tags=['mission'])
EditKey = Annotated[str, Header(alias='X-Edit-Key', min_length=20, max_length=100)]

class Metadata(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default='', max_length=4000)
    tags: list[Annotated[str, Field(max_length=40)]] = Field(default_factory=list, max_length=20)

@router.patch('/scenarios/{scenario_id}/metadata')
def metadata(scenario_id: str, value: Metadata, edit_key: EditKey):
    with connection() as db:
        row = existing(db, scenario_id)
        authorize(row, edit_key)
        payload = json.loads(row['payload'])
        payload.update(value.model_dump())
        try:
            validated = Scenario.model_validate(payload)
        except ValidationError as error:
            raise HTTPException(422, 'Invalid scenario metadata') from error
        db.execute('UPDATE scenarios SET name=?,payload=?,updated_at=? WHERE id=?',
                   (value.name, validated.model_dump_json(exclude_unset=True), time.time(), scenario_id))
    return value

@router.get('/scenarios/{scenario_id}/cameras')
def cameras(scenario_id: str):
    with connection() as db:
        payload = json.loads(existing(db, scenario_id)['payload'])
    return payload.get('view', {}).get('savedCameras', [])

@router.put('/scenarios/{scenario_id}/cameras')
def save_cameras(scenario_id: str, cameras: list[dict], edit_key: EditKey):
    if len(cameras) > 100:
        raise HTTPException(422, 'At most 100 viewpoints')
    with connection() as db:
        row = existing(db, scenario_id)
        authorize(row, edit_key)
        payload = json.loads(row['payload'])
        payload.setdefault('view', {})['savedCameras'] = cameras
        try:
            validated = Scenario.model_validate(payload)
        except ValidationError as error:
            raise HTTPException(422, 'Invalid camera states') from error
        db.execute('UPDATE scenarios SET payload=?,updated_at=? WHERE id=?',
                   (validated.model_dump_json(exclude_unset=True), time.time(), scenario_id))
    return {'count': len(cameras)}

@router.get('/scenarios/{scenario_id}/telemetry')
def telemetry(scenario_id: str, format: str = 'json'):
    with connection() as db:
        payload = json.loads(existing(db, scenario_id)['payload'])
    rows = payload.get('telemetry', [])
    if format == 'json':
        return rows
    if format != 'csv':
        raise HTTPException(422, 'format must be json or csv')
    fields = ['jd', 'bodyId', 'met', 'altitude', 'speed', 'acceleration', 'propellant',
              'q', 'apoapsis', 'periapsis', 'energy', 'communication']
    stream = io.StringIO()
    writer = csv.DictWriter(stream, fieldnames=fields, extrasaction='ignore')
    writer.writeheader()
    writer.writerows(rows)
    return Response(stream.getvalue(), media_type='text/csv',
                    headers={'Content-Disposition': 'attachment; filename="telemetry.csv"'})

@router.get('/missions')
def missions():
    return [{'id': 'earth-mars-reference', 'name': 'Earth → Mars Reference Mission', 'version': 1,
             'launchUTC': '2031-01-01T00:00:00Z', 'model': 'JPL approximate initialization, full N-body execution, fuel-aware impulse transfer',
             'validation': 'NOT RUN: run the local scientific workbench to produce measured certification'},
            {'id': 'rocket', 'name': 'Two-stage launch', 'model': 'point translation, layered dry atmosphere approximation, feedback guidance',
             'targetAltitude': 200000, 'stageCount': 2},
            {'id': 'constellation', 'name': '24 satellite constellation', 'planes': 6, 'altitude': 20200000}]

@router.get('/spacecraft-presets')
def spacecraft():
    return [{'id': 'generic', 'name': 'Generic 800 kg spacecraft', 'mass': 800, 'range': 40000000,
             'capacityWh': 1000, 'solarWatts': 600, 'loadWatts': 220}]

@router.get('/satellite-presets')
def satellites():
    return [{'id': key, 'altitude': altitude, 'inclination': inc, 'eccentricity': e}
            for key, altitude, inc, e in [('leo', 400000, 51.6, 0), ('meo', 20200000, 55, 0),
            ('geo', 35786000, 0, 0), ('polar', 600000, 90, 0), ('sso', 700000, 98, 0),
            ('elliptical', 12000000, 45, .35), ('molniya', 20229000, 63.4, .74)]]

@router.post('/migrate')
def migrate(scenario: Scenario):
    result = scenario.model_dump()
    result['version'] = 2
    return result
