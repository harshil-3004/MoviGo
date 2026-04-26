const jwt = require('jsonwebtoken');

const verifyToken = async (req, res, next) => {
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Hydrate with fresh DB data
    const User = require('../models/User');
    const freshUser = await User.findById(decoded.user.id).select('-password');
    
    if (!freshUser) {
      return res.status(401).json({ message: 'User record no longer exists' });
    }

    // SELF-HEALING: If theaterIds is a string or missing, convert to Array for multi-theater support
    if (typeof freshUser.theaterIds === 'string' || !freshUser.theaterIds) {
      console.log(`Migrating legacy theater data for ${freshUser.name}...`);
      const oldId = freshUser.theaterIds;
      freshUser.theaterIds = oldId ? [oldId] : [];
      await freshUser.save();
    }

    req.user = {
      id: freshUser._id.toString(),
      role: freshUser.role,
      theaterIds: freshUser.theaterIds,
      name: freshUser.name,
      email: freshUser.email
    };
    
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Admin Only Middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admins only' });
  }
};

// Theater Admin or Admin Middleware
const theaterAdminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'theater_admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Higher privileges required' });
  }
};

module.exports = { verifyToken, adminOnly, theaterAdminOnly };
