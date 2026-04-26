const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
console.log('Attempting to connect to MongoDB at:', process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB Connected Logically'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MoviGo API Server is Running' });
});

// API Routes
app.use('/api/movies', require('./routes/movieRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/theaters', require('./routes/theaterRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/promotions', require('./routes/promotionRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/showtimes', require('./routes/showtimeRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/scan', require('./routes/scanRoutes'));
app.use('/api/otp', require('./routes/otpRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server up and running on port ${PORT}`);
});
