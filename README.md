# UET Hostel Management System

A full-stack web application for managing hostel operations, with separate
admin and student experiences. The React client uses Firebase Authentication
and Cloud Firestore; an Express API handles protected operations such as room
lookup, room assignment, student requests, and push notifications.

## Features

### Administrators

- Manage students, hostels, rooms, and room assignments.
- Review and manage student complaints and leave requests.
- Create and manage weekly mess-menu items, including food-image URLs and
  Cloudinary image uploads.
- Publish notices, review reports, and manage notifications.

### Students

- View their profile and assigned room.
- Submit complaints and leave requests and track their requests.
- View notices, the weekly mess menu, and notifications.
- Upload a profile photo using Cloudinary.

## Technology

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **API:** Node.js, Express, TypeScript
- **Data and identity:** Firebase Authentication, Cloud Firestore, Firebase
  Admin SDK
- **Images:** Cloudinary unsigned image uploads
- **Push:** Firebase Cloud Messaging (FCM)

## Project layout

```text
uet-hostel-management/
├── client/                 # React/Vite application
├── server/
│   ├── src/
│   │   ├── config/         # Environment and Firebase Admin configuration
│   │   ├── routes/         # Express API routes
│   │   ├── scripts/        # Utility scripts, including the mess-menu seeder
│   │   └── ...             # Controllers, middleware, services, validators
│   └── tsconfig.json
├── server.ts               # Combined development and production entry point
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Firestore indexes
├── firebase.json           # Firebase and emulator configuration
└── .env.example            # Environment-variable template
```

## Requirements

- Node.js and npm
- A Firebase project with Authentication and Cloud Firestore configured
- A Cloudinary account and unsigned upload preset for image uploads
- Firebase Admin service-account credentials for protected API operations

## Setup

Install dependencies from the repository root:

```powershell
npm install
Copy-Item .env.example .env
```

Edit the root `.env` and set the values needed by the features you plan to use:

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web app API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket setting used by the web configuration |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase web app messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase web app ID |
| `VITE_FIREBASE_VAPID_KEY` | Web Push certificate key for browser notifications |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned upload preset name |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to a Firebase Admin service-account JSON file |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Alternative Firebase Admin credentials when not using a service-account file |
| `FIREBASE_STORAGE_BUCKET` | Firebase Admin storage bucket, if used |
| `PORT` | Standalone Express API port (defaults to `5000`) |
| `CLIENT_ORIGIN` | Comma-separated origins allowed by the standalone API |
| `VITE_API_BASE_URL` | API base URL for a deployment; defaults to `/api` |

Vite reads the root `.env` file. Do not commit `.env`, service-account JSON
files, private keys, or other credentials. Keep Firebase Admin credentials
private; only variables prefixed with `VITE_` are included in the browser
configuration.

For Cloudinary uploads, configure an **unsigned upload preset** in Cloudinary
and put its name and cloud name in the two `VITE_CLOUDINARY_*` settings.
Profile and mess-menu uploads accept image files up to 5 MB. The mess-menu
admin form also accepts a direct image URL.

## Run locally

Run the combined application (Vite client and Express API on port `3000`):

```powershell
npm run dev
```

The application is available at `http://localhost:3000`.

To run the client and API separately, open two terminals from the repository
root:

```powershell
npm run dev --workspace=client
```

```powershell
npm run dev --workspace=server
```

The client runs on port `3000` and proxies `/api` requests to the API on port
`5000` during development. The server also provides a health endpoint at
`/api/health`.

The combined command runs from the repository root and loads the root `.env`.
When running the server workspace separately, its environment loader looks for
`server/.env`; create that ignored file with the server settings from the root
`.env` (especially the Firebase Admin credentials).

## Build and quality checks

Run these from the repository root:

```powershell
npm run typecheck
npm run lint
npm run build
```

The root `lint` script runs the client ESLint check. The project currently does
not define an automated test script.

## Seed the sample mess menu

The repository includes a command that adds a sample weekly menu to the
configured Firestore project:

```powershell
npm run seed:mess -- --project uet-hostel-management-48e69
```

The script requires valid Firebase Admin credentials for that project and an
existing administrator document in `users`. It uses stable document IDs,
skips already-present items, and does not update or delete existing menu
records. The menu is sample content; verify it against the official hostel
menu before treating it as authoritative.

## Firebase rules, indexes, and emulators

The Firebase configuration points to `firestore.rules` and
`firestore.indexes.json`. Deploy them to the intended Firebase project with:

```powershell
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes --project uet-hostel-management-48e69
```

The Firestore and Authentication emulator ports are configured in
`firebase.json` (Firestore `8080`, Authentication `9099`). Start emulators
using Firebase CLI when you want to test against local Firebase services rather
than the live project.

## Push notifications

1. Enable Firebase Cloud Messaging for the Firebase project and create a Web
   Push certificate key pair in **Project settings → Cloud Messaging**.
2. Set the public key as `VITE_FIREBASE_VAPID_KEY` in the root `.env`.
3. Configure Firebase Admin credentials in the root `.env` for the Express
   server. Never expose the service-account private key in client settings.
4. Deploy the Firestore rules and indexes using the command above.
5. Start the app, sign in, and enable notifications from the student or admin
   Notifications page. Allow notifications in the browser.

The service worker is served from `/firebase-messaging-sw.js`. Notification
records and browser push tokens are handled through the authenticated API.
