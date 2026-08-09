# FlowPilot Implementation Steps

1. Initialize Expo + TypeScript project and install offline/auth/media/export/test dependencies.
2. Configure FlowPilot branding, native IDs, Expo Router, permissions, EAS profiles, and environment placeholders.
3. Create feature-oriented folders for auth, schools, classes, students, custom fields, sync, exports, settings, database, services, hooks, and validation.
4. Define domain types for organizations, schools, academic years, classes, students, custom fields, and sync queue records.
5. Add Zod validation for auth, schools, classes, custom fields, and student records.
6. Implement SQLite schema with sync metadata and a persistent outbox queue.
7. Seed local demo data so the app works immediately offline.
8. Implement repositories for local CRUD, search/filtering, soft delete, custom field values, and queue insertion.
9. Add Supabase client and auth helpers for email/password, sign-up, password reset, and logout.
10. Add Supabase SQL migration, RLS policies, and private storage bucket policies.
11. Implement sync queue processing for create/update/delete operations with retry limits.
12. Implement photo capture/gallery selection and compression before local persistence.
13. Implement PDF/CSV export and native sharing.
14. Build app screens for dashboard, auth, school/class management, student capture, student list/detail, daily records, custom fields, sync status, and settings.
15. Add focused Jest tests for critical pure business logic.
16. Run `npm run typecheck`, `npm test`, and `npm run lint`.
17. Configure Supabase environment variables and push migrations.
18. Run with Expo Go or simulator.
19. Build production artifacts with EAS.
