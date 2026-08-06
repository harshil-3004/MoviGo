const mongoose = require('mongoose');
const dns = require('dns');

/**
 * Configure DNS servers to resolve MongoDB Atlas SRV records properly
 * especially in environments (like Windows) where default DNS fails with querySrv ECONNREFUSED
 */
const configureDns = () => {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch (err) {
    console.warn('⚠️ Could not set custom DNS servers:', err.message);
  }
};

const connectDB = async () => {
  configureDns();
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/MoviGo';
  console.log('Attempting to connect to MongoDB at:', mongoUri);
  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    // If Atlas SRV failed, attempt local fallback if available
    if (mongoUri.includes('mongodb+srv://')) {
      console.log('Attempting fallback connection to local MongoDB (mongodb://127.0.0.1:27017/MoviGo)...');
      try {
        const localConn = await mongoose.connect('mongodb://127.0.0.1:27017/MoviGo');
        console.log(`✅ MongoDB Connected to Local Fallback: ${localConn.connection.host}`);
        return localConn;
      } catch (localErr) {
        console.error('❌ Local Fallback Failed:', localErr.message);
      }
    }
    throw err;
  }
};

module.exports = { connectDB, configureDns };
