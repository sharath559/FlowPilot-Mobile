# Architecture

FlowPilot is local-first. The UI writes to SQLite immediately, and every create,
update, or delete is also written to `sync_queue`. When Supabase is configured
and the device is online, the sync service drains the queue.

```text
Expo Router screens
  -> AppDataProvider
  -> SQLite repositories
  -> local tables + sync_queue
  -> sync service
  -> Supabase Postgres/Auth/Storage
```

The app is organized by feature under `src/features`, with shared contracts in
`src/types`, validation in `src/validation`, and persistence in `src/database`.
The native app identity stays centralized in `src/constants/branding.ts` and
`app.json`.

The current implementation favors a robust foundation over a custom design
system. Screens are intentionally simple and operational: add records quickly,
see sync state, browse/search, and export.
