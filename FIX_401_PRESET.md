# 🔧 Fix: 401 Error with Upload Preset

## 🔴 Error

```
Unauthorized (401): Check if upload preset 'food_donate' exists and is set to 'Unsigned' mode
```

**Meaning:** The preset exists, but Cloudinary is rejecting the upload request.

## 🔍 Troubleshooting Checklist

### Step 1: Verify Preset Exists

1. Go to **Cloudinary Dashboard** → **Settings** → **Upload**
2. Scroll to **"Upload presets"** section
3. Check if `food_donate` appears in the list
4. **If it doesn't exist:** Create it following Step 2

### Step 2: Check Preset Mode

In the preset list, check:
- Does `food_donate` show **"Unsigned"** mode? (Should be a red/orange tag)
- If it shows **"Signed"**, that's the problem!

### Step 3: Edit Preset Settings

1. Click on `food_donate` preset to **edit** it
2. Scroll through ALL settings and check:

   **Critical Settings:**
   - ✅ **Signing Mode:** Must be **"Unsigned"** (dropdown at top)
   - ✅ **Access Mode:** Should be **"Public"**
   
   **Security Settings (scroll down):**
   - ✅ **Allowed origins:** Should be **EMPTY** or include your domain
   - ✅ **Signed URL:** Should be **Off** (if this option exists)
   - ✅ **API key restrictions:** Should be **None** or **Unrestricted**

### Step 4: Delete and Recreate (If Still Not Working)

If settings look correct but still getting 401:

1. **Delete the preset:**
   - Click ⋯ next to `food_donate`
   - Delete
   - Confirm

2. **Create fresh preset:**
   - Click **"+ Add Upload Preset"**
   - **Name:** `food_donate` (exact)
   - **Signing Mode:** Select **"Unsigned"** ⚠️ (VERY IMPORTANT)
   - **Asset Folder:** `feedhope/food_images`
   - **Access Mode:** `Public`
   - **Allowed Origins:** Leave **EMPTY** (blank)
   - **All other settings:** Default
   - **Save**

3. **Wait 1-2 minutes** after saving

### Step 5: Test in Cloudinary Dashboard

1. Go to **Media Library**
2. Click **"Upload"**
3. Select an image
4. In **"Upload preset"** dropdown, select `food_donate`
5. Click **"Upload"**

**If this fails:**
- The preset configuration is wrong
- Try creating with a different name to test

**If this works:**
- Preset is correct
- Wait 1-2 minutes for propagation
- Test in your app

### Step 6: Check Cloud Name

Verify your Cloud Name is correct:
1. Dashboard → **Product Environment**
2. Check **Cloud name:** Should be `dl5yejhdh`
3. If different, update code

## ⚠️ Common Issues

1. **Preset shows "Unsigned" but still requires auth:**
   - Delete and recreate
   - Make absolutely sure it's "Unsigned" when creating

2. **Allowed origins restriction:**
   - Clear this field completely
   - Don't add any domains unless necessary

3. **Preset created but not active:**
   - Wait 1-2 minutes after creation
   - Cloudinary needs time to activate

4. **Wrong cloud name:**
   - Double-check: `dl5yejhdh` is correct
   - Must match exactly in Cloudinary dashboard

## 🎯 Quick Test

After fixing, test in Cloudinary Dashboard first:
- If upload works there → Preset is correct
- If upload fails there → Preset configuration wrong

Then test in your app.

---

**Most likely fix: Delete preset completely and recreate it with "Unsigned" mode!**

