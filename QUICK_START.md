# 🚀 Quick Start - Fix Your Live Site in 5 Minutes

## The Problem

Your live site shows: `"<!DOCTYPE"... is not valid JSON`

**Why?** Frontend can't find your backend API.

## The Fix (5 Steps)

### 1️⃣ Get Your Render Backend URL

Visit: https://dashboard.render.com

- Find: `smartcollege-server` (or similar)
- Copy the URL (e.g., `https://smartcollege-server-abc.onrender.com`)

### 2️⃣ Set Netlify Environment Variable

Visit: https://app.netlify.com

- Go to: **Site settings → Environment variables**
- Click: **Add a variable**
- Add:
  ```
  Key:   VITE_API_URL
  Value: https://YOUR-RENDER-URL.onrender.com
  ```
  ⚠️ **No trailing slash!**

### 3️⃣ Update .env.production

Open: `client/.env.production`

Replace with YOUR Render URL:

```bash
VITE_API_URL=https://YOUR-RENDER-URL.onrender.com
```

### 4️⃣ Deploy Changes

```bash
git add .
git commit -m "Fix API routing"
git push origin main
```

Wait 2-3 minutes for Netlify to rebuild.

### 5️⃣ Test It

1. Open your live site
2. Press F12 (DevTools) → Network tab
3. Try loading students/timetable/profile
4. ✅ API calls should go to Render (not Netlify)
5. ✅ Responses should be JSON

## ✅ Success Checklist

- [ ] Copied Render backend URL
- [ ] Added `VITE_API_URL` to Netlify
- [ ] Updated `client/.env.production`
- [ ] Pushed to GitHub
- [ ] Site rebuilt on Netlify
- [ ] Students load correctly
- [ ] Profile opens
- [ ] No HTML errors in console

## 🔍 Verify Everything Works

Run this in `client/` folder:

```bash
node verify-deployment.js
```

## ⚠️ Common Mistakes

1. ❌ Forgot to set Netlify environment variable
   - **Fix:** Add it in Netlify dashboard, then rebuild

2. ❌ Added trailing slash to URL
   - **Wrong:** `https://app.onrender.com/`
   - **Right:** `https://app.onrender.com`

3. ❌ Didn't rebuild after adding env variable
   - **Fix:** Trigger manual deploy in Netlify

4. ❌ Used HTTP instead of HTTPS
   - **Wrong:** `http://app.onrender.com`
   - **Right:** `https://app.onrender.com`

## 🆘 Still Not Working?

Check these:

1. **Backend is running?**
   - Visit: `https://YOUR-RENDER-URL.onrender.com`
   - Should see: `{"status":"ok","message":"SmartCollege API Server is running"}`

2. **Environment variable is set?**
   - Netlify: Site settings → Environment variables
   - Should see: `VITE_API_URL = https://...`

3. **Site was rebuilt?**
   - Netlify: Deploys → Latest deploy should be after you added env var

4. **API calls going to right place?**
   - Browser: F12 → Network tab
   - Should see requests to Render URL (not netlify.app)

## 📚 Detailed Documentation

For more details, see:

- `FIX_SUMMARY.md` - Complete overview
- `DEPLOYMENT_FIX.md` - Step-by-step guide

## 💡 How It Works

**Before (Broken):**

```
Browser → /api/students → Netlify → ❌ HTML error
```

**After (Fixed):**

```
Browser → https://render.com/api/students → ✅ JSON data
```

---

**That's it!** Your live site should now work correctly. 🎉
