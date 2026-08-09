# Privacy

FlowPilot stores student data and photos as sensitive records.

- Records are stored locally first in SQLite.
- Photos are intended for a private Supabase Storage bucket.
- No analytics, ads, face recognition, or tracking SDKs are included.
- Supabase access is enforced with Row Level Security through organization
  membership.
- The client uses the anon/public key only. Never ship a service-role key.
- Deleting a student is a soft delete so sync can propagate the deletion.
- Camera and photo-library permissions are requested only when needed.

Before production use, add a school/organization-specific privacy policy,
support contact, and retention policy.
