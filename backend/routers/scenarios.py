import hashlib
import json
import secrets
import time
from typing import Annotated
from fastapi import APIRouter, Header, HTTPException, Query, Response
from backend.db import connection
from backend.models import Scenario

router = APIRouter(prefix='/api/scenarios', tags=['scenarios'])
EditKey = Annotated[str, Header(alias='X-Edit-Key', min_length=20, max_length=100)]


def digest(key):
    return hashlib.sha256(key.encode()).hexdigest()


def existing(db, scenario_id):
    row = db.execute('SELECT * FROM scenarios WHERE id=?', (scenario_id,)).fetchone()
    if row is None:
        raise HTTPException(404, 'Scenario not found')
    return row


def authorize(row, key):
    if not secrets.compare_digest(row['edit_hash'], digest(key)):
        raise HTTPException(403, 'Invalid edit key')


@router.get('')
def list_scenarios(edit_key: EditKey, limit: int = Query(20, ge=1, le=100), q: str = Query('', max_length=120), tag: str = Query('', max_length=40)):
    with connection() as db:
        rows = db.execute('SELECT id,name,updated_at,payload FROM scenarios WHERE edit_hash=? ORDER BY updated_at DESC LIMIT ?',
                          (digest(edit_key), limit)).fetchall()
    result=[]
    for row in rows:
        payload=json.loads(row['payload'])
        if q.lower() not in row['name'].lower() or (tag and tag not in payload.get('tags', [])):
            continue
        result.append({'id':row['id'],'name':row['name'],'updated_at':row['updated_at'],
                       'tags':payload.get('tags', []),'description':payload.get('description', '')})
    return result


@router.post('', status_code=201)
def create(scenario: Scenario):
    scenario_id, key = secrets.token_urlsafe(9), secrets.token_urlsafe(32)
    with connection() as db:
        db.execute('INSERT INTO scenarios VALUES (?,?,?,?,?)',
                   (scenario_id, scenario.name, scenario.model_dump_json(exclude_unset=True), digest(key), time.time()))
    return {'id': scenario_id, 'editKey': key, 'url': f'/s/{scenario_id}'}


@router.get('/{scenario_id}')
def read(scenario_id: str):
    with connection() as db:
        row = existing(db, scenario_id)
    return json.loads(row['payload'])


@router.put('/{scenario_id}')
def update(scenario_id: str, scenario: Scenario, edit_key: EditKey):
    with connection() as db:
        authorize(existing(db, scenario_id), edit_key)
        db.execute('UPDATE scenarios SET name=?,payload=?,updated_at=? WHERE id=?',
                   (scenario.name, scenario.model_dump_json(exclude_unset=True), time.time(), scenario_id))
    return {'id': scenario_id}


@router.delete('/{scenario_id}', status_code=204)
def delete(scenario_id: str, edit_key: EditKey):
    with connection() as db:
        authorize(existing(db, scenario_id), edit_key)
        db.execute('DELETE FROM scenarios WHERE id=?', (scenario_id,))
    return Response(status_code=204)
