# Offline Sync

FlowPilot never requires network access to create or edit a student record.

Write flow:

1. Validate input with Zod.
2. Write the record to SQLite with `sync_status = 'PENDING'`.
3. Add a matching outbox row in `sync_queue`.
4. Update UI immediately from local data.
5. On reconnect or "Sync now", push queue rows to Supabase.
6. Mark queue rows and entities as `SYNCED`, or mark failures with retry counts.

Sync statuses:

- `PENDING`: saved locally, waiting to sync.
- `SYNCING`: currently being pushed.
- `SYNCED`: pushed successfully.
- `FAILED`: retry failed and error details are stored.

Supabase sync is skipped until environment values are configured. Local records
remain available and queued.
