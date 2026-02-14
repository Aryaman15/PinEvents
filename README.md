# PinEvents

PinEvents is a monorepo for the mobile MVP and API server.

## Prereqs for setup

- Node.js (LTS recommended)
- npm (comes with Node.js)
- MongoDB (local install or hosted)

## Setup

### 1) Install dependencies

From the repo root:

```powershell
npm install
```

### 2) Server setup (API)

1. Create `apps/server/.env` with:

```env
MONGO_URI=mongodb://localhost:27017/pinevents
PORT=4000
JWT_SECRET=your-secret
```

2. Start the server:

```powershell
npm run dev:server
```

### 3) Mobile setup (Expo dev client)

1. Create `apps/mobile/.env` with:

```env
EXPO_PUBLIC_API_URL=http://<your-laptop-ip>:4000
```

2. Install Expo CLI (if not already installed):

```powershell
npm install --global expo-cli
```

3. Install Android tooling & Gradle (one-time, team PCs)

Follow these steps on each dev machine before building:

1. Install Android Studio and the Android SDK.
2. In Android Studio:
   - Open **SDK Manager** → install **Android SDK Platform** (e.g., API 34).
   - Open **SDK Tools** → install **Android SDK Build-Tools**, **Platform-Tools**, and **Command-line Tools**.
3. Set environment variables:
   - `ANDROID_HOME` → your SDK path (e.g. `C:\Users\<you>\AppData\Local\Android\Sdk`)
   - Add `%ANDROID_HOME%\platform-tools` to your `PATH`.
4. Verify `gradlew` works (Expo will generate it during prebuild).

## Preview (Expo dev client)

### One-time setup (create native dev build)

Run these commands from `apps/mobile`:

```powershell
npx expo prebuild --clean
npx expo run:android
```

### Daily dev flow (run the dev client)

From `apps/mobile`:

```powershell
npx expo start --dev-client
```

Scan the QR code from the dev build app on your device.

## Troubleshooting

- Make sure your laptop and phone are on the same Wi-Fi network.
- If the device cannot reach your machine, use:

```powershell
npx expo start --dev-client --tunnel
```

## Notes

- The mobile app is an Expo React Native project using `expo-dev-client`.
- MapLibre uses a style URL (tiles) and does not require a Google Maps API key by default.
- Configure the API base URL with `EXPO_PUBLIC_API_URL` in `apps/mobile/.env`.
