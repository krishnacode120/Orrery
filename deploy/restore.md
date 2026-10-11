# Backup and recovery

The Compose database and backups use separate named volumes. The backup service uses SQLite's online backup API, verifies integrity and retains 14 daily snapshots. It does not copy an active WAL database file. Backups on the same server protect against application mistakes, not loss of that server.

Before launch configure an encrypted off-host destination under your control. No remote backup destination has been assumed or provisioned. Schedule transfer of completed orrery-*.sqlite3 files using your provider backup service or a separately configured encryption tool. Do not publish database archives.

## Restore drill on an isolated machine

1. Download a completed backup and verify its checksum from your transfer manifest.
2. Run Python sqlite3 against it and require PRAGMA integrity_check to return ok.
3. Start a separate deployment with different volume names and no public traffic.
4. Stop its api and backup services. Copy the snapshot into its empty database volume as /data/orrery.sqlite3, owned by UID/GID 10001. Never overwrite a running SQLite database or retain an unrelated -wal/-shm file.
5. Start api. Verify /api/ready, an existing scenario read and an authorized update using the original edit key.
6. Verify scenario counts and representative physics payloads. Restart/recreate the api container and confirm persistence.
7. Only after that drill should the operator schedule production recovery. Preserve the old volume for rollback. This procedure does not automatically delete any production data.

Backup failure is emitted as structured backup_failed logs. Monitor these and backup age. Retention count and interval are configured in Compose; keep sufficient off-host history for your recovery objective.
