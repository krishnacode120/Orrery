from backend.tests.test_api import client, scenario

def test_mission_definition_crud_preserves_edit_capability(client):
    value = {'version': 1, 'name': 'Mars reference', 'target': 'mars',
             'definition': {'launchUTC': '2031-01-01T00:00:00Z', 'criteria': {'minimumPeriapsis': 200000}}}
    response = client.post('/api/mission-definitions', json=value)
    assert response.status_code == 201
    info = response.json()
    url = '/api/mission-definitions/' + info['id']
    assert client.get(url).json() == value
    assert client.put(url, json=value, headers={'X-Edit-Key': 'x'*32}).status_code == 403
    headers = {'X-Edit-Key': info['editKey']}
    value['name'] = 'Revised criteria'
    assert client.put(url, json=value, headers=headers).status_code == 200
    assert client.get('/api/mission-definitions', headers=headers).json()[0]['name'] == value['name']
    assert client.delete(url, headers=headers).status_code == 204
    assert client.get(url).status_code == 404

def test_definition_bounds_and_gpu_schema(client):
    value = {'name': 'Too large', 'definition': {'data': 'x'*66000}}
    assert client.post('/api/mission-definitions', json=value).status_code == 422
    value = scenario()
    value.update(schemaVersion=2, createdByVersion='1.1.0')
    value['settings']['computeMode'] = 'gpu'
    assert client.post('/api/scenarios', json=value).status_code == 201
    value['settings']['computeMode'] = 'fake'
    assert client.post('/api/scenarios', json=value).status_code == 422
