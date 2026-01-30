# PinEvents

PinEvents is a monorepo for the mobile MVP and API server.

## Requirements

- Node.js (LTS recommended)
- npm (comes with Node.js)

## Getting started (Windows)

1. Open PowerShell and install dependencies from the repo root:

```powershell
npm install
```

2. Start the mobile app and API server together:

```powershell
npm run dev
```

3. Optional: run them separately in different terminals:

```powershell
npm run dev:mobile
npm run dev:server
```

## Mobile app notes

- The mobile app is an Expo React Native project.
- `expo-dev-client` is included for dev builds.
- Use `npx expo` commands when you need to run Expo tools.

## Server notes

- The server is an Express + TypeScript API.
- Configure `MONGO_URI` (and optional `PORT`) in a local `.env` file.
- Example:

```env
MONGO_URI=mongodb://localhost:27017/pinevents
PORT=4000