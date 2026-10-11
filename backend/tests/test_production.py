import sqlite3
import pytest
from fastapi.testclient import TestClient
import backend.main as main
from deploy.backup import backup

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv('ORRERY_DB',str(tmp_path/'db.sqlite3'))
    main.buckets.clear()
    with TestClient(main.app,raise_server_exceptions=False) as value:
        yield value

def test_health_readiness_and_noindex(client):
    assert client.get('/api/health').status_code==200
    assert client.get('/api/ready').json()['status']=='ready'
    assert client.get('/api/health').headers['x-robots-tag']=='noindex, nofollow'

def test_write_origin_rejected_before_body_processing(client):
    r=client.post('/api/scenarios',json={},headers={'Origin':'https://untrusted.example'})
    assert r.status_code==403
    assert 'Untrusted origin' in r.text

def test_production_requires_https_and_validation_redacts_input(client,monkeypatch):
    monkeypatch.setattr(main,'PRODUCTION',True)
    assert client.get('/api/presets').status_code==426
    assert client.get('/api/health').status_code==200
    with TestClient(main.app,base_url='https://testserver',raise_server_exceptions=False) as secure:
        r=secure.get('/api/horizons?target=private-secret-invalid&jd=2451545')
        assert r.status_code==422
        assert 'private-secret' not in r.text

def test_errors_do_not_expose_paths_or_exception_text(client,monkeypatch):
    def broken(): raise RuntimeError('/private/filesystem confidential-token')
    monkeypatch.setattr(main,'connection',broken)
    r=client.get('/api/ready')
    assert r.status_code==503
    assert '/private' not in r.text and 'confidential' not in r.text

def test_online_backup_is_consistent_and_restorable(tmp_path):
    source=tmp_path/'live.sqlite3'
    with sqlite3.connect(source) as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('CREATE TABLE scenarios(id TEXT,payload TEXT)')
        db.execute("INSERT INTO scenarios VALUES ('saved','original')")
        db.commit()
        one=backup(source,tmp_path/'backups',retain=2)
        db.execute("UPDATE scenarios SET payload='changed'")
        db.commit()
        two=backup(source,tmp_path/'backups',retain=2)
        three=backup(source,tmp_path/'backups',retain=2)
    assert not one.exists()
    for path in [two,three]:
        with sqlite3.connect(path) as restored:
            assert restored.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
            assert restored.execute('SELECT payload FROM scenarios').fetchone()[0]=='changed'
