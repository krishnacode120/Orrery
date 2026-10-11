"""CI-only volume probe; never run against the production database."""
import sys
from backend.db import initialize, connection

if __name__ == '__main__':
    if sys.argv[1:] == ['write']:
        initialize()
        with connection() as db:
            db.execute('CREATE TABLE IF NOT EXISTS launch_probe (value TEXT)')
            db.execute("INSERT INTO launch_probe VALUES ('persisted')")
    elif sys.argv[1:] == ['read']:
        with connection() as db:
            assert db.execute('SELECT value FROM launch_probe').fetchone()[0] == 'persisted'
        print('Database survived container replacement')
    else:
        raise SystemExit('Use write or read, against a disposable CI volume only')
