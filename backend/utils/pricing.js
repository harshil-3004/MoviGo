const CONVENIENCE_FEE_PER_SEAT = 45;
const MEMBER_DISCOUNT_RATE = 0.1;

const toPricingObject = (pricing) => {
  if (!pricing) return {};
  if (pricing instanceof Map) {
    return Object.fromEntries(pricing.entries());
  }
  if (typeof pricing.toObject === 'function') {
    return pricing.toObject();
  }
  return pricing;
};

const getRowPrice = (screen, rowLabel) => {
  const pricingObj = toPricingObject(screen?.pricing);
  const explicit = pricingObj?.[rowLabel];
  if (typeof explicit === 'number' && !Number.isNaN(explicit) && explicit >= 0) {
    return explicit;
  }

  const configuredValues = Object.values(pricingObj).filter(
    (v) => typeof v === 'number' && !Number.isNaN(v) && v >= 0
  );
  if (configuredValues.length > 0) {
    return Math.min(...configuredValues);
  }

  return ['F', 'G', 'H', 'I'].includes(rowLabel) ? 500 : 350;
};

const isActiveMembership = (user) => {
  if (!user || !user.isMember) return false;
  if (!user.membershipExpiry) return true;
  return new Date(user.membershipExpiry) > new Date();
};

const getScreenForShowtime = (showtime) => {
  const screens = showtime?.theater?.screens;
  if (!Array.isArray(screens) || screens.length === 0) return null;
  const screenNum = showtime.screenNumber || 1;
  return screens.find((s) => s.number === screenNum) || null;
};

const validateSeatsAgainstScreen = (seats, screen) => {
  if (!Array.isArray(seats) || seats.length === 0) {
    return { valid: false, message: 'At least one seat must be selected.' };
  }

  const normalized = [];
  const seen = new Set();
  for (const raw of seats) {
    if (typeof raw !== 'string' || !/^[A-Z]+\d+$/.test(raw.trim())) {
      return { valid: false, message: `Invalid seat identifier: ${raw}` };
    }
    const seatId = raw.trim();
    if (seen.has(seatId)) {
      return { valid: false, message: `Duplicate seat selection: ${seatId}` };
    }
    seen.add(seatId);
    normalized.push(seatId);
  }

  if (screen && Array.isArray(screen.layout) && screen.layout.length > 0) {
    for (const seatId of normalized) {
      const match = seatId.match(/^([A-Z]+)(\d+)$/);
      const rowIdx = match[1].charCodeAt(0) - 65;
      const colIdx = Number(match[2]) - 1;
      const row = screen.layout[rowIdx];
      const cell = row?.[colIdx];
      if (!cell || cell.type === 'aisle' || cell.isReserved) {
        return { valid: false, message: `Seat ${seatId} is unavailable.` };
      }
    }
  }

  return { valid: true, seats: normalized };
};

const calculateBookingPricing = ({ seats, showtime, user, promo = null }) => {
  const screen = getScreenForShowtime(showtime);
  const subtotal = seats.reduce((sum, seatId) => {
    const rowLabel = seatId.match(/^([A-Z]+)/)?.[1] || seatId.charAt(0);
    return sum + getRowPrice(screen, rowLabel);
  }, 0);

  const memberActive = isActiveMembership(user);
  const convenienceFee = memberActive ? 0 : seats.length * CONVENIENCE_FEE_PER_SEAT;
  const membershipDiscount = memberActive ? subtotal * MEMBER_DISCOUNT_RATE : 0;

  let promoDiscount = 0;
  if (promo) {
    promoDiscount =
      promo.type === 'percentage'
        ? subtotal * (promo.value / 100)
        : Number(promo.value) || 0;
  }

  const totalAmount = Math.max(
    0,
    Number((subtotal + convenienceFee - membershipDiscount - promoDiscount).toFixed(2))
  );

  return {
    subtotal,
    convenienceFee,
    membershipDiscount,
    promoDiscount,
    totalAmount,
  };
};

module.exports = {
  CONVENIENCE_FEE_PER_SEAT,
  MEMBER_DISCOUNT_RATE,
  getRowPrice,
  isActiveMembership,
  getScreenForShowtime,
  validateSeatsAgainstScreen,
  calculateBookingPricing,
};
