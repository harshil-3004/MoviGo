export const CONVENIENCE_FEE_PER_SEAT = 45;
export const MEMBER_DISCOUNT_RATE = 0.1;

export const BOOKING_AVAILABILITY_AFTER_MINUTES = 45;
export const PAYMENT_GRACE_AFTER_CUTOFF_MINUTES = 5;
export const FINAL_PAYMENT_DEADLINE_AFTER_MINUTES =
  BOOKING_AVAILABILITY_AFTER_MINUTES + PAYMENT_GRACE_AFTER_CUTOFF_MINUTES;

export const formatMinutesToTime = (totalMinutes) => {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
};

export const evaluateBookingWindow = (showDate, showTime, now = new Date()) => {
  if (
    !showDate ||
    typeof showDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(showDate) ||
    !showTime ||
    typeof showTime !== 'string' ||
    !/^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(showTime.trim())
  ) {
    return {
      valid: false,
      canBook: false,
      canPay: false,
      hasStarted: false,
    };
  }

  const [y, m, d] = showDate.split('-').map(Number);
  const startMinutes = parseTimeToMinutes(showTime);
  const showStart = new Date(
    y,
    m - 1,
    d,
    Math.floor(startMinutes / 60),
    startMinutes % 60,
    0,
    0
  );
  const bookingCutoff = new Date(
    showStart.getTime() + BOOKING_AVAILABILITY_AFTER_MINUTES * 60 * 1000
  );
  const finalPaymentDeadline = new Date(
    showStart.getTime() + FINAL_PAYMENT_DEADLINE_AFTER_MINUTES * 60 * 1000
  );
  const nowMs = new Date(now).getTime();

  return {
    valid: true,
    showStart,
    bookingCutoff,
    finalPaymentDeadline,
    cutoffFormatted: formatMinutesToTime(startMinutes + BOOKING_AVAILABILITY_AFTER_MINUTES),
    finalDeadlineFormatted: formatMinutesToTime(
      startMinutes + FINAL_PAYMENT_DEADLINE_AFTER_MINUTES
    ),
    hasStarted: nowMs >= showStart.getTime(),
    canBook: nowMs <= bookingCutoff.getTime(),
    canPay: nowMs <= finalPaymentDeadline.getTime(),
  };
};

export const formatLocalDate = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalISODate = (isoStr) => {
  if (!isoStr || typeof isoStr !== 'string') return null;
  const parts = isoStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
};

export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const trimmed = timeStr.trim();
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let h = Number(ampmMatch[1]);
    const m = Number(ampmMatch[2]);
    const period = ampmMatch[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const [hStr, mStr] = trimmed.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

export const getScreenForShowtime = (fullShowtime) => {
  const screens = fullShowtime?.theater?.screens;
  if (!Array.isArray(screens) || screens.length === 0) return null;
  const screenNumber = fullShowtime.screenNumber || 1;
  return screens.find((s) => s.number === screenNumber) || null;
};

export const getRowPrice = (screen, rowLabel) => {
  const pricing = screen?.pricing;
  if (pricing && typeof pricing === 'object') {
    const explicit = pricing[rowLabel];
    if (typeof explicit === 'number' && !Number.isNaN(explicit) && explicit >= 0) {
      return explicit;
    }
    const configured = Object.values(pricing).filter(
      (v) => typeof v === 'number' && !Number.isNaN(v) && v >= 0
    );
    if (configured.length > 0) {
      return Math.min(...configured);
    }
  }
  return ['F', 'G', 'H', 'I'].includes(rowLabel) ? 500 : 350;
};

export const calculateSeatsSubtotal = (selectedSeats, fullShowtime) => {
  if (!Array.isArray(selectedSeats) || selectedSeats.length === 0) return 0;
  const screen = getScreenForShowtime(fullShowtime);
  return selectedSeats.reduce((sum, seatId) => {
    const rowLabel = seatId.match(/^([A-Z]+)/)?.[1] || seatId.charAt(0);
    return sum + getRowPrice(screen, rowLabel);
  }, 0);
};

export const isActiveMembership = (user) => {
  if (!user || !user.isMember) return false;
  if (!user.membershipExpiry) return true;
  return new Date(user.membershipExpiry) > new Date();
};

export const toYouTubeEmbedUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return trimmed;
};

export const validatePasswordStrength = (password) => {
  if (typeof password !== 'string') return false;
  return (
    password.length >= 6 &&
    /[A-Z]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>_]/.test(password) &&
    /[a-zA-Z]/.test(password) &&
    /\d/.test(password)
  );
};
