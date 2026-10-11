"""SQLite online backups: consistent WAL-aware copies, never a live file copy."""
from contextlib import closing
import argparse
import json
import os
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path

def backup(source, directory, retain=14):
    source, directory = Path(source), Path(directory)
    if not source.is_file():
        raise RuntimeError('Database unavailable; backup was not created')
    directory.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    target = directory / ('orrery-' + stamp + '.sqlite3')
    temporary = target.with_suffix('.partial')
    try:
        with closing(sqlite3.connect(source.resolve().as_uri()+'?mode=ro', uri=True, timeout=30)) as db:
            with closing(sqlite3.connect(temporary)) as output:
                db.backup(output, pages=256, sleep=.1)
                if output.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                    raise RuntimeError('Backup integrity check failed')
        os.chmod(temporary, 0o600)
        temporary.replace(target)
        # Only this tool's completed backups in the explicit backup directory.
        for old in sorted(directory.glob('orrery-*.sqlite3'), reverse=True)[max(1,retain):]:
            old.unlink()
        return target
    finally:
        if temporary.exists():
            temporary.unlink()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--loop', action='store_true')
    args = parser.parse_args()
    interval = max(1, float(os.getenv('BACKUP_INTERVAL_HOURS','24')))*3600
    while True:
        try:
            path = backup(os.environ.get('ORRERY_DB','/data/orrery.sqlite3'), os.environ.get('BACKUP_DIRECTORY','/backups'), int(os.getenv('BACKUP_RETAIN_COUNT','14')))
            print(json.dumps({'event':'backup_completed','name':path.name}), flush=True)
        except Exception as error:
            print(json.dumps({'event':'backup_failed','type':type(error).__name__}), flush=True)
            if not args.loop:
                raise SystemExit(1)
        if not args.loop:
            break
        time.sleep(interval)
if __name__ == '__main__':
    main()
