# iOS 7-Day Demo And Distribution

This guide separates three Apple workflows that look similar but have different
cost, signing, and review requirements.

| Goal | Best path | Apple membership | Review |
| --- | --- | --- | --- |
| Show the app from your own iPhone for 5 to 7 days | Xcode Personal Team | Free Apple Account | No |
| Let one friend install directly on their iPhone | EAS internal distribution | Paid Developer Program | No App Review, but the device UDID is required |
| Send a normal beta invitation | TestFlight external testing | Paid Developer Program | First external build normally needs Beta App Review |
| Publish for anyone to find | Public App Store | Paid Developer Program | Full App Review |

Apple's free Personal Team provisioning is for personal on-device testing, not
general app distribution. Its App IDs, registered devices, and provisioning
profiles expire after 7 days. The paid Apple Developer Program is currently
99 USD per membership year, with possible fee waivers for eligible nonprofit,
education, or government organizations.

Official references:

- [Apple membership comparison](https://developer.apple.com/support/compare-memberships/)
- [Expo local development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo internal distribution](https://docs.expo.dev/tutorial/eas/internal-distribution-builds/)
- [Apple TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview)
- [Expo iOS submission](https://docs.expo.dev/submit/ios/)

## Recommendation For This Demo

Use **Option A** when you will show FlowPilot to your friend from your iPhone.
It is the only zero-cost native iPhone path and naturally lasts about 7 days.

Use **Option C, TestFlight**, when your friend needs to install the app remotely.
It costs the Apple Developer membership, but it provides a familiar invitation,
does not require the friend's UDID, and can be stopped after 5 to 7 days.

Do not submit a public App Store release only for a one-friend demo. Review and
privacy preparation take longer, and removing the listing does not provide a
clean time limit for an app that has already been downloaded.

## Before Any iPhone Build

1. Install the latest stable Xcode from the Mac App Store and open it once.
2. In Xcode, open **Settings > Accounts** and add your Apple Account.
3. Connect the iPhone, trust the Mac, and enable Developer Mode if iOS asks.
4. In the repository, install the required Node version and dependencies:

```sh
cd FlowPilot-Mobile
nvm install
nvm use
npm install
```

5. Confirm `.env` contains only the public Supabase URL and publishable key.
6. Complete the owner bootstrap and authentication setup in
   [Production Access](PRODUCTION_ACCESS.md).
7. Run the release checks:

```sh
npm run lint
npm run typecheck
npm test
```

## Option A: Free Xcode Build For 7 Days

Generate the native iOS project:

```sh
npx expo prebuild --platform ios
npx pod-install
open ios/FlowPilot.xcworkspace
```

Then in Xcode:

1. Select the **FlowPilot** project and the **FlowPilot** app target.
2. Open **Signing & Capabilities**.
3. Enable **Automatically manage signing**.
4. Select your **Personal Team**.
5. If the bundle identifier is unavailable, replace `com.flowpilot.mobile` with
   a unique value such as `com.yourname.flowpilot.demo` in both Xcode and
   `app.json` before regenerating the native project.
6. Choose your connected iPhone as the run destination.
7. For a self-contained demo without Metro, open **Product > Scheme > Edit
   Scheme > Run** and set **Build Configuration** to **Release**.
8. Press the Run button. Xcode signs, installs, and launches FlowPilot.

The app remains usable until the free provisioning profile expires, normally 7
days from issuance. Reconnect the phone and rebuild to renew it. Keep the app on
your own phone and show it to your friend; this Personal Team path is not the
proper way to distribute an app to other people.

Generated `ios/` and `android/` directories are ignored in this repository so
Expo can recreate them from `app.json`. Commit native folders only if the project
later adopts intentional custom native code.

## Option B: EAS Internal Distribution

Use this when your friend needs a direct install and you have a paid Apple
Developer membership. The friend's device must be included in the ad hoc
provisioning profile.

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest device:create
npx eas-cli@latest build --profile preview --platform ios
```

Send the device-registration link to your friend before the build. After the
device is registered and the preview build completes, send the EAS installation
link. A build made before that UDID was included must be rebuilt or re-signed.

This repository already has a `preview` profile with
`"distribution": "internal"` in `eas.json`.

## Option C: TestFlight For A 5 To 7 Day Beta

TestFlight is the cleanest remote-sharing option. It requires a paid Apple
Developer membership and an App Store Connect app record, but the app does not
need to be publicly released.

1. Enroll in the Apple Developer Program.
2. Create the FlowPilot app in App Store Connect with the same bundle ID.
3. Configure EAS and build a store-signed binary:

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --platform ios --latest
```

4. In App Store Connect, open **FlowPilot > TestFlight**.
5. Complete beta details, export-compliance questions, contact email, and test
   instructions.
6. Create an external testing group and invite your friend's Apple Account email.
7. Submit the first external build for TestFlight Beta App Review.
8. After approval, your friend installs Apple's TestFlight app and accepts the
   invitation.
9. After 5 to 7 days, select the build in App Store Connect and expire it or
   remove the testing group.

TestFlight builds can remain testable for up to 90 days, but Apple lets the
developer stop testing earlier. External testers do not need to send a UDID.

## Option D: Temporary Public App Store Release

This is possible but is not recommended for a short friend demo. It requires the
paid program, store metadata, screenshots, privacy disclosures, support and
privacy-policy URLs, and full App Review. The listing can be made free and later
removed from sale, but this is not a free developer deployment and is not a
reliable 7-day access-control mechanism.

Before a public release, FlowPilot still needs:

- A final app icon, splash screen, iPhone/iPad screenshots, description, support
  URL, privacy-policy URL, age rating, and App Privacy answers.
- Separate production Supabase data with sample students removed.
- Production SMTP, backups, monitoring, retention rules, and incident response.
- Real-device checks for invitation, Google sign-in, expired links, password
  reset, camera, sharing, offline access, revocation, and sync retries.
- An in-app way for a user to initiate deletion of their own account and related
  data. Apple requires this for App Store apps that support account creation.
- A decision on Sign in with Apple. Apple's login guideline has an exception for
  some education, enterprise, and business apps that require an existing
  organization account, but App Review determines whether FlowPilot qualifies.
  Supporting Sign in with Apple is the safer general-consumer release path.

References:

- [Apple account deletion requirement](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Apple App Review Guidelines, including login services](https://developer.apple.com/app-store/review/guidelines/)

## Five-Day Test Script

Use a controlled test organization and synthetic student records only.

| Day | Test |
| --- | --- |
| 1 | Owner login, invitation, Google login, role visibility |
| 2 | Create and edit records offline, then reconnect and sync |
| 3 | Camera, photo library, custom fields, validation, PDF/CSV exports |
| 4 | Failed sync retry, account removal, and offline access expiry |
| 5 | Delete all synthetic records, review audit events, collect feedback, expire the build |

Do not use real student names, photos, addresses, or guardian details during a
friend demo unless the organization has completed its legal and privacy review.
