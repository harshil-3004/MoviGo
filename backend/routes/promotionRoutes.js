const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Promotion = require('../models/Promotion');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const { verifyToken, theaterAdminOnly } = require('../middleware/authMiddleware');
const { formatLocalDate, isValidISODate } = require('../utils/dateUtils');
const { isAdminRole, getAuthorizedTheaterIds } = require('../utils/authHelpers');

// GET /api/promotions -> Admin gets promotions (Filtered for Theater Admins)
router.get('/', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    let query = {};
    if (!isAdminRole(req.user.role)) {
      const { objectIds } = await getAuthorizedTheaterIds(req.user.id, req.user.theaterIds);
      query = {
        $or: [
          { scope: 'global' },
          { theaterIds: { $in: objectIds } }
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
    const todayStr = formatLocalDate(new Date());
    const promos = await Promotion.find({
      scope: 'global',
      expiry: { $gte: todayStr }
    }).select('code type value limit used isUnlimited');

    const validPromos = promos.filter((p) => p.isUnlimited || p.used < p.limit);
    res.json(validPromos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active offers' });
  }
});

// GET /api/promotions/usage-history -> Admin: get bookings that used promo codes
router.get('/usage-history', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    const query = {
      promoCode: { $ne: null, $exists: true },
      status: 'Confirmed'
    };

    if (!isAdminRole(req.user.role)) {
      const { objectIds } = await getAuthorizedTheaterIds(req.user.id, req.user.theaterIds);
      const showtimeIds = await Showtime.find({ theater: { $in: objectIds } }).distinct('_id');
      query.showtime = { $in: showtimeIds };
    }

    const bookings = await Booking.find(query)
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
  const { code, theaterId } = req.body || {};
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ valid: false, message: 'Coupon code is required' });
  }

  try {
    const promo = await Promotion.findOne({ code: code.trim().toUpperCase() });
    if (!promo) {
      return res.status(404).json({ valid: false, message: 'Invalid coupon code' });
    }

    const todayStr = formatLocalDate(new Date());
    if (promo.expiry < todayStr) {
      return res.status(400).json({ valid: false, message: 'Coupon has expired' });
    }

    if (!promo.isUnlimited && promo.used >= promo.limit) {
      return res.status(400).json({ valid: false, message: 'Coupon limit reached' });
    }

    if (promo.scope === 'local') {
      if (!theaterId) {
        return res.status(400).json({ valid: false, message: 'Theater validation required for this offer.' });
      }
      const isApplicable = promo.theaterIds.some((id) => id.toString() === theaterId.toString());
      if (!isApplicable) {
        return res.status(400).json({ valid: false, message: 'This offer is not valid at this specific cinema branch.' });
      }
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
    const { code, type, value, limit, isUnlimited, expiry, scope, theaterIds } = req.body || {};

    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ message: 'Promo code is required' });
    }
    if (!['percentage', 'flat'].includes(type)) {
      return res.status(400).json({ message: 'Invalid promo type' });
    }
    const numValue = Number(value);
    if (Number.isNaN(numValue) || numValue <= 0 || (type === 'percentage' && numValue > 100)) {
      return res.status(400).json({ message: 'Invalid promo discount value' });
    }
    if (!isValidISODate(expiry)) {
      return res.status(400).json({ message: 'Valid expiry date (YYYY-MM-DD) is required' });
    }

    let finalScope = scope === 'local' ? 'local' : 'global';
    let finalTheaters = Array.isArray(theaterIds) ? theaterIds.map(String) : [];

    if (!isAdminRole(req.user.role)) {
      finalScope = 'local';
      const { stringIds } = await getAuthorizedTheaterIds(req.user.id, req.user.theaterIds);
      finalTheaters = finalTheaters.filter((id) => stringIds.includes(id));
      if (finalTheaters.length === 0) {
        finalTheaters = stringIds;
      }
      if (finalTheaters.length === 0) {
        return res.status(403).json({ message: 'No authorized theaters found to attach local promo.' });
      }
    }

    const newPromo = new Promotion({
      code: code.trim().toUpperCase(),
      type,
      value: numValue,
      limit: isUnlimited ? 0 : Math.max(1, Number(limit) || 100),
      isUnlimited: Boolean(isUnlimited),
      expiry,
      scope: finalScope,
      theaterIds: finalScope === 'global'
        ? []
        : finalTheaters.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id))
    });

    const saved = await newPromo.save();
    res.status(201).json(saved);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A promotion with this code already exists' });
    }
    res.status(500).json({ message: 'Server Error creating promo', error: error.message });
  }
});

// PUT /api/promotions/:id -> Update a promotion (Admin or Authorized Theater Admin)
router.put('/:id', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    const { code, type, value, limit, isUnlimited, expiry, scope, theaterIds } = req.body || {};
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Promotion not found' });

    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ message: 'Promo code is required' });
    }
    if (!['percentage', 'flat'].includes(type)) {
      return res.status(400).json({ message: 'Invalid promo type' });
    }
    const numValue = Number(value);
    if (Number.isNaN(numValue) || numValue <= 0 || (type === 'percentage' && numValue > 100)) {
      return res.status(400).json({ message: 'Invalid promo discount value' });
    }
    if (!isValidISODate(expiry)) {
      return res.status(400).json({ message: 'Valid expiry date (YYYY-MM-DD) is required' });
    }

    let finalScope = scope === 'local' ? 'local' : 'global';
    let finalTheaters = Array.isArray(theaterIds) ? theaterIds.map(String) : [];

    if (!isAdminRole(req.user.role)) {
      if (promo.scope === 'global') {
        return res.status(403).json({ message: 'Only Super Admins can edit global promotions.' });
      }
      const { stringIds } = await getAuthorizedTheaterIds(req.user.id, req.user.theaterIds);
      const hasAccess = (promo.theaterIds || []).some((id) => stringIds.includes(id.toString()));
      if (!hasAccess) {
        return res.status(403).json({ message: 'Not authorized to edit this promotion.' });
      }
      finalScope = 'local';
      finalTheaters = finalTheaters.filter((id) => stringIds.includes(id));
      if (finalTheaters.length === 0) {
        return res.status(400).json({ message: 'At least one authorized theater must be selected.' });
      }
    }

    const updated = await Promotion.findByIdAndUpdate(
      req.params.id,
      {
        code: code.trim().toUpperCase(),
        type,
        value: numValue,
        limit: isUnlimited ? 0 : Math.max(1, Number(limit) || 100),
        isUnlimited: Boolean(isUnlimited),
        expiry,
        scope: finalScope,
        theaterIds: finalScope === 'global'
          ? []
          : finalTheaters.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id))
      },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A promotion with this code already exists' });
    }
    res.status(500).json({ message: 'Server Error updating promo', error: error.message });
  }
});

// DELETE /api/promotions/:id -> Delete a promotion (Admin or Authorized Theater Admin)
router.delete('/:id', verifyToken, theaterAdminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Promotion not found' });

    if (!isAdminRole(req.user.role)) {
      if (promo.scope === 'global') {
        return res.status(403).json({ message: 'Only Super Admins can delete global promotions.' });
      }
      const { stringIds } = await getAuthorizedTheaterIds(req.user.id, req.user.theaterIds);
      const hasAccess = (promo.theaterIds || []).some((id) => stringIds.includes(id.toString()));
      if (!hasAccess) {
        return res.status(403).json({ message: 'Not authorized to delete this promotion.' });
      }
    }

    await Promotion.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Promotion deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error deleting promo', error: error.message });
  }
});

module.exports = router;
