const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
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
app.use('/api/chat', require('./routes/chatRoutes'));

// Socket.io Logic
const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('User connected to chat:', socket.id);

  socket.on('register', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  });

  socket.on('sendMessage', async (data) => {
    try {
      const { sender, receiver, text, fileUrl, fileType } = data;
      const Message = require('./models/Message');
      
      const newMessage = new Message({
        sender,
        receiver,
        text: text || '',
        fileUrl: fileUrl || null,
        fileType: fileType || null,
        read: false
      });
      await newMessage.save();
      
      const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name profilePhoto role');

      const receiverSocketId = onlineUsers.get(receiver);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receiveMessage', populatedMessage);
      }
      // Also send back to sender so their UI updates
      socket.emit('receiveMessage', populatedMessage);
      
    } catch (err) {
      console.error('Error sending message:', err);
    }
  });

  socket.on('markAsRead', async ({ senderId, receiverId }) => {
    try {
      const Message = require('./models/Message');
      await Message.updateMany(
        { sender: senderId, receiver: receiverId, read: false },
        { $set: { read: true } }
      );
      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messagesRead', { receiverId });
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  });

  socket.on('typing', ({ sender, receiver }) => {
    const receiverSocketId = onlineUsers.get(receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing', { sender });
    }
  });

  socket.on('stopTyping', ({ sender, receiver }) => {
    const receiverSocketId = onlineUsers.get(receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('stopTyping', { sender });
    }
  });

  socket.on('disconnect', () => {
    let disconnectedUserId = null;
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        break;
      }
    }
    if (disconnectedUserId) {
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    }
    console.log('User disconnected from chat:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server up and running on port ${PORT}`);
});
