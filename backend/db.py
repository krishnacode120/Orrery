import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path


@contextmanager
def connection():
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
    with connection() as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.executescript('''
            CREATE TABLE IF NOT EXISTS scenarios (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                payload TEXT NOT NULL,
                edit_hash TEXT NOT NULL,
                updated_at REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS scenarios_owner ON scenarios(edit_hash);
            CREATE TABLE IF NOT EXISTS horizons_cache (
                key TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                expires_at REAL NOT NULL
            );
        ''')
