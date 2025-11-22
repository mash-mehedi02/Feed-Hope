# FeedHope v2.0 - Modern Food Donation Platform

**Complete Node.js/Express Backend + React Frontend Implementation**

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [API Documentation](#api-documentation)
5. [Frontend Pages](#frontend-pages)
6. [Database Schema](#database-schema)
7. [Testing](#testing)
8. [Deployment](#deployment)

---

## 🎯 Overview

FeedHope is a modern, secure food donation platform connecting:
- **Donors**: Post food donations
- **Volunteers**: Accept and manage donations
- **Delivery Persons**: Pick up and deliver food

### Key Features

✅ **Modern Architecture**: Node.js/Express backend with React frontend  
✅ **Secure Authentication**: JWT-based auth with role separation  
✅ **Database Security**: Parameterized queries, proper separation  
✅ **File Uploads**: Image uploads with validation (3MB limit)  
✅ **Location System**: Bangladesh divisions/districts/areas  
✅ **Notifications**: Real-time in-app notifications  
✅ **Status Workflow**: `available` → `pending` → `ongoing` → `delivered`  
✅ **Race Condition Prevention**: Optimistic locking for concurrent access  
✅ **Responsive UI**: Modern, professional design

---

## 🏗️ Architecture

### Backend Structure
```
server/
├── controllers/          # Business logic handlers
│   ├── authController.js
│   └── foodController.js
├── middleware/           # Auth, roles, uploads
│   ├── authMiddleware.js
│   ├── roleGuard.js
│   └── upload.js
├── routes/              # API route definitions
│   ├── auth.js
│   ├── food.js
│   ├── donor.js
│   ├── volunteer.js
│   ├── delivery.js
│   ├── notifications.js
│   └── locations.js
├── database/            # SQL scripts
│   ├── schema.sql
│   └── locations_seed.sql
├── scripts/             # Utility scripts
│   └── seed.js
├── uploads/             # Uploaded files
│   ├── food_images/
│   └── avatars/
├── .env.example         # Environment template
├── package.json
└── server.js            # Main server file
```

### Frontend Structure (React)
```
frontend/
├── src/
│   ├── pages/           # Single-file page components
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── DonorDashboard.jsx
│   │   ├── VolunteerDashboard.jsx
│   │   └── DeliveryDashboard.jsx
│   ├── components/      # Reusable components
│   ├── utils/           # API calls, helpers
│   ├── styles/          # Global styles
│   └── App.jsx
├── package.json
└── vite.config.js       # Or similar build config
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** >= 16.0.0
- **MySQL** >= 5.7 or **MariaDB** >= 10.3
- **npm** >= 8.0.0

### Step 1: Database Setup

```bash
# 1. Create MySQL database
mysql -u root -p

# 2. Import schema
mysql -u root -p feedhope < server/database/schema.sql

# 3. Import locations
mysql -u root -p feedhope < server/database/locations_seed.sql
```

### Step 2: Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# Update: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET

# Start server (development)
npm run dev

# Or start server (production)
npm start
```

**Expected Output:**
```
✅ Database connected successfully!
   Host: localhost:3306
   Database: feedhope

🚀 FeedHope Server Started!
   Environment: development
   Server: http://localhost:3000
   API Base: http://localhost:3000/api
   Health Check: http://localhost:3000/health
```

### Step 3: Seed Sample Data (Optional)

```bash
# Run seed script
cd server
node scripts/seed.js
```

**Test Accounts Created:**
- **Donor**: `donor@feedhope.com` / `password123`
- **Volunteer**: `volunteer@feedhope.com` / `password123`
- **Delivery**: `delivery@feedhope.com` / `password123`

### Step 4: Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Expected Output:**
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication

All protected routes require JWT token in header:
```
Authorization: Bearer <token>
```

### Standard Response Format

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response Format

```json
{
  "success": false,
  "message": "Error message"
}
```

### API Endpoints

#### **Auth Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/me` | Get current user | Yes |

#### **Food Endpoints**

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/api/food` | Create food donation | Donor |
| GET | `/api/food/my-donations` | Get my donations | Donor |
| GET | `/api/food/available` | Get available donations | Volunteer |
| POST | `/api/food/:id/accept-volunteer` | Accept as volunteer | Volunteer |
| GET | `/api/food/pending-delivery` | Get pending deliveries | Delivery |
| POST | `/api/food/:id/accept-delivery` | Accept as delivery | Delivery |
| POST | `/api/food/:id/deliver` | Mark as delivered | Delivery |

#### **Profile Endpoints**

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/donors/profile` | Get donor profile | Donor |
| PATCH | `/api/donors/profile` | Update donor profile | Donor |
| GET | `/api/volunteers/profile` | Get volunteer profile | Volunteer |
| PATCH | `/api/volunteers/profile` | Update volunteer profile | Volunteer |
| GET | `/api/delivery/profile` | Get delivery profile | Delivery |
| PATCH | `/api/delivery/profile` | Update delivery profile | Delivery |

#### **Notifications Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/notifications` | Get notifications | Yes |
| PATCH | `/api/notifications/:id/read` | Mark as read | Yes |
| PATCH | `/api/notifications/read-all` | Mark all as read | Yes |

#### **Locations Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/locations/divisions` | Get divisions | No |
| GET | `/api/locations/districts/:division` | Get districts | No |
| GET | `/api/locations/areas/:district` | Get areas (with search) | No |

---

## 🎨 Frontend Pages

### Page Structure (Single File Per Screen)

Each page is a self-contained React component with:
- Component logic
- Styles (CSS-in-JS or separate CSS)
- API integration
- State management
- Form handling

### Example Pages

See `frontend/src/pages/` for:
- `LoginPage.jsx` - User login
- `RegisterPage.jsx` - User registration
- `DonorDashboard.jsx` - Donor dashboard
- `VolunteerDashboard.jsx` - Volunteer feed
- `DeliveryDashboard.jsx` - Delivery dashboard
- `ProfilePage.jsx` - User profile

---

## 🗄️ Database Schema

### Core Tables

1. **users**: Unified user accounts with roles
2. **donors**: Donor-specific profiles
3. **volunteers**: Volunteer/NGO profiles
4. **delivery_persons**: Delivery person profiles
5. **food_donations**: Food donation records
6. **notifications**: User notifications
7. **food_history**: Status change history
8. **locations**: Bangladesh divisions/districts/areas

### Status Workflow

```
available → (volunteer accept) → pending → (delivery accept) → ongoing → (delivery complete) → delivered
```

---

## 🧪 Testing

### Manual Testing Checklist

#### **1. Registration & Login**
- [ ] Register as donor
- [ ] Register as volunteer
- [ ] Register as delivery
- [ ] Login with each role
- [ ] Verify token is returned
- [ ] Verify profile is returned

#### **2. Food Donation Flow**
- [ ] Donor creates food donation
- [ ] Volunteer sees available donations
- [ ] Volunteer accepts donation (status: `pending`)
- [ ] Delivery person sees pending in same area
- [ ] Delivery person accepts (status: `ongoing`)
- [ ] Delivery person marks delivered (status: `delivered`)
- [ ] Notifications sent to donor and volunteer

#### **3. Profile Management**
- [ ] Get profile for each role
- [ ] Update profile (name, phone, location)
- [ ] Upload avatar image
- [ ] Verify stats are correct

#### **4. Notifications**
- [ ] Notifications appear after events
- [ ] Mark notification as read
- [ ] Mark all as read
- [ ] Unread count is correct

### API Testing (Postman/cURL)

See `TEST_CHECKLIST.md` for detailed curl commands.

---

## 📦 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Use strong `JWT_SECRET` (32+ chars, random)
- [ ] Configure database with production credentials
- [ ] Set up SSL/TLS (HTTPS)
- [ ] Configure CORS for production domain
- [ ] Set up file storage (S3 or similar for uploads)
- [ ] Configure rate limiting
- [ ] Set up logging
- [ ] Configure backup for database
- [ ] Set up monitoring

---

## 🔒 Security Features

✅ **JWT Authentication**: Secure token-based auth  
✅ **Role-based Access Control**: Strict role separation  
✅ **Parameterized Queries**: SQL injection prevention  
✅ **Input Validation**: Server-side validation for all inputs  
✅ **File Upload Validation**: Type, size limits  
✅ **Rate Limiting**: DDoS protection  
✅ **Helmet**: Security headers  
✅ **CORS**: Configured origins only  
✅ **Password Hashing**: bcrypt with salt rounds

---

## 📞 Support

For issues or questions:
1. Check `TEST_CHECKLIST.md` for common issues
2. Review API documentation above
3. Check server logs for errors
4. Verify database connection
5. Ensure all environment variables are set

---

## 📝 License

MIT License - See LICENSE file

---

**Built with ❤️ for FeedHope**

