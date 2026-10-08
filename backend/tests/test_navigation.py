from backend.models import Scenario
import pytest

def snapshot():
    return {'version': 2, 'name': 'Navigation test', 'mode': 'sandbox', 'jd': 2451545,
            'bodies': [], 'settings': {'gMultiplier': 1, 'softening': 1000,
                                      'stepSeconds': 1800, 'timeScale': 86400}}

def pose():
    return {'positionSI': [4487936121000, 1, 2], 'targetSI': [4487936121000, 10, 2],
            'orientation': [0, 0, 0, 1], 'mode': 'free', 'scale': 'vehicle', 'fov': .5,
            'reference': 'inertial', 'targetId': None, 'name': 'Neptune precision'}

def test_inertial_and_legacy_camera_poses_round_trip():
    s=snapshot()
    s['view']={'camera':pose(),'savedCameras':[pose()],
               'navigation':{'speed':1,'fov':.5,'vertical':'camera'},
               'timeBookmarks':[{'name':'J2000','jd':2451545}]}
    validated=Scenario.model_validate(s).model_dump()
    assert validated['view']==s['view']
    s['view']={'camera':{'position':[0,1,2],'target':[0,0,0],'scale':'system'}}
    assert Scenario.model_validate(s).view==s['view']

@pytest.mark.parametrize('navigation',[{'speed':-1},{'fov':0},{'sensitivity':0},
                                       {'vertical':'invalid'},{'followDamping':-1}])
def test_invalid_navigation_is_rejected(navigation):
    s=snapshot()
    s['view']={'navigation':navigation}
    with pytest.raises(ValueError):
        Scenario.model_validate(s)

def test_incomplete_quaternion_pose_and_invalid_date_are_rejected():
    s=snapshot()
    s['view']={'camera':{**pose(),'orientation':[0,0,0,0]}}
    with pytest.raises(ValueError):
        Scenario.model_validate(s)
    s['view']={'timeBookmarks':[{'name':'Bad','jd':9999999}]}
    with pytest.raises(ValueError):
        Scenario.model_validate(s)

def test_component_maneuvers_and_eclipse_events_round_trip():
    s=snapshot()
    s['maneuvers']=[{'id':'burn','bodyId':'vehicle','jd':2451545,
                    'direction':'vector','deltaV':10,'vector':[0,0,0],
                    'components':[10,0,0],'executed':False}]
    s['eventSerial']=1
    s['events']=[{'id':1,'jd':2451545,'kind':'eclipse','bodyIds':['vehicle'],
                  'message':'Entered umbra','energyDelta':0,'massDelta':0}]
    assert Scenario.model_validate(s).events[0].kind=='eclipse'
    s['maneuvers'][0]['components']=[1e20,0,0]
    with pytest.raises(ValueError):
        Scenario.model_validate(s)
