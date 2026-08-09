# Database

## Local SQLite

SQLite is the working source of truth on the device. The schema is in
`src/database/schema.ts` and includes:

- `organizations`
- `schools`
- `academic_years`
- `classes`
- `students`
- `student_field_definitions`
- `student_field_values`
- `sync_queue`
- `app_settings`

Each syncable table includes `created_at`, `updated_at`, `deleted_at`,
`sync_status`, and `last_synced_at`.

## Supabase

The Supabase migration lives at
`supabase/migrations/20260809000000_initial_flowpilot_schema.sql`.

RLS is enabled on every public table. Access is scoped through
`organization_members`, so authenticated users can only access records for their
organization. Student photos use a private `student-photos` bucket with storage
policies based on the organization ID in the object path.

After creating an auth user, attach that user to an organization:

```sql
INSERT INTO public.organization_members (organization_id, user_id, role)
VALUES ('00000000-0000-4000-8000-000000000001', '<auth-user-id>', 'SCHOOL_ADMIN');
```
