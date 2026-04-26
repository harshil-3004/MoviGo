# 🎬 MoviGo - Modern Cinema Experience

MoviGo is a premium, full-stack MERN (MongoDB, Express, React, Node.js) application designed for modern cinema management. It features a stunning glassmorphic UI, a robust booking system, and a comprehensive administrative suite.

## 🚀 Key Features
- **Smart Booking**: Interactive seat selection with real-time locking.
- **Scanner Station**: QR-code based entry validation for admins.
- **Loyalty Program**: Reward points system with a dedicated redemption store.
- **Admin Dashboard**: Full CRUD for movies, theaters, showtimes, and users.
- **Secure PDFs**: Server-side generated professional tickets and receipts.

---

## 🛠️ Installation & Setup

### 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js** (v18+)
- **MongoDB Community Server** (Running on port 27017)

### 2. Install Dependencies
Open your terminal in the root directory and run:
```bash
npm run install-all
```

### 3. Environment Configuration
Navigate to the `backend` folder and create a `.env` file (you can copy `.env.example`).
Fill in your configuration:
- `PORT=5000`
- `MONGO_URI=mongodb://127.0.0.1:27017/moviegoo`
- `JWT_SECRET=your_secret_key`

### 4. Seed Initial Data
To populate the database with demo movies, theaters, and admins:
```bash
npm run seed
```

### 5. Run the Project
Start both the frontend and backend with a single command:
```bash
npm start
```

The app will be available at:
- **Frontend**: `http://localhost:5173`
- **Backend**: `http://localhost:5000`

---

## 🔑 Default Credentials (After Seeding)
- **Super Admin**: `admin@movigo.com` / `admin123`
- **Theater Manager**: `manager@cinema.com` / `manager123`
- **Test User**: `user@test.com` / `user123`

---

© 2026 MoviGo Systems. All rights reserved.
