# IOPPS Mobile App Build Setup

## Prerequisites

1. Install EAS CLI: `npm install -g eas-cli`
2. Login to Expo: `eas login`
3. Link project: `eas build:configure`

## Environment Setup

1. Copy `.env.example` to `.env` and fill in the values
2. The Firebase credentials are already configured in `.env`

## Android Setup

### For Development/Preview Builds

No additional setup needed. Run:
```bash
eas build --platform android --profile preview
```

### For Production (Google Play)

1. **Download `google-services.json`**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select project `iopps-c2224`
   - Go to Project Settings > Your apps > Android app
   - Download `google-services.json`
   - Place it in the `mobile/` directory

2. **Create Google Play Service Account**:
   - Go to [Google Play Console](https://play.google.com/console)
   - Settings > API access > Create new service account
   - Download the JSON key
   - Save as `google-play-service-account.json` in the `mobile/` directory
   - Add the service account email to your Google Play app with "Release manager" permission

3. **Build and Submit**:
   ```bash
   eas build --platform android --profile production
   eas submit --platform android
   ```

## iOS Setup

### For Development Builds (Simulator)

```bash
eas build --platform ios --profile development
```

### For Preview/TestFlight

1. **Apple Developer Account Required**
   - Join at [developer.apple.com](https://developer.apple.com)

2. **Configure eas.json**:
   Edit `eas.json` and fill in:
   ```json
   "ios": {
     "appleId": "your-apple-id@email.com",
     "ascAppId": "your-app-store-connect-app-id",
     "appleTeamId": "your-team-id"
   }
   ```

   - `appleId`: Your Apple ID email
   - `ascAppId`: Find in App Store Connect > App Information > Apple ID
   - `appleTeamId`: Find in Apple Developer portal > Membership

3. **Build and Submit**:
   ```bash
   eas build --platform ios --profile preview
   eas submit --platform ios
   ```

## Build Profiles

| Profile | Purpose | Distribution |
|---------|---------|--------------|
| `development` | Dev testing with dev client | Internal (simulator) |
| `preview` | Testing on real devices | Internal (APK/TestFlight) |
| `production` | App Store/Play Store release | Store |

## Useful Commands

```bash
# Check build status
eas build:list

# View build logs
eas build:view

# Cancel a build
eas build:cancel

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Files NOT to Commit

These files contain secrets and should never be committed:
- `.env` (use `.env.example` as template)
- `google-services.json`
- `google-play-service-account.json`
- Any `.p8`, `.p12`, or `.mobileprovision` files
