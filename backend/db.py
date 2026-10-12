"""SQLite locally; managed PostgreSQL when DATABASE_URL is configured."""
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import urlsplit

class PostgresConnection:
    """Adapt only Orrery's static qmark SQL; parameter values stay separate."""
    def __init__(self, raw):
        self.raw = raw
    def execute(self, sql, parameters=()):
        return self.raw.execute(sql.replace('?', '%s'), parameters)
    def executescript(self, sql):
        for statement in sql.split(';'):
            if statement.strip():
                self.raw.execute(statement)

def database_url():
    url = os.getenv('DATABASE_URL', '')
    if url and urlsplit(url).scheme not in ('postgres', 'postgresql'):
        raise RuntimeError('DATABASE_URL must use PostgreSQL')
    if os.getenv('VERCEL') and not url:
        raise RuntimeError('Vercel requires persistent DATABASE_URL; temporary SQLite is disabled')
    return url

@contextmanager
def connection():
    url = database_url()
    if url:
        import psycopg
        from psycopg.rows import dict_row
        options = {'connect_timeout': 10, 'row_factory': dict_row}
        if os.getenv('ORRERY_ENV') == 'production':
            # libpq wheels may lack a usable serverless system CA location.
            # Use the packaged Mozilla trust roots without disabling hostname checks.
            import certifi
            options.update(sslmode='verify-full', sslrootcert=certifi.where())
        with psycopg.connect(url, **options) as db:
            db.execute("SET statement_timeout = '15000ms'")
            yield PostgresConnection(db)
        return
    path = Path(os.getenv('ORRERY_DB', str(Path(__file__).with_name('orrery.sqlite3'))))
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=10)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()

def initialize():
    postgres = bool(database_url())
    with connection() as db:
        if postgres:
            db.execute('SELECT pg_advisory_xact_lock(193712291)')
        else:
            db.execute('PRAGMA journal_mode=WAL')
        # DOUBLE PRECISION also has REAL affinity in SQLite; timestamps retain precision.
        db.executescript("""
            CREATE TABLE IF NOT EXISTS scenarios (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, payload TEXT NOT NULL,
                edit_hash TEXT NOT NULL, updated_at DOUBLE PRECISION NOT NULL
            );
            CREATE INDEX IF NOT EXISTS scenarios_owner ON scenarios(edit_hash);
            CREATE TABLE IF NOT EXISTS mission_definitions (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, payload TEXT NOT NULL,
                edit_hash TEXT NOT NULL, updated_at DOUBLE PRECISION NOT NULL
            );
            CREATE TABLE IF NOT EXISTS horizons_cache (
                key TEXT PRIMARY KEY, payload TEXT NOT NULL,
                expires_at DOUBLE PRECISION NOT NULL
            );
            CREATE TABLE IF NOT EXISTS request_limits (
                key TEXT PRIMARY KEY, count INTEGER NOT NULL,
                expires_at DOUBLE PRECISION NOT NULL
            );
        """)

def allow_request(key, now, limit=120):
    """Shared fixed-window limit for serverless instances, with atomic increments."""
    with connection() as db:
        db.execute('DELETE FROM request_limits WHERE expires_at<?', (now,))
        row = db.execute(
            'INSERT INTO request_limits (key,count,expires_at) VALUES (?,1,?) '
            'ON CONFLICT(key) DO UPDATE SET count=request_limits.count+1 RETURNING count',
            (key, (int(now // 60)+1)*60)).fetchone()
        return row['count'] <= limit
