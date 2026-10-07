import json
from pathlib import Path
import httpx
from backend.main import app
from backend.tests.test_api import client, scenario

def test_version_migration_metadata_camera_and_telemetry(client):
    old=scenario()
    migrated=client.post('/api/migrate',json=old)
    assert migrated.status_code==200
    assert migrated.json()['version']==2
    value=migrated.json()
    value.update(tags=['mission'],description='Validation mission',view={'savedCameras':[]},
                 telemetry=[{'jd':2451545,'bodyId':'vehicle','altitude':1234,'speed':7654}])
    created=client.post('/api/scenarios',json=value).json()
    path='/api/scenarios/'+created['id']
    headers={'X-Edit-Key':created['editKey']}
    assert client.patch(path+'/metadata',json={'name':'Telemetry flight','tags':['orbit'],'description':'Test'}).status_code==422
    assert client.patch(path+'/metadata',json={'name':'Telemetry flight','tags':['orbit'],'description':'Test'},headers=headers).status_code==200
    assert client.get('/api/scenarios?q=Telemetry&tag=orbit',headers=headers).json()[0]['id']==created['id']
    camera={'name':'Earth','position':[0,3,10],'target':[0,0,0],'scale':'earth'}
    assert client.put(path+'/cameras',json=[camera],headers=headers).status_code==200
    assert client.get(path+'/cameras').json()==[camera]
    assert '1234' in client.get(path+'/telemetry?format=csv').text
    assert client.get(path+'/telemetry').json()[0]['speed']==7654

def test_catalog_and_frontend_scenario_contracts(client):
    assert len(client.get('/api/presets').json())>=24
    assert client.get('/api/missions').status_code==200
    assert len(client.get('/api/satellite-presets').json())>=7
    fixture=Path(__file__).with_name('scenarios.json')
    for value in json.loads(fixture.read_text(encoding='utf-8')):
        response=client.post('/api/scenarios',json=value)
        assert response.status_code==201,response.text
        assert client.get('/api/scenarios/'+response.json()['id']).json()==value

def test_horizons_series_cache_and_incomplete_result(client):
    calls=[]
    async def get(url,params):
        calls.append(params)
        return httpx.Response(200,request=httpx.Request('GET',url),json={'result':'$$SOE\n2451545, date, 1,2,3,4,5,6,\n2451546, date, 7,8,9,10,11,12,\n$$EOE'})
    app.state.http.get=get
    url='/api/horizons/series?target=499&jd=2451545&days=1&samples=2'
    result=client.get(url)
    assert result.status_code==200,result.text
    assert result.json()['samples'][1]['position']==[7000,8000,9000]
    assert client.get(url).json()['cached'] is True
    assert len(calls)==1
    assert client.get(url.replace('samples=2','samples=3')).status_code==502
    assert client.get(url.replace('days=1','days=40')).status_code==422

def test_expanded_settings_reject_invalid_values(client):
    s=scenario()
    for patch in [{'theta':2},{'integrator':'fake'},{'fragmentCount':500},{'minStep':99999},{'c':-1}]:
        value={**s,'settings':{**s['settings'],**patch}}
        assert client.post('/api/scenarios',json=value).status_code==422
