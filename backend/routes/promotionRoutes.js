const express = require('express');
const router = express.Router();
const Promotion = require('../models/Promotion');
const { verifyToken, theaterAdminOnly } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

// GET /api/promotions -> Admin gets promotions (Filtered for Theater Admins)
router.get('/', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'theater_admin') {
      const Theater = require('../models/Theater');
      const userId = new mongoose.Types.ObjectId(req.user.id);
      
      // Get theaters they are assigned to + theaters they own
      const assignedIds = (req.user.theaterIds || []).map(id => id.toString());
      const ownedTheaters = await Theater.find({ requestedBy: userId }).select('_id');
      const ownedIds = ownedTheaters.map(t => t._id.toString());
      
      const allAuthorizedIds = [...new Set([...assignedIds, ...ownedIds])].map(id => new mongoose.Types.ObjectId(id));

      query = {
        $or: [
          { scope: 'global' },
          { theaterIds: { $in: allAuthorizedIds } }
        ]
      };
    }
    const promotions = await Promotion.find(query).sort({ createdAt: -1 });
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching promotions.' });
  }
});

// GET /api/promotions/active -> Public gets active global promos for suggestions
router.get('/active', async (req, res) => {
  try {
    const now = new Date().toISOString().split('T')[0];
    const promos = await Promotion.find({
      scope: 'global',
      expiry: { $gte: now }
    }).select('code type value limit used isUnlimited');
    
    // Filter out those that reached limit
    const validPromos = promos.filter(p => p.isUnlimited || p.used < p.limit);
    res.json(validPromos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active offers' });
  }
});

// GET /api/promotions/usage-history -> Admin: get all bookings that used promo codes
router.get('/usage-history', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const bookings = await Booking.find({
      promoCode: { $ne: null, $exists: true },
      status: 'Confirmed'
    })
      .populate('user', 'name email')
      .populate({
        path: 'showtime',
        populate: [
          { path: 'movie', select: 'title' },
          { path: 'theater', select: 'name location' }
        ]
      })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching promo usage history' });
  }
});

// POST /api/promotions/validate -> Consumer validates coupon (Public)
router.post('/validate', async (req, res) => {
  const { code, theaterId } = req.body;
  try {
    const promo = await Promotion.findOne({ code: code.toUpperCase() });
    
    if (!promo) {
      return res.status(404).json({ valid: false, message: 'Invalid coupon code' });
    }
    
    // Check Expiry
    const now = new Date().toISOString().split('T')[0];
    if (promo.expiry < now) {
      return res.status(400).json({ valid: false, message: 'Coupon has expired' });
    }

    // Check Limit
    if (!promo.isUnlimited && promo.used >= promo.limit) {
      return res.status(400).json({ valid: false, message: 'Coupon limit reached' });
    }

    // CRITICAL: Check Theater Scope
    if (promo.scope === 'local' && theaterId) {
      const isApplicable = promo.theaterIds.some(id => id.toString() === theaterId);
      if (!isApplicable) {
        return res.status(400).json({ valid: false, message: 'This offer is not valid at this specific cinema branch.' });
      }
    } else if (promo.scope === 'local' && !theaterId) {
      return res.status(400).json({ valid: false, message: 'Theater validation required for this offer.' });
    }

    res.json({ 
      valid: true, 
      discountPercent: promo.type === 'percentage' ? promo.value : null, 
      flatDiscount: promo.type === 'flat' ? promo.value : null 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error validating promo', error: error.message });
  }
});

// POST /api/promotions -> Create a new promotion (Admin or Theater Admin)
router.post('/', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    const { code, type, value, limit, expiry, scope, theaterIds } = req.body;
    
    // If theater admin, force local scope and their theaters
    let finalScope = scope || 'global';
    let finalTheaters = theaterIds || [];

    if (req.user.role === 'theater_admin') {
      finalScope = 'local';
      // If they provided theaters, ensure they are authorized for them
      const authorizedIds = (req.user.theaterIds || []).map(id => id.toString());
      finalTheaters = (theaterIds || []).filter(id => authorizedIds.includes(id));
      
      // If they didn't provide any, default to all their authorized theaters
      if (finalTheaters.length === 0) {
        finalTheaters = authorizedIds;
      }
    }

    const newPromo = new Promotion({
      code: code.toUpperCase(),
      type,
      value,
      limit,
      expiry,
      scope: finalScope,
      theaterIds: finalTheaters.map(id => new mongoose.Types.ObjectId(id))
    });
    
    const saved = await newPromo.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating promo', error: error.message });
  }
});

// PUT /api/promotions/:id -> Update a promotion (Admin or Theater Admin)
router.put('/:id', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    const { code, type, value, limit, expiry, scope, theaterIds } = req.body;
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Promotion not found' });

    // Authorization check for theater admins
    if (req.user.role === 'theater_admin') {
      const authorizedIds = (req.user.theaterIds || []).map(id => id.toString());
      // Can only edit if they have access to at least one of the theaters currently in the promo
      const hasAccess = (promo.theaterIds || []).some(id => authorizedIds.includes(id.toString()));
      if (!hasAccess && promo.scope !== 'global') {
        return res.status(403).json({ message: 'Not authorized to edit this promotion.' });
      }
    }

    const updated = await Promotion.findByIdAndUpdate(req.params.id, {
      code: code.toUpperCase(),
      type,
      value,
      limit,
      expiry,
      scope,
      theaterIds: scope === 'global' ? [] : (theaterIds || []).map(id => new mongoose.Types.ObjectId(id))
    }, { new: true });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating promo', error: error.message });
  }
});

// DELETE /api/promotions/:id -> Delete a promotion (Admin Only)
router.delete('/:id', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    await Promotion.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Promotion deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error deleting promo', error: error.message });
  }
});

module.exports = router;
