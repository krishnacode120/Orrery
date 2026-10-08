import pytest
from backend.models import Scenario
from backend.tests.test_navigation import snapshot


def test_scheduled_events_and_branch_metadata_round_trip():
    s=snapshot()
    s['branch']={'id':'child','parentId':'baseline','name':'Sun mass experiment','epochJD':s['jd']}
    s['experimentEvents']=[{'id':'g','jd':s['jd']+30,'executed':False,
                           'operation':{'kind':'gravity','mode':'multiply','value':2}}]
    validated=Scenario.model_validate(s)
    assert validated.branch.parentId=='baseline'
    assert validated.experimentEvents[0].operation.value==2
    assert Scenario.model_validate(validated.model_dump()).experimentEvents==validated.experimentEvents


@pytest.mark.parametrize('operation',[{'kind':'unknown'},{'kind':'mass','bodyId':'sun'},
                                      {'kind':'velocity','bodyId':'mars','vector':[1,2]},
                                      {'kind':'create'},{'kind':'collision','bodyId':'earth'},
                                      {'kind':'fragment','bodyId':'earth','count':1000}])
def test_invalid_scheduled_operations_rejected(operation):
    s=snapshot()
    s['experimentEvents']=[{'id':'bad','jd':s['jd'],'executed':False,'operation':operation}]
    with pytest.raises(ValueError):
        Scenario.model_validate(s)


def test_duplicate_scheduled_events_and_excessive_counts_rejected():
    s=snapshot()
    e={'id':'x','jd':s['jd'],'executed':False,'operation':{'kind':'gravity','value':1}}
    s['experimentEvents']=[e,e]
    with pytest.raises(ValueError):
        Scenario.model_validate(s)
    s['experimentEvents']=[{**e,'id':str(i)} for i in range(257)]
    with pytest.raises(ValueError):
        Scenario.model_validate(s)


def test_integrated_future_scenarios_do_not_extend_reality_table():
    s=snapshot()
    s['jd']=2497567.5
    assert Scenario.model_validate(s).jd==s['jd']
    s['mode']='reality'
    with pytest.raises(ValueError,match='Reality epoch'):
        Scenario.model_validate(s)


def test_experiment_accounting_event_is_shareable():
    s=snapshot()
    s['eventSerial']=1
    s['events']=[{'id':1,'jd':s['jd'],'kind':'experiment','bodyIds':['earth'],
                  'message':'Mass doubled','energyDelta':5,'massDelta':10}]
    assert Scenario.model_validate(s).events[0].kind=='experiment'
