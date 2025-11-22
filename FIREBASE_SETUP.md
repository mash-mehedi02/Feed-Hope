# 🔥 FeedHope - Firebase Setup Guide

## Complete React + Firebase Implementation

This guide will help you convert FeedHope to use **React + Firebase** instead of Node.js/MySQL.

---

## 📋 Prerequisites

1. **Node.js** >= 16.0.0
2. **Firebase Account** (free tier available)
3. **npm** or **yarn**

---

## 🚀 Step 1: Create Firebase Project

### 1.1 Go to Firebase Console
1. Visit: https://console.firebase.google.com/
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `feedhope` (or your preferred name)
4. Continue through setup steps
5. Disable Google Analytics (optional) or enable if you want
6. Click **"Create project"**

### 1.2 Register Web App
1. In Firebase Console, click **"Web"** icon (`</>`)
2. Register app nickname: `FeedHope Web`
3. Check **"Also set up Firebase Hosting"** (optional)
4. Click **"Register app"**
5. **Copy the Firebase configuration object** - you'll need this!

---

## 🔧 Step 2: Install Dependencies

```bash
cd C:\xampp\htdocs\FeedHope

# Create React app (if not already created)
npx create-react-app frontend
cd frontend

# Install Firebase SDK
npm install firebase

# Install React Router (for navigation)
npm install react-router-dom

# Install additional dependencies
npm install @tanstack/react-query  # For data fetching
npm install date-fns  # For date formatting
```

---

## ⚙️ Step 3: Configure Firebase

### 3.1 Update Firebase Config

1. Open `firebase/config.js`
2. Replace placeholder values with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3.2 Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **"Get started"**
3. Enable **"Email/Password"** provider
4. Click **"Save"**

### 3.3 Set Up Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll add rules later)
4. Select a location (choose closest to your users)
5. Click **"Enable"**

### 3.4 Set Up Storage

1. In Firebase Console, go to **Storage**
2. Click **"Get started"**
3. Start in **"test mode"**
4. Choose same location as Firestore
5. Click **"Done"**

---

## 📝 Step 4: Deploy Firestore Rules

### 4.1 Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 4.2 Login to Firebase

```bash
firebase login
```

### 4.3 Initialize Firebase in Project

```bash
cd C:\xampp\htdocs\FeedHope
firebase init
```

**Select:**
- ✅ Firestore
- ✅ Storage
- ✅ Hosting (optional)

**Configure:**
- Use existing project: Select your Firebase project
- Firestore rules file: `firebase/firestore.rules`
- Firestore indexes file: `firebase/firestore.indexes.json`
- Storage rules file: `firebase/storage.rules`
- Public directory: `frontend/build`

### 4.4 Deploy Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage

# Deploy indexes
firebase deploy --only firestore:indexes
```

---

## 🗄️ Step 5: Import Initial Data

### 5.1 Add Locations Data

1. In Firebase Console, go to **Firestore Database**
2. Click **"Start collection"**
3. Collection ID: `locations`
4. Add documents manually OR use Firebase Console import

**Or use Firebase CLI:**

```bash
# Export from MySQL (if you have existing data)
# Then import to Firestore using a script

# Or manually add sample locations:
# Collection: locations
# Document ID: dhaka_mirpur1
# Fields:
#   - area (string): "Mirpur 1"
#   - district (string): "Dhaka"
#   - division (string): "Dhaka"
#   - latitude (number): 23.8075
#   - longitude (number): 90.3586
```

### 5.2 Create Test Users (Optional)

You can create test users through the React app registration, or manually:

1. Go to **Authentication** → **Users**
2. Click **"Add user"**
3. Enter email and password
4. After user is created, go to **Firestore** and add user document:
   - Collection: `users`
   - Document ID: `{userId}` (from Authentication)
   - Fields:
     ```json
     {
       "email": "donor@feedhope.com",
       "role": "donor",
       "emailVerified": true,
       "profileId": "{userId}"
     }
     ```
   - Also create profile in `donors` collection with same ID

---

## 🎨 Step 6: Update React App Structure

### 6.1 Update Import Paths

Update all service imports to use Firebase:

```javascript
// OLD (Node.js API)
import { loginUser } from './services/api';

// NEW (Firebase)
import { loginUser } from './services/firebaseAuth';
```

### 6.2 Update Components

Replace API calls with Firebase service calls:

**Example - Login Component:**

```javascript
import { loginUser } from '../services/firebaseAuth';

const handleLogin = async (e) => {
  e.preventDefault();
  const result = await loginUser(email, password, role);
  
  if (result.success) {
    // Navigate to dashboard
    navigate(`/${role}/dashboard`);
  } else {
    setError(result.message);
  }
};
```

---

## 📱 Step 7: Run React App

```bash
cd frontend
npm start
```

The app will open at: `http://localhost:3000`

---

## ✅ Step 8: Verify Setup

### Test Authentication

1. Open app: `http://localhost:3000`
2. Register a new account
3. Login with credentials
4. Check Firebase Console → Authentication → Users (should see new user)

### Test Firestore

1. Create a food donation
2. Check Firebase Console → Firestore Database
3. Verify `food_donations` collection has new document

### Test Storage

1. Upload an image when creating donation
2. Check Firebase Console → Storage
3. Verify file in `food_images/` folder

---

## 📊 Database Structure (Firestore)

### Collections

1. **users** - User accounts
   ```
   userId: {
     email: string,
     role: 'donor' | 'volunteer' | 'delivery',
     emailVerified: boolean,
     profileId: string,
     createdAt: timestamp,
     updatedAt: timestamp
   }
   ```

2. **donors** - Donor profiles
   ```
   profileId (same as userId): {
     userId: string,
     name: string,
     phone: string,
     gender: string,
     division: string,
     district: string,
     area: string,
     address: string,
     avatar: string (URL),
     createdAt: timestamp,
     updatedAt: timestamp
   }
   ```

3. **volunteers** - Volunteer profiles
   ```
   profileId (same as userId): {
     userId: string,
     name: string,
     organizationName: string,
     phone: string,
     division: string,
     district: string,
     area: string,
     address: string,
     avatar: string (URL),
     verified: boolean,
     createdAt: timestamp,
     updatedAt: timestamp
   }
   ```

4. **delivery_persons** - Delivery person profiles
   ```
   profileId (same as userId): {
     userId: string,
     name: string,
     phone: string,
     division: string,
     district: string,
     area: string,
     address: string,
     vehicleType: string,
     avatar: string (URL),
     availabilityStatus: 'available' | 'busy' | 'offline',
     createdAt: timestamp,
     updatedAt: timestamp
   }
   ```

5. **food_donations** - Food donation records
   ```
   donationId: {
     donorId: string,
     foodName: string,
     foodType: string,
     category: string,
     quantity: string,
     description: string,
     foodImage: string (URL),
     pickupAddress: string,
     pickupDivision: string,
     pickupDistrict: string,
     pickupArea: string,
     pickupLatitude: number,
     pickupLongitude: number,
     pickupAddressFull: string,
     contactPhone: string,
     status: 'available' | 'pending' | 'ongoing' | 'delivered',
     volunteerId: string | null,
     deliveryPersonId: string | null,
     deliveryAddress: string | null,
     deliveryDivision: string | null,
     deliveryDistrict: string | null,
     deliveryArea: string | null,
     deliveryLatitude: number | null,
     deliveryLongitude: number | null,
     deliveryAddressFull: string | null,
     volunteerAcceptedAt: timestamp | null,
     deliveryAcceptedAt: timestamp | null,
     deliveredAt: timestamp | null,
     rejectionReason: string | null,
     createdAt: timestamp,
     updatedAt: timestamp
   }
   ```

6. **notifications** - User notifications
   ```
   notificationId: {
     userId: string,
     userRole: 'donor' | 'volunteer' | 'delivery',
     type: string,
     title: string,
     message: string,
     relatedId: string,
     relatedType: string,
     isRead: boolean,
     createdAt: timestamp
   }
   ```

7. **food_history** - Status change history
   ```
   historyId: {
     donationId: string,
     statusFrom: string | null,
     statusTo: string,
     changedById: string,
     changedByRole: 'donor' | 'volunteer' | 'delivery',
     changedByName: string | null,
     notes: string | null,
     createdAt: timestamp
   }
   ```

8. **locations** - Bangladesh locations
   ```
   locationId: {
     division: string,
     district: string,
     area: string,
     latitude: number,
     longitude: number,
     createdAt: timestamp
   }
   ```

---

## 🔒 Security Rules Summary

- **Users**: Can read/update own data
- **Profiles**: Can read all, create/update own
- **Food Donations**: 
  - Read: All authenticated users
  - Create: Donors only
  - Update: Based on status workflow
  - Delete: Donors only (own donations)
- **Notifications**: Users can only read/update own
- **Storage**: Authenticated users can upload (3MB limit, images only)

---

## 🚀 Deployment

### Deploy to Firebase Hosting

```bash
# Build React app
cd frontend
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

Your app will be live at: `https://YOUR_PROJECT_ID.web.app`

---

## 📚 Files Created

1. `firebase/config.js` - Firebase configuration
2. `firebase/firestore.rules` - Database security rules
3. `firebase/storage.rules` - Storage security rules
4. `firebase/firestore.indexes.json` - Database indexes
5. `src/services/firebaseAuth.js` - Authentication functions
6. `src/services/firebaseFood.js` - Food donation functions

---

## 🔄 Migration from MySQL to Firebase

### Key Differences

1. **No Backend Server**: Everything is client-side
2. **Real-time Updates**: Firestore provides real-time listeners
3. **File Storage**: Firebase Storage instead of local uploads
4. **Authentication**: Firebase Auth instead of JWT
5. **Database**: Firestore (NoSQL) instead of MySQL (SQL)

### Benefits

✅ No server maintenance  
✅ Automatic scaling  
✅ Real-time sync  
✅ Built-in authentication  
✅ Free tier generous  
✅ Easy deployment  

---

## 📞 Support

- **Firebase Docs**: https://firebase.google.com/docs
- **Firestore Docs**: https://firebase.google.com/docs/firestore
- **React + Firebase**: https://firebase.google.com/docs/web/setup

---

**🎉 Your FeedHope app is now powered by Firebase!**

