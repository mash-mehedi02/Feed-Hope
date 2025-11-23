# 🔍 Verify Environment Variables in Vercel

## Step-by-Step Verification

### Step 1: Check Vercel Dashboard

1. Go to **Vercel Dashboard** → Your Project
2. Click **Settings** → **Environment Variables**
3. Look for these **exact** names (case-sensitive):
   - `VITE_CLOUDINARY_CLOUD_NAME`
   - `VITE_CLOUDINARY_UPLOAD_PRESET`

4. For **each** variable, check:
   - ✅ Variable name is **exactly** as shown (no typos)
   - ✅ Value is set correctly
   - ✅ **All Environments** is selected (Production, Preview, Development)

### Step 2: Check Build Logs

1. **Vercel Dashboard** → Your Project
2. **Deployments** tab
3. Click on **Latest deployment**
4. Click **Build Logs** tab
5. Search for: `VITE_CLOUDINARY`

**Expected:** Should see environment variables being used during build

**If NOT found:**
- Variables might not be properly set
- Try deleting and re-adding variables

### Step 3: Delete and Re-add Variables

Sometimes variables don't get picked up. Try this:

1. **Delete both variables:**
   - Settings → Environment Variables
   - Click ⋯ next to each variable
   - Delete

2. **Re-add them:**
   - Click "Add New"
   - Name: `VITE_CLOUDINARY_CLOUD_NAME`
   - Value: `d15yejhdh`
   - Select: **All Environments** (Production, Preview, Development)
   - Save

   - Click "Add New" again
   - Name: `VITE_CLOUDINARY_UPLOAD_PRESET`
   - Value: `feed_hope`
   - Select: **All Environments**
   - Save

3. **Redeploy:**
   - Deployments → Latest → ⋯ → Redeploy
   - Wait for build to complete

### Step 4: Check Browser Console

After redeploy:

1. Open deployed site
2. Press **F12** → Console tab
3. You should now see debug logs:
   ```
   🔍 Cloudinary Environment Variables Check: {
     cloudName: "✅ Found" or "❌ Missing",
     uploadPreset: "✅ Found" or "❌ Missing",
     allEnvKeys: [...]
   }
   ```

4. If you see "❌ Missing", check what's in `allEnvKeys`

### Step 5: Verify Variable Names

**Common mistakes:**
- ❌ `VITE_CLOUDINARY_CLOUDNAME` (missing underscore)
- ❌ `VITE_CLOUDINARY_CLOUD_NAME` (extra space)
- ❌ `CLOUDINARY_CLOUD_NAME` (missing VITE_ prefix)
- ❌ `Vite_Cloudinary_Cloud_Name` (wrong case)

**Correct:**
- ✅ `VITE_CLOUDINARY_CLOUD_NAME`
- ✅ `VITE_CLOUDINARY_UPLOAD_PRESET`

## 🎯 Quick Test

In browser console (F12), type:

```javascript
console.log('Cloud Name:', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);
console.log('Upload Preset:', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
console.log('All Env:', import.meta.env);
```

**Expected output:**
```
Cloud Name: d15yejhdh
Upload Preset: feed_hope
```

**If shows `undefined`:**
- Environment variables not loaded
- Need to check Vercel settings and redeploy

## ⚠️ Important Notes

1. **VITE_ prefix is REQUIRED** - Vite only exposes variables starting with `VITE_`
2. **Case-sensitive** - Variable names must match exactly
3. **All Environments** - Make sure variables are set for all environments
4. **Redeploy required** - After adding/changing variables, must redeploy

## 🔧 Still Not Working?

1. **Check Vercel Build Logs** for any errors
2. **Try deleting and re-adding** environment variables
3. **Verify Cloudinary preset** exists and is unsigned
4. **Check browser console** for the debug logs we just added
5. **Share the console output** so we can diagnose further

