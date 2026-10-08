import pytest
from backend.models import ExperimentOperation

@pytest.mark.parametrize('operation,expected', [
    ({'kind':'mass','bodyId':'earth','value':2}, 'set'),
    ({'kind':'position','bodyId':'earth','vector':[1,2,3]}, 'add'),
    ({'kind':'velocity','bodyId':'earth','vector':[1,2,3]}, 'add'),
    ({'kind':'burn','bodyId':'earth','vector':[1,2,3]}, 'add'),
])
def test_operation_defaults_match_frontend_execution(operation, expected):
    validated = ExperimentOperation.model_validate(operation)
    assert validated.mode == expected
    assert ExperimentOperation.model_validate(validated.model_dump()).mode == expected

def test_burn_rejects_non_additive_mode():
    with pytest.raises(ValueError, match='additive impulse'):
        ExperimentOperation.model_validate({'kind':'burn','bodyId':'earth','vector':[1,2,3],'mode':'set'})
