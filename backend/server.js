const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the uploads directory with safe headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Database Connection
const { connectDB } = require('./utils/db');
connectDB();

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
app.use('/api/chat', require('./routes/chatRoutes'));

// Socket.io Auth & Presence Logic
const onlineUsers = new Map(); // userId -> Set<socketId>

const emitToUser = (userId, event, payload) => {
  const sockets = onlineUsers.get(String(userId));
  if (!sockets) return;
  for (const sid of sockets) {
    io.to(sid).emit(event, payload);
  }
};

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('./models/User');
    const user = await User.findById(decoded.user.id).select('_id role');
    if (!user || !['admin', 'master_admin', 'theater_admin'].includes(user.role)) {
      return next(new Error('Insufficient chat privileges'));
    }
    socket.userId = user._id.toString();
    next();
  } catch {
    next(new Error('Invalid authentication token'));
  }
});

io.on('connection', (socket) => {
  const authedUserId = socket.userId;

  const addPresence = (uid) => {
    if (!uid) return;
    if (!onlineUsers.has(uid)) {
      onlineUsers.set(uid, new Set());
    }
    onlineUsers.get(uid).add(socket.id);
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  };

  addPresence(authedUserId);

  socket.on('register', () => {
    addPresence(authedUserId);
  });

  socket.on('sendMessage', async (data) => {
    try {
      if (!data || typeof data !== 'object') return;
      const { receiver, text, fileUrl, fileType } = data;
      const trimmedText = typeof text === 'string' ? text.trim() : '';
      if (!receiver || !mongoose.Types.ObjectId.isValid(receiver)) return;
      if (!trimmedText && !fileUrl) return;

      const Message = require('./models/Message');
      const newMessage = new Message({
        sender: authedUserId,
        receiver,
        text: trimmedText,
        fileUrl: typeof fileUrl === 'string' ? fileUrl : null,
        fileType: typeof fileType === 'string' ? fileType : null,
        read: false
      });
      await newMessage.save();

      const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name profilePhoto role');

      emitToUser(receiver, 'receiveMessage', populatedMessage);
      emitToUser(authedUserId, 'receiveMessage', populatedMessage);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  });

  socket.on('markAsRead', async ({ senderId } = {}) => {
    try {
      if (!senderId || !mongoose.Types.ObjectId.isValid(senderId)) return;
      const Message = require('./models/Message');
      await Message.updateMany(
        { sender: senderId, receiver: authedUserId, read: false },
        { $set: { read: true } }
      );
      emitToUser(senderId, 'messagesRead', { receiverId: authedUserId });
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  });

  socket.on('typing', ({ receiver } = {}) => {
    if (!receiver) return;
    emitToUser(receiver, 'typing', { sender: authedUserId });
  });

  socket.on('stopTyping', ({ receiver } = {}) => {
    if (!receiver) return;
    emitToUser(receiver, 'stopTyping', { sender: authedUserId });
  });

  socket.on('disconnect', () => {
    const sockets = onlineUsers.get(authedUserId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(authedUserId);
      }
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server up and running on port ${PORT}`);
});

