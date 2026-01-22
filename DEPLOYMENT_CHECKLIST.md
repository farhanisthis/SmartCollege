# 📋 Deployment Checklist

Use this checklist to ensure your live site is properly configured.

## Pre-Deployment Checklist

### Backend (Render)

- [ ] Backend service is created on Render
- [ ] Service is deployed and running (check Render dashboard)
- [ ] Environment variables are set:
  - [ ] `NODE_ENV=production`
  - [ ] `MONGODB_URI=<your-mongodb-uri>`
  - [ ] `SESSION_SECRET=<random-secret>`
  - [ ] `PORT=10000` (or leave default)
- [ ] Copy your Render backend URL (e.g., `https://smartcollege-xyz.onrender.com`)
- [ ] Test backend is accessible: Visit the URL in browser, should see `{"status":"ok"...}`

### Frontend (Netlify)

- [ ] Site is connected to your GitHub repository
- [ ] Build settings are correct:
  - Base directory: `client`
  - Build command: `npm run build`
  - Publish directory: `client/dist`

## Code Changes Checklist

- [ ] All API calls use `getApiUrl()` (no hardcoded `/api/...` paths)
- [ ] `client/.env.production` exists and has correct Render URL
- [ ] `client/.env.production` has NO trailing slash
- [ ] `client/.gitignore` is configured to keep `.env.production` in git
- [ ] Changes are committed to GitHub

### Verify Code Changes

Run this in the `client/` folder:

```bash
node verify-deployment.js
```

All checks should pass ✅

## Environment Variable Setup

### Netlify Dashboard

- [ ] Go to: Site settings → Environment variables
- [ ] Add variable:
  - Key: `VITE_API_URL`
  - Value: `https://your-render-backend.onrender.com`
  - Scopes: All scopes
- [ ] NO trailing slash in the URL!

### Double-Check

- [ ] Variable name is exactly `VITE_API_URL` (case-sensitive)
- [ ] Value starts with `https://` (not `http://`)
- [ ] Value ends with `.onrender.com` (no `/` at end)
- [ ] Value is your actual Render backend URL

## Deployment Checklist

- [ ] Code changes committed and pushed to GitHub
- [ ] Netlify environment variable is set
- [ ] Trigger new Netlify deployment (automatic or manual)
- [ ] Wait for deployment to complete (~2-3 minutes)
- [ ] Check deployment logs for errors

## Testing Checklist

### Test Backend Connection

1. [ ] Open `test-api-connection.html` in browser
2. [ ] Enter your Render backend URL
3. [ ] Click "Test Connection"
4. [ ] All endpoints show "Online" ✅

### Test Live Site

1. [ ] Visit your Netlify site URL
2. [ ] Open browser DevTools (F12)
3. [ ] Go to Network tab
4. [ ] Navigate through the site:
   - [ ] Students page loads
   - [ ] Timetable displays
   - [ ] Profile section opens
   - [ ] Attendance loads
5. [ ] Check Network tab:
   - [ ] API calls go to Render (not Netlify)
   - [ ] Responses are JSON (not HTML)
   - [ ] No red/failed requests
6. [ ] Check Console tab:
   - [ ] No "<!DOCTYPE" errors
   - [ ] No "Unexpected token '<'" errors
   - [ ] No CORS errors

## Success Indicators ✅

All of these should be true:

- [ ] ✅ Backend test shows all endpoints online
- [ ] ✅ Students list loads on live site
- [ ] ✅ Latest subjects appear in timetable
- [ ] ✅ Profile section opens without errors
- [ ] ✅ Attendance page works correctly
- [ ] ✅ No HTML errors in browser console
- [ ] ✅ Network tab shows API calls to Render
- [ ] ✅ All API responses are JSON format

## Troubleshooting Checklist

If something isn't working, check:

### Backend Not Responding

- [ ] Render service is running (not sleeping)
- [ ] Render logs show no errors
- [ ] MongoDB is connected
- [ ] Environment variables are set on Render

### Frontend Getting HTML Errors

- [ ] `VITE_API_URL` is set in Netlify
- [ ] Netlify site was rebuilt after adding env var
- [ ] `.env.production` has correct URL
- [ ] No typos in environment variable name

### CORS Errors

- [ ] Backend CORS is configured (should allow all origins)
- [ ] Using HTTPS (not HTTP) in production
- [ ] Cookies/credentials are being sent

### 404 Errors on API Calls

- [ ] API routes are registered in server
- [ ] Render backend has all route files
- [ ] Backend deployment succeeded

## Common Mistakes to Avoid ⚠️

- [ ] ❌ Trailing slash in `VITE_API_URL`
- [ ] ❌ Using `http://` instead of `https://`
- [ ] ❌ Typo in environment variable name
- [ ] ❌ Forgot to rebuild Netlify after adding env var
- [ ] ❌ Old browser cache (do hard refresh: Ctrl+Shift+R)
- [ ] ❌ Backend service is sleeping (wake it up)

## Final Verification

Run through this sequence:

1. [ ] Open incognito/private browser window
2. [ ] Visit your Netlify site
3. [ ] Open DevTools (F12)
4. [ ] Try to login/use the app
5. [ ] Watch Network tab - all API calls should:
   - Go to your Render URL ✅
   - Return JSON responses ✅
   - Have 200 or 401 status (not 404) ✅

## Documentation References

If you need more help:

- **Quick fix**: [QUICK_START.md](QUICK_START.md)
- **What changed**: [FIX_SUMMARY.md](FIX_SUMMARY.md)
- **Detailed guide**: [DEPLOYMENT_FIX.md](DEPLOYMENT_FIX.md)
- **Test backend**: [test-api-connection.html](test-api-connection.html)

## Support Commands

```bash
# Verify configuration
cd client
node verify-deployment.js

# Check for hardcoded API calls
cd client/src
grep -r "fetch(\"/api/" .

# Test backend manually
curl https://your-backend.onrender.com
curl https://your-backend.onrender.com/api/bulk-users/e1-students

# Clear Netlify cache and rebuild
# (Do this in Netlify dashboard: Deploys → Trigger deploy → Clear cache and deploy site)
```

---

## ✅ All Done!

When every checkbox is checked, your live site should be working perfectly! 🎉

**Last Updated**: January 2026
