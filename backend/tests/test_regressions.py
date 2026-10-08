import httpx
import pytest
from backend.tests.test_api import client, scenario
from backend.main import app, buckets

@pytest.mark.parametrize('view',[
    {'savedCameras':42}, {'keyframes':'broken'}, {'keyframes':[None]},
    {'trailHistory':{'earth':'broken'}},
    {'trailHistory':{'earth':[{'jd':2451545,'position':[1,2]}]}},
    {'trailHistory':{'earth':[{'jd':True,'position':[1,2,3]}]}},
])
def test_malformed_view_returns_validation_error_not_server_error(client,view):
    value=scenario();value['view']=view
    assert client.post('/api/scenarios',json=value).status_code==422

@pytest.mark.parametrize('ephemeris',[
    {'startJD':'bad','endJD':2451546,'tracks':{}},
    {'startJD':2451545,'endJD':2451546,'tracks':[]},
])
def test_malformed_ephemeris_is_422(client,ephemeris):
    value=scenario();value['ephemeris']=ephemeris
    assert client.post('/api/scenarios',json=value).status_code==422

def test_duplicate_maneuvers_are_rejected(client):
    value=scenario();node={'id':'duplicate','bodyId':'earth','jd':2451545,'deltaV':1,'direction':'vector','vector':[1,0,0],'executed':False}
    value['maneuvers']=[node,node]
    assert client.post('/api/scenarios',json=value).status_code==422
    node['id']=[]
    assert client.post('/api/scenarios',json=value).status_code==422

@pytest.mark.parametrize('payload',[
    [], {'result':None}, {'result':42},
    {'result':'$$SOE\n2451546, date, 1,2,3,4,5,6,\n$$EOE'},
    {'result':'$$SOE\nNaN, date, 1,2,3,4,5,6,\n$$EOE'},
    {'result':'$$SOE\n2451545,date,1,2\n$$EOE'},
])
def test_malformed_horizons_returns_502_and_does_not_cache(client,payload):
    async def get(url,params):
        return httpx.Response(200,request=httpx.Request('GET',url),json=payload)
    app.state.http.get=get
    assert client.get('/api/horizons?target=499&jd=2451545').status_code==502

def test_series_requires_actual_ordered_requested_epochs(client):
    async def get(url,params):
        return httpx.Response(200,request=httpx.Request('GET',url),json={
            'result':'$$SOE\n2451545, date, 1,2,3,4,5,6,\n2451545, date, 1,2,3,4,5,6,\n$$EOE'})
    app.state.http.get=get
    assert client.get('/api/horizons/series?target=499&jd=2451545&days=1&samples=2').status_code==502
    async def valid(url,params):
        return httpx.Response(200,request=httpx.Request('GET',url),json={
            'result':'$$SOE\n2451545, date, 1,2,3,4,5,6,\n2451546, date, 1,2,3,4,5,6,\n$$EOE'})
    app.state.http.get=valid
    result=client.get('/api/horizons/series?target=499&jd=2451545&days=1&samples=2')
    assert result.status_code==200
    assert result.json()['samples'][1]['jd']==2451546

def test_limit_errors_keep_cors_headers(client):
    origin={'Origin':'http://127.0.0.1:5173'}
    response=client.post('/api/scenarios',content=b'x'*(32*1024*1024+1),headers=origin)
    assert response.status_code==413
    assert response.headers['access-control-allow-origin']==origin['Origin']
    buckets.clear()
    for _ in range(120):
        client.get('/api/health')
    response=client.get('/api/health',headers=origin)
    assert response.status_code==429
    assert response.headers['access-control-allow-origin']==origin['Origin']
