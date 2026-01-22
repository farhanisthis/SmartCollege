# Deployment Fix - Live Site API Connection Issue

## Problem

The live site (Netlify) was showing HTML responses instead of JSON, with errors like:

```
Failed to fetch timetable: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

This happened because:

1. Frontend was making API calls with hardcoded `/api/...` paths
2. On localhost, Vite's proxy forwarded these to the backend
3. On production (Netlify), there's no proxy, so requests went to Netlify instead of Render backend
4. Netlify returned HTML (404 pages) instead of JSON

## Solution Applied

### 1. Fixed All API Calls

Updated all components to use `getApiUrl()` from `@/lib/queryClient` instead of hardcoded paths:

**Files Fixed:**

- `client/src/components/attendance/attendance-manager.tsx`
- `client/src/components/attendance/attendance-sheet-uploader.tsx`
- `client/src/components/attendance/student-attendance-tracker.tsx`
- `client/src/components/timetable/timetable-display.tsx`
- `client/src/components/notifications/notification-bell.tsx`
- `client/src/components/notifications/notification-system.tsx`
- `client/src/pages/profile.tsx`
- `client/src/pages/preferences.tsx`

### 2. Environment Configuration

Created environment files:

- `.env.example` - Template with instructions
- `.env.production` - Production config (needs your Render URL)

## Deployment Steps

### Step 1: Update Environment Variables

#### On Netlify (Frontend):

1. Go to your Netlify dashboard
2. Navigate to: **Site settings > Environment variables**
3. Add a new variable:
   - **Key**: `VITE_API_URL`
   - **Value**: Your Render backend URL (e.g., `https://smartcollege-server.onrender.com`)
   - **Important**: NO trailing slash!

#### On Render (Backend):

Ensure these are set in your Render environment variables:

- `NODE_ENV=production`
- `MONGODB_URI=<your-mongodb-connection-string>`
- `SESSION_SECRET=<your-secret-key>`
- `CORS_ORIGIN=<your-netlify-url>` (optional, server allows all origins currently)

### Step 2: Get Your Render Backend URL

1. Go to your Render dashboard
2. Click on your backend service (smartcollege-server)
3. Copy the URL (it looks like: `https://your-app-name.onrender.com`)
4. Use this URL as `VITE_API_URL` in Netlify

### Step 3: Update .env.production

Open `client/.env.production` and update:

```bash
VITE_API_URL=https://YOUR-ACTUAL-RENDER-URL.onrender.com
```

### Step 4: Rebuild and Deploy

#### Netlify (Frontend):

1. Commit and push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Fix API routing for production deployment"
   git push origin main
   ```
2. Netlify will automatically rebuild and deploy
3. OR manually trigger a deploy: Deploys > Trigger deploy > Deploy site

#### Render (Backend):

Your backend should already be running. If not:

1. Commit and push changes to GitHub
2. Render will automatically rebuild

### Step 5: Verify Deployment

1. Visit your Netlify site
2. Open browser DevTools (F12) > Network tab
3. Try loading students, timetable, or profile
4. Check that API calls are going to your Render URL
5. Verify responses are JSON (not HTML)

## Testing Locally

To test locally with production-like setup:

1. Create `client/.env.local`:

   ```bash
   VITE_API_URL=http://localhost:10000
   ```

2. Start backend:

   ```bash
   cd server
   npm start
   ```

3. Start frontend:
   ```bash
   cd client
   npm run dev
   ```

## Troubleshooting

### Still getting HTML responses?

- Check that `VITE_API_URL` is set correctly in Netlify
- Rebuild the Netlify site after adding the environment variable
- Check browser DevTools to see where API calls are going

### CORS errors?

- Verify your Netlify URL is allowed in backend CORS config
- Backend currently allows all origins for development

### Students/Subjects not loading?

- Check backend logs in Render dashboard
- Verify MongoDB connection
- Check that `/api/bulk-users/e1-students` endpoint exists and responds

### Profile section not opening?

- Check browser console for errors
- Verify `/api/profile` endpoint is accessible
- Ensure user is logged in (session valid)

## Important Notes

1. **Environment Variables**: Changes to Netlify environment variables require a rebuild
2. **No Trailing Slashes**: `VITE_API_URL` should NOT have a trailing slash
3. **HTTPS in Production**: Always use `https://` for production URLs
4. **Local Development**: Leave `VITE_API_URL` empty/unset locally (Vite proxy handles it)

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Netlify       │         │     Render       │
│   (Frontend)    │ ──────> │   (Backend)      │
│                 │  HTTPS  │                  │
│  React + Vite   │  calls  │   Express API    │
└─────────────────┘         └──────────────────┘
        │                            │
        │                            │
        v                            v
  Static HTML/JS               MongoDB Atlas
  + getApiUrl()              (Database)
```

## Code Changes Summary

**Before:**

```typescript
fetch("/api/students"); // Goes to same domain (Netlify) ❌
```

**After:**

```typescript
import { getApiUrl } from "@/lib/queryClient";
fetch(getApiUrl("/api/students")); // Goes to VITE_API_URL (Render) ✅
```

The `getApiUrl()` function:

- In development: Returns `/api/...` (Vite proxy forwards to localhost:10000)
- In production: Returns `${VITE_API_URL}/api/...` (Direct to Render backend)
