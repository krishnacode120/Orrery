"""Versioned mission definitions, kept separate from scenario snapshots."""
import json
import math
import secrets
import time
from typing import Any, Literal
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, model_validator
from backend.db import connection
from backend.routers.scenarios import EditKey, authorize, digest

router = APIRouter(prefix='/api/mission-definitions', tags=['mission definitions'])

class MissionDefinition(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    version: Literal[1] = 1
    name: str = Field(min_length=1, max_length=120)
    target: str = Field(default='mars', min_length=1, max_length=80)
    definition: dict[str, Any]

    @model_validator(mode='after')
    def bounded(self):
        def inspect(value, depth=0):
            if depth > 12:
                raise ValueError('Mission definition nesting exceeds 12 levels')
            if isinstance(value, float) and not math.isfinite(value):
                raise ValueError('Mission values must be finite')
            if isinstance(value, dict):
                for child in value.values():
                    inspect(child, depth+1)
            if isinstance(value, list):
                for child in value:
                    inspect(child, depth+1)
        inspect(self.definition)
        if len(json.dumps(self.definition, allow_nan=False).encode()) > 65536:
            raise ValueError('Mission definition exceeds 64 KiB')
        return self

def find(db, mission_id):
    row = db.execute('SELECT * FROM mission_definitions WHERE id=?', (mission_id,)).fetchone()
    if row is None:
        raise HTTPException(404, 'Mission definition not found')
    return row

@router.post('', status_code=201)
def create(value: MissionDefinition):
    mission_id, key = secrets.token_urlsafe(9), secrets.token_urlsafe(32)
    with connection() as db:
        db.execute('INSERT INTO mission_definitions VALUES (?,?,?,?,?)',
                   (mission_id, value.name, value.model_dump_json(), digest(key), time.time()))
    return {'id': mission_id, 'editKey': key}

@router.get('')
def listing(edit_key: EditKey, q: str = Query('', max_length=120), limit: int = Query(20, ge=1, le=100)):
    with connection() as db:
        rows = db.execute('SELECT id,name,updated_at FROM mission_definitions WHERE edit_hash=? ORDER BY updated_at DESC LIMIT ?',
                          (digest(edit_key), limit)).fetchall()
    return [dict(row) for row in rows if q.lower() in row['name'].lower()]

@router.get('/{mission_id}')
def read(mission_id: str):
    with connection() as db:
        row = find(db, mission_id)
    return json.loads(row['payload'])

@router.put('/{mission_id}')
def update(mission_id: str, value: MissionDefinition, edit_key: EditKey):
    with connection() as db:
        authorize(find(db, mission_id), edit_key)
        db.execute('UPDATE mission_definitions SET name=?,payload=?,updated_at=? WHERE id=?',
                   (value.name, value.model_dump_json(), time.time(), mission_id))
    return {'id': mission_id}

@router.delete('/{mission_id}', status_code=204)
def delete(mission_id: str, edit_key: EditKey):
    with connection() as db:
        authorize(find(db, mission_id), edit_key)
        db.execute('DELETE FROM mission_definitions WHERE id=?', (mission_id,))
