# SmartCollege

A unified Express + Vite + React app. This README summarizes the actual, working folder structure and the key commands to run the app.

## Quick Start

- Development (auto-reload):
  - Windows PowerShell
    - `npx tsx server/index.ts`
- Production (uses bundled server and built client):
  - Windows PowerShell
    - `set NODE_ENV=production`
    - `node dist/index.js`

App serves on `http://localhost:10000` in both modes.

If the port is busy:
- `netstat -ano | findstr :10000`
- `taskkill /F /PID <PID>`

## Top-Level Structure

- `client/` — Frontend root (Vite project)
  - `index.html` — HTML entry served by Vite in dev
  - `src/` — React source
    - `main.tsx` — React bootstrap (mounts `#root`)
    - `App.tsx` — App providers + router
    - `pages/` — Route-level views
    - `components/` — Reusable UI components
    - `contexts/` — React context providers
    - `hooks/` — Custom hooks
    - `lib/` — Client utilities and query client setup
    - `index.css` — Global styles
- `server/` — Backend (Express)
  - `index.ts` — Server entry
  - `vite.ts` — Dev middleware + static serving in prod
  - `routes/` — Express route modules
  - `services/` — Business logic/services (AI, attendance, OCR, etc.)
  - `models/`, `storage/` — Data layer
  - `types/` — Type definitions
- `shared/` — Shared types/schemas used by both client/server
- `vite.config.ts` — Vite config (root set to `client/`, build to `dist/public`)
- `dist/` — Build output
  - `public/` — Built client assets
  - `index.js` — Bundled server entry (after `npm run build`)

## How Dev & Prod Work

- Dev: Express starts and attaches Vite middleware (`server/vite.ts`). Vite serves `client/index.html` and HMR. Hit `http://localhost:10000`.
- Prod: Build with `vite build` (client → `dist/public`) and bundle server (→ `dist/index.js`). Express serves static files from `dist/public` and API routes.

## Conventions

- Aliases (see `vite.config.ts`):
  - `@` → `client/src`
  - `@shared` → `shared`
  - `@assets` → `attached_assets` (for downloadable/static attachments)
- Keep route-level components in `client/src/pages`, shared UI in `client/src/components`.
- Shared schemas/types live in `shared/` and can be imported by both sides.

## Troubleshooting

- Tab title not showing:
  - Browser tab title comes from `client/index.html` or runtime `document.title`.
  - We defensively set it in `client/src/main.tsx` if empty.
- Port conflicts: free `10000` as shown above.
- `npm run dev`/`npm start` shell issues on Windows: use the explicit commands under Quick Start.
