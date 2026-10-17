UET Hostel Management - Vercel deployment patch

Apply these files to the EXISTING project root (E:\uet-hostel-management), keeping the directory structure:
- index.ts                         -> project root
- vercel.json                      -> project root
- scripts/prepare-vercel.mjs       -> scripts/prepare-vercel.mjs
- server/src/app.ts                -> overwrite existing file with this patched version

Then, from PowerShell in E:\uet-hostel-management, run:
  npm run typecheck
  npm run build
  node .\scripts\prepare-vercel.mjs
  Test-Path .\public\index.html

The last command should return True. Do not deploy until the checks are reviewed.

Vercel build command is configured in vercel.json. The existing npm run build compiles the Vite client and TypeScript server; the helper copies client/dist into root public/ for Vercel's static CDN.

Important:
- Do not upload .env or service-account JSON files.
- In Vercel Environment Variables, set the VITE_FIREBASE_* values needed by the client and server-side FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and optional FIREBASE_STORAGE_BUCKET. Do NOT set FIREBASE_SERVICE_ACCOUNT_PATH on Vercel because a local Windows path will not exist there.
- Set CLIENT_ORIGIN to the deployed site's origin once its Vercel URL is known.
- This patch does not modify Firestore rules or your local dev server entrypoint.
