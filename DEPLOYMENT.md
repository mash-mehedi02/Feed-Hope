# FeedHope - Vercel Deployment Guide

## 📦 Deploy to Vercel

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Sign up/Login to Vercel**
   - Go to [https://vercel.com](https://vercel.com)
   - Sign up with GitHub account (easiest)

2. **Import Repository**
   - Click "Add New..." → "Project"
   - Select "Import Git Repository"
   - Connect your GitHub account if not already connected
   - Select `mash-mehedi02/Feed-Hope` repository

3. **Configure Project Settings**
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Environment Variables** (Important!)
   Add these in Vercel dashboard under "Environment Variables":
   
   ```
   VITE_FIREBASE_API_KEY=AIzaSyDBWyAaRX0QB-Wsg4FdpkYwcUeeNotnVjw
   VITE_FIREBASE_AUTH_DOMAIN=feedhope-6f775.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=feedhope-6f775
   VITE_FIREBASE_STORAGE_BUCKET=feedhope-6f775.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=895269062804
   VITE_FIREBASE_APP_ID=1:895269062804:web:81515392df0318b3ec0c81
   VITE_FIREBASE_MEASUREMENT_ID=G-1VTBMD9Y8L
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-project-name.vercel.app`

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Navigate to frontend folder**
   ```bash
   cd frontend
   ```

4. **Deploy**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project? No
   - Project name: feedhope (or your preferred name)
   - Directory: ./
   - Override settings: No

5. **Set Environment Variables**
   ```bash
   vercel env add VITE_FIREBASE_API_KEY
   vercel env add VITE_FIREBASE_AUTH_DOMAIN
   vercel env add VITE_FIREBASE_PROJECT_ID
   vercel env add VITE_FIREBASE_STORAGE_BUCKET
   vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
   vercel env add VITE_FIREBASE_APP_ID
   vercel env add VITE_FIREBASE_MEASUREMENT_ID
   ```

6. **Deploy to Production**
   ```bash
   vercel --prod
   ```

### ⚙️ Environment Variables Setup

For production, you should use environment variables instead of hardcoding Firebase config.

**Update `frontend/src/firebase/config.js`:**
```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
```

**Then in Vercel Dashboard → Settings → Environment Variables, add:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

### 🔧 Firebase Configuration

Make sure your Firebase project allows requests from your Vercel domain:

1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your Vercel domain: `your-project.vercel.app`
3. Also add `your-project.vercel.app` to Firestore and Storage rules if needed

### 📝 Post-Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Firebase authorized domains updated
- [ ] Test authentication (login/register)
- [ ] Test file uploads (images)
- [ ] Test database operations (Firestore)
- [ ] Test all user roles (Donor, Volunteer, Delivery)
- [ ] Check console for errors
- [ ] Test on mobile devices

### 🚀 Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update Firebase authorized domains with your custom domain

### 📱 Build Settings Summary

- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node Version**: 18.x or higher (Vercel auto-detects)

### 🐛 Troubleshooting

**Build Fails:**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors if using TS

**Environment Variables Not Working:**
- Make sure variables start with `VITE_` prefix
- Redeploy after adding variables
- Check variable names match exactly

**Firebase Errors:**
- Verify Firebase config values
- Check Firebase console for quotas/limits
- Verify authorized domains

**404 Errors on Routes:**
- Ensure `vercel.json` has correct rewrites
- Check SPA routing is configured

### 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#vercel)
- [Firebase Web Setup](https://firebase.google.com/docs/web/setup)

