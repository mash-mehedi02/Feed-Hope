# FeedHope 🌟
## Modern Food Donation Platform

<div align="center">
  <img src="img/coverimage.jpeg" alt="FeedHope Cover" width="800" style="border-radius: 10px;"/>
  
  [![React](https://img.shields.io/badge/React-18.0-blue.svg)](https://reactjs.org/)
  [![Firebase](https://img.shields.io/badge/Firebase-9.0-orange.svg)](https://firebase.google.com/)
  [![Vite](https://img.shields.io/badge/Vite-5.0-purple.svg)](https://vitejs.dev/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

---

## 📖 Overview

**FeedHope** is a comprehensive, modern web-based food donation platform designed to bridge the gap between food donors, volunteers (NGOs/Charities), and delivery personnel. The platform addresses food waste management while ensuring efficient distribution to those in need across Bangladesh.

### 🎯 Mission

To create a seamless connection between food donors and those in need, reducing food waste and ensuring efficient distribution through a modern, user-friendly platform.

---

## ✨ Key Features

### 🏠 Multi-Role System
- **Donor Dashboard** - Easy food donation posting with image upload
- **Volunteer Dashboard** - Accept donations and manage requests
- **Delivery Dashboard** - Track and deliver orders with route visualization

### 🗺️ Location & Mapping
- Interactive maps with Leaflet.js
- Real-time route visualization (OSRM API)
- Reverse geocoding for address lookup
- Delivery route tracking

### 📸 Image Management
- Cloudinary integration for image uploads
- Automatic image optimization
- Secure cloud storage

### 🔐 Security
- Firebase Authentication
- Role-based access control
- Secure data handling
- Protected routes

### 📱 Responsive Design
- Mobile-friendly interface
- Modern, professional UI/UX
- Cross-browser compatibility

---

## 🖼️ Screenshots

### Dashboard Overview
<div align="center">
  <img src="img/Screenshot%20(484).png" alt="Dashboard Screenshot" width="800" style="border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/>
</div>

### Donation Interface
<div align="center">
  <img src="img/Screenshot%20(485).png" alt="Donation Screenshot" width="800" style="border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/>
</div>

### Map Integration
<div align="center">
  <img src="img/Screenshot%20(486).png" alt="Map Screenshot" width="800" style="border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/>
</div>

### Profile & History
<div align="center">
  <img src="img/Screenshot%20(487).png" alt="Profile Screenshot" width="800" style="border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/>
</div>

### Delivery Tracking
<div align="center">
  <img src="img/Screenshot%20(488).png" alt="Delivery Screenshot" width="800" style="border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/>
</div>

---

## 🛠️ Technologies

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **React Hooks** - State management
- **Leaflet** - Interactive maps
- **React Icons** - Icon library
- **Date-fns** - Date formatting

### Backend & Services
- **Firebase Authentication** - User authentication
- **Cloud Firestore** - Real-time NoSQL database
- **Cloudinary** - Image storage and optimization
- **Firebase Storage** - File storage

### External APIs
- **OSRM API** - Route calculation
- **Nominatim API** - Reverse geocoding
- **OpenStreetMap** - Map tiles

### Deployment
- **Vercel** - Frontend hosting
- **Firebase Hosting** - Alternative deployment

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────┐
│         Frontend (React)             │
│  - Donor Dashboard                   │
│  - Volunteer Dashboard               │
│  - Delivery Dashboard                │
│  - Authentication                    │
└──────────────┬──────────────────────┘
               │
               │ Firebase SDK
               │
┌──────────────▼──────────────────────┐
│      Firebase Services               │
│  - Authentication                    │
│  - Firestore Database                │
│  - Cloud Storage                     │
└──────────────┬──────────────────────┘
               │
               │
┌──────────────▼──────────────────────┐
│    External Services                 │
│  - Cloudinary (Images)               │
│  - OSRM (Routes)                     │
│  - OpenStreetMap (Maps)              │
└──────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Firebase Account** (free tier available)
- **Cloudinary Account** (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mash-mehedi02/Feed-Hope.git
   cd Feed-Hope
   ```

2. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Configure Environment Variables**
   
   Create a `.env` file in the `frontend` directory:
   ```env
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:5173
   ```

---

## 📚 Project Structure

```
FeedHope/
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   ├── firebase/         # Firebase config
│   │   └── App.jsx           # Main app component
│   ├── public/               # Static assets
│   └── package.json
├── img/                      # Images and screenshots
├── DEPLOYMENT.md            # Deployment guide
├── PROJECT_REPORT.md        # Detailed project report
└── README.md                # This file
```

---

## 👥 User Roles

### 🎁 Donor
- Create food donations with images
- Track donation status
- Contribute to volunteer requests
- View donation history
- Update profile

### 🤝 Volunteer (NGO/Charity)
- View available donations
- Accept donations
- Create food requests
- Manage delivery orders
- Track contribution history

### 🚚 Delivery Person
- View available delivery orders
- Accept delivery requests
- Track routes on map
- Mark deliveries as complete
- View delivery history

---

## 🔄 Workflow

```
1. Donor creates donation
   ↓
2. Admin approves donation
   ↓
3. Volunteer accepts donation
   ↓
4. Delivery person accepts delivery
   ↓
5. Delivery person picks up food
   ↓
6. Delivery person delivers to recipient
   ↓
7. Order marked as delivered
   ↓
8. History added to all profiles
```

---

## 🌐 Deployment

### Vercel Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

**Quick Deploy:**
1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy!

**Live Demo:** [Your Vercel URL]

---

## 📖 Documentation

- **Full Project Report**: [PROJECT_REPORT.md](PROJECT_REPORT.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Firebase Setup**: [FIREBASE_SETUP.md](FIREBASE_SETUP.md)

---

## 🔒 Security Features

- ✅ Firebase Authentication
- ✅ Role-based access control
- ✅ Secure API endpoints
- ✅ Input validation
- ✅ Image upload security
- ✅ Environment variable protection

---

## 🎨 UI/UX Features

- ✅ Modern, professional design
- ✅ Responsive layout
- ✅ Intuitive navigation
- ✅ Real-time updates
- ✅ Interactive maps
- ✅ Loading states
- ✅ Error handling
- ✅ Mobile-optimized

---

## 📊 Tech Stack Summary

| Category | Technology |
|----------|-----------|
| **Frontend Framework** | React 18 |
| **Build Tool** | Vite |
| **Routing** | React Router DOM |
| **State Management** | React Hooks |
| **Database** | Firebase Firestore |
| **Authentication** | Firebase Auth |
| **Image Storage** | Cloudinary |
| **Maps** | Leaflet.js |
| **Icons** | React Icons |
| **Deployment** | Vercel |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**FeedHope Development Team**

- GitHub: [@mash-mehedi02](https://github.com/mash-mehedi02)
- Project Link: [https://github.com/mash-mehedi02/Feed-Hope](https://github.com/mash-mehedi02/Feed-Hope)

---

## 🙏 Acknowledgments

- Firebase for backend services
- Cloudinary for image management
- OpenStreetMap for map data
- OSRM for routing services
- All contributors and supporters

---

<div align="center">
  <strong>Made with ❤️ for reducing food waste</strong>
  <br>
  🌟 Star this repo if you find it helpful! 🌟
</div>
