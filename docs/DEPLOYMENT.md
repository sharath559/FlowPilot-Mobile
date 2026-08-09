# Deployment

## Local

```sh
npm install
npm run typecheck
npm test
npm run start
```

## Supabase

```sh
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

Deploy the account-management function:

```sh
supabase functions deploy admin-members
supabase secrets set FLOWPILOT_APP_REDIRECT_URL=flowpilot://accept-invite
```

Then follow `docs/PRODUCTION_ACCESS.md` for the one-time owner bootstrap, Auth
hook, Google provider, redirect URLs, and SMTP configuration.

## EAS Builds

```sh
npx eas build --profile preview --platform android
npx eas build --profile production --platform android
npx eas build --profile production --platform ios
```

iOS production builds require Apple Developer credentials. Android production
builds produce a store-ready artifact when the Expo/EAS project is configured.

For the free 7-day Xcode route, EAS internal distribution, TestFlight, and a
public App Store readiness checklist, see `docs/IOS_7_DAY_DEMO.md`.

## CI

Recommended checks for every pull request:

```sh
npm run typecheck
npm test
npm run lint
```
