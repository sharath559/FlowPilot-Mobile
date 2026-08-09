# Production Access

FlowPilot uses invitation-only Supabase Auth. Authorization lives in Postgres
membership rows, not in a mobile environment variable.

## Security Model

- The app contains only the Supabase project URL and publishable key.
- Supabase secret/service-role keys exist only inside the deployed Edge Function.
- A Before User Created hook rejects password and OAuth registrations unless the
  exact normalized email has a current invitation.
- `ORG_ADMIN` users can invite, change roles, revoke invitations, and remove
  accounts. The final organization owner cannot be removed or demoted.
- RLS remains authoritative for every cloud data request.
- Native auth tokens and the 24-hour offline access lease use Expo SecureStore.
- Access is rechecked every five minutes and whenever the app returns to the
  foreground. Offline revocation completes when connectivity returns or the
  access lease expires.
- Access changes are recorded in `access_audit_log`.

## One-Time Owner Setup

The invite-only migration and `admin-members` function must be deployed first:

```sh
supabase db push
supabase functions deploy admin-members
supabase secrets set FLOWPILOT_APP_REDIRECT_URL=flowpilot://accept-invite
```

In Supabase Dashboard > SQL Editor, run the statement below with the owner's
real email. Do not execute the `.sql` file as a shell command.

```sql
SELECT public.bootstrap_first_owner(
  'your-owner-email@gmail.com',
  '00000000-0000-4000-8000-000000000001'
);
```

If that Auth user already exists, this promotes it to `ORG_ADMIN`. Otherwise it
creates a 30-day owner invitation so that exact email can register with Google
or email/password.

Only after the owner bootstrap succeeds, open Supabase Dashboard:

1. Go to Authentication > Hooks.
2. Enable **Before User Created**.
3. Choose the Postgres function `public.hook_require_invitation`.
4. Save and test an uninvited address. It must be rejected.

## Google Sign-In

1. In Google Auth Platform, create an OAuth client with application type
   **Web application**.
2. Add the production web origin and the local development origin
   `http://localhost:8081`.
3. Add this Google authorized redirect URI:
   `https://meavritsigfxyrsxfyxj.supabase.co/auth/v1/callback`
4. In Supabase Dashboard > Authentication > Sign In / Providers > Google,
   enable Google and enter the client ID and client secret.
5. Configure Google consent-screen branding, the `openid`, email, and profile
   scopes, and production audience settings.

Supabase automatically links a Google identity to an existing invitation user
when the verified email address matches exactly.

## Supabase Redirect URLs

In Authentication > URL Configuration, add:

```text
flowpilot://auth
flowpilot://accept-invite
http://localhost:8081/**
https://YOUR-PRODUCTION-WEB-DOMAIN/**
```

Set the Site URL to the production web URL. Invitation and OAuth redirects that
are not on this allow list are silently replaced by the Site URL.

## Invitation Workflow

1. The owner signs in and opens Settings > Manage team access.
2. The owner enters the person's exact email and selects a role.
3. The Edge Function creates the invitation before calling the Supabase Auth
   Admin API, allowing the signup hook to approve only that address.
4. A new user receives the Supabase invitation email and can set a password in
   FlowPilot. They can also choose Google with the same verified email.
5. Removing the member immediately removes its organization membership. If the
   user has no other memberships, its Supabase Auth account is deleted too.

Configure custom SMTP before inviting real users. Supabase's development email
service is not intended for a production invitation workload. Customize the
Invite User, Recovery, and confirmation templates with FlowPilot branding.

## Roles

| Role | Student records | School setup | Team access |
| --- | --- | --- | --- |
| `STAFF` | Read/write/sync | Read | No |
| `SCHOOL_ADMIN` | Read/write/sync | Manage classes and fields | No |
| `ORG_ADMIN` | Full | Full | Invite, roles, removal |

## Store Release Milestones

- Replace the test organization, school, and five sample students before live
  student data is collected.
- Configure production SMTP, Google branding, a privacy policy, support contact,
  account-deletion policy, database backups, and monitoring.
- Add Sign in with Apple before a general iOS App Store release when required by
  Apple's rules for apps offering third-party social login.
- Use separate Supabase projects for development/staging and production.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and an EAS preview build.
- Test invitation, expired-link, role change, removal, offline lease expiry,
  password recovery, and Google login on real iOS and Android devices.
