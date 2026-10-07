import json
import time
from pathlib import Path
from fastapi import APIRouter
router = APIRouter(prefix='/api/presets', tags=['presets'])
@router.get('')
def presets():
    entries=json.loads((Path(__file__).resolve().parents[1] / 'preset_catalog.json').read_text(encoding='utf-8'))
    for entry in entries:
        if entry['id']=='solar-now': entry['generator']='jpl-table-1'
        if entry['id']=='empty': entry['scenario']={'version':1,'name':'Empty sandbox','mode':'sandbox','jd':time.time()/86400+2440587.5,'bodies':[], 'settings':{'gMultiplier':1,'softening':1000,'stepSeconds':1800,'timeScale':86400}}
    return entries
