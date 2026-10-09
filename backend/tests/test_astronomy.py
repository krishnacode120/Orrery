from backend.tests.test_api import client

def test_catalog_is_bounded_attributed_and_non_simulating(client):
    m=client.get('/api/astronomy/metadata')
    assert m.status_code==200
    data=m.json()
    assert data['starCount']>3000 and data['planetCount']==19 and data['systemCount']==5
    assert data['hygLicense']=='CC BY-SA 4.0'
    result=client.get('/api/astronomy/catalog?q=Proxima')
    assert result.status_code==200 and result.json()['catalogOnly']
    assert any(s['name']=='Proxima Centauri' for s in result.json()['items'])
    assert len(client.get('/api/astronomy/catalog?limit=3').json()['items'])==3
    assert client.get('/api/astronomy/catalog?limit=101').status_code==422
    assert client.get('/api/astronomy/catalog?kind=invalid').status_code==422
    assert client.get('/api/astronomy/catalog?q='+'x'*121).status_code==422

def test_catalog_lookup_and_missing_data(client):
    result=client.get('/api/astronomy/stars/hyg-70666')
    assert result.status_code==200
    assert result.json()['name']=='Proxima Centauri'
    assert 1.2<result.json()['distancePc']<1.4
    assert client.get('/api/astronomy/stars/not-a-star').status_code==404

def test_systems_keep_real_parameter_provenance(client):
    result=client.get('/api/astronomy/systems')
    assert result.status_code==200
    system=next(s for s in result.json()['systems'] if s['name']=='TRAPPIST-1')
    assert len(system['planets'])==7
    assert system['source']=='NASA Exoplanet Archive pscomppars'
    assert all(p['hostname']=='TRAPPIST-1' for p in system['planets'])

def test_sensor_and_environment_validation_roundtrip(client):
    from backend.tests.test_api import scenario
    value=scenario()
    value['view']={'sensorView':{'mode':'target','targetId':'earth','fov':30},'environment':'magnetic','interior':True,'notificationCategory':'science','discoveryNotifications':True}
    result=client.post('/api/scenarios',json=value)
    assert result.status_code==201
    assert client.get('/api/scenarios/'+result.json()['id']).json()==value
    value['view']['sensorView']['fov']=-10
    assert client.post('/api/scenarios',json=value).status_code==422
    value['view']['sensorView']['fov']=True
    assert client.post('/api/scenarios',json=value).status_code==422
    value['view']['sensorView']=None
    value['view']['environment']='unsupported'
    assert client.post('/api/scenarios',json=value).status_code==422
