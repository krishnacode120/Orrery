import httpx
import pytest
from fastapi.testclient import TestClient
from backend.main import app, buckets


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv('ORRERY_DB', str(tmp_path / 'test.sqlite3'))
    buckets.clear()
    with TestClient(app) as session:
        yield session


def scenario():
    return {'version': 1, 'name': 'Test', 'mode': 'sandbox', 'jd': 2451545,
            'bodies': [], 'settings': {'gMultiplier': 1, 'softening': 1000,
                                      'stepSeconds': 1800, 'timeScale': 86400}}


def test_crud_and_edit_capability(client):
    value = scenario()
    created = client.post('/api/scenarios', json=value)
    assert created.status_code == 201
    data = created.json()
    url = f"/api/scenarios/{data['id']}"
    assert client.get(url).json() == value
    assert client.put(url, json=value).status_code == 422
    assert client.delete(url, headers={'X-Edit-Key': 'x'*30}).status_code == 403
    headers = {'X-Edit-Key': data['editKey']}
    value['name'] = 'Edited'
    assert client.put(url, json=value, headers=headers).status_code == 200
    assert client.get(url).json() == value
    assert client.get('/api/scenarios', headers=headers).json()[0]['name'] == 'Edited'
    assert client.delete(url, headers=headers).status_code == 204
    assert client.get(url).status_code == 404


def test_invalid_inputs(client):
    value = scenario()
    value['settings']['softening'] = -1
    assert client.post('/api/scenarios', json=value).status_code == 422
    assert client.get('/api/horizons?target=http://example.com&jd=2451545').status_code == 422
    assert client.get('/api/horizons?target=499&jd=9999999').status_code == 422
    assert client.post('/api/scenarios', content=b'x'*(32*1024*1024+1)).status_code == 413


def test_horizons_units_and_cache(client):
    calls = []

    async def get(url, params):
        calls.append(params)
        return httpx.Response(200, request=httpx.Request('GET', url), json={
            'signature': {'version': '1.3'},
            'result': '$$SOE\n2451545, A.D. 2000-Jan-01, 1, 2, 3, 4, 5, 6,\n$$EOE'})

    app.state.http.get = get
    first = client.get('/api/horizons?target=499&jd=2451545')
    assert first.status_code == 200
    assert first.json()['position'] == [1000, 2000, 3000]
    assert first.json()['velocity'] == [4000, 5000, 6000]
    assert first.json()['cached'] is False
    assert client.get('/api/horizons?target=499&jd=2451545').json()['cached'] is True
    assert len(calls) == 1
    assert calls[0]['TIME_TYPE'] == "'UT'"
    assert calls[0]['CENTER'] == "'500@10'"


def test_horizons_application_error(client):
    async def get(url, params):
        return httpx.Response(200, request=httpx.Request('GET', url), json={'error': 'No target'})
    app.state.http.get = get
    assert client.get('/api/horizons?target=499&jd=2451545').status_code == 502


def test_rate_limit_and_cors(client):
    response = client.options('/api/scenarios', headers={
        'Origin': 'http://127.0.0.1:5173', 'Access-Control-Request-Method': 'POST'})
    assert response.headers['access-control-allow-origin'] == 'http://127.0.0.1:5173'
    for _ in range(120):
        assert client.get('/api/health').status_code == 200
    assert client.get('/api/health').status_code == 429


def test_presets(client):
    assert {'solar-now', 'empty'}.issubset({p['id'] for p in client.get('/api/presets').json()})


def test_extended_event_and_slow_time_roundtrip(client):
    value = scenario()
    value['settings']['timeScale'] = .1
    value['events'] = [{'id': 1, 'jd': value['jd'], 'kind': 'soi', 'bodyIds': [], 'message': 'Entered influence', 'energyDelta': 0, 'massDelta': 0}]
    value['eventSerial'] = 1
    value['view'] = {'realRadii': True, 'realDistances': True, 'scaleMode': 'scientific'}
    result = client.post('/api/scenarios', json=value)
    assert result.status_code == 201
    assert client.get('/api/scenarios/' + result.json()['id']).json() == value
    value['settings']['timeScale'] = 315576000
    assert client.post('/api/scenarios', json=value).status_code == 201


def test_invalid_display_scales(client):
    for scale in (0, -1, 10000000, True, 'wide'):
        value = scenario()
        value['view'] = {'distanceScale': scale}
        assert client.post('/api/scenarios', json=value).status_code == 422
