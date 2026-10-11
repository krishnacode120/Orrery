import os
import pytest
from backend.db import database_url, PostgresConnection, initialize, connection, allow_request

def test_serverless_refuses_temporary_sqlite(monkeypatch):
    monkeypatch.setenv('VERCEL','1')
    monkeypatch.delenv('DATABASE_URL',raising=False)
    with pytest.raises(RuntimeError,match='persistent'):
        database_url()

def test_postgres_parameter_values_are_not_interpolated():
    class Recorder:
        def execute(self,sql,values):
            self.sql,self.values=sql,values
    raw=Recorder()
    adapter=PostgresConnection(raw)
    value="'); DELETE FROM scenarios; -- ? %s"
    adapter.execute('SELECT * FROM scenarios WHERE id=?',(value,))
    assert raw.sql=='SELECT * FROM scenarios WHERE id=%s'
    assert raw.values==(value,)

def test_shared_limit_and_cache_upsert(tmp_path,monkeypatch):
    monkeypatch.delenv('DATABASE_URL',raising=False)
    monkeypatch.delenv('VERCEL',raising=False)
    monkeypatch.setenv('ORRERY_DB',str(tmp_path/'db.sqlite3'))
    initialize()
    assert allow_request('bucket',120,2)
    assert allow_request('bucket',121,2)
    assert not allow_request('bucket',122,2)
    assert allow_request('next',181,2)
    with connection() as db:
        assert db.execute('SELECT count(*) AS n FROM request_limits').fetchone()['n']==1
        sql='INSERT INTO horizons_cache VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,expires_at=excluded.expires_at'
        db.execute(sql,('test','old',1))
        db.execute(sql,('test','new',2))
        row=db.execute('SELECT * FROM horizons_cache WHERE key=?',('test',)).fetchone()
        assert row['payload']=='new' and row['expires_at']==2

@pytest.mark.skipif(not os.getenv('TEST_DATABASE_URL'),reason='Dedicated PostgreSQL CI service required')
def test_postgres_crud_rollback_and_cache(monkeypatch):
    monkeypatch.setenv('DATABASE_URL',os.environ['TEST_DATABASE_URL'])
    monkeypatch.setenv('ORRERY_ENV','test')
    initialize()
    with connection() as db:
        db.execute('DELETE FROM scenarios WHERE id=?',('ci-probe',))
        db.execute('INSERT INTO scenarios VALUES (?,?,?,?,?)',('ci-probe','name','{}','edit',1700000000.125))
    with connection() as db:
        row=db.execute('SELECT * FROM scenarios WHERE id=?',('ci-probe',)).fetchone()
        assert row['updated_at']==1700000000.125
    with pytest.raises(ValueError):
        with connection() as db:
            db.execute('UPDATE scenarios SET name=? WHERE id=?',('rollback','ci-probe'))
            raise ValueError('rollback')
    with connection() as db:
        assert db.execute('SELECT * FROM scenarios WHERE id=?',('ci-probe',)).fetchone()['name']=='name'
        db.execute('DELETE FROM scenarios WHERE id=?',('ci-probe',))
    assert allow_request('postgres-test',120,1)
    assert not allow_request('postgres-test',121,1)
