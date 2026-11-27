/**
 * Format a Date object into a local YYYY-MM-DD string (avoiding UTC day-shift bugs).
 */
const formatLocalDate = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Validate YYYY-MM-DD string represents an actual calendar date.
 */
const isValidISODate = (dateStr) => {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return (
    parsed.getUTCFullYear() === y &&
    parsed.getUTCMonth() === m - 1 &&
    parsed.getUTCDate() === d
  );
};

/**
 * Parse "HH:MM" or "H:MM AM/PM" into minutes since midnight.
 */
const parseTimeToMinutes = (timeStr) => {
  if (typeof timeStr !== 'string' || !timeStr.trim()) return 0;
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

/**
 * Format minutes since midnight into "H:MM AM/PM" (modulo 24h).
 */
const formatMinutesToTime = (totalMinutes) => {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
};

const TICKET_SCAN_LEAD_MINUTES = 15;
const TICKET_SCAN_WINDOW_AFTER_MINUTES = 150; // 2.5 hours after show start

const BOOKING_AVAILABILITY_AFTER_MINUTES = 45; // Visible & bookable until 45 mins after showtime
const PAYMENT_GRACE_AFTER_CUTOFF_MINUTES = 5; // Additional 5 mins after booking cutoff
const FINAL_PAYMENT_DEADLINE_AFTER_MINUTES =
  BOOKING_AVAILABILITY_AFTER_MINUTES + PAYMENT_GRACE_AFTER_CUTOFF_MINUTES; // 50 mins after showtime

/**
 * Parse (showDate 'YYYY-MM-DD', showTime 'HH:MM' | 'H:MM AM/PM') into local Date + startMinutes.
 */
const parseShowtimeDateTime = (showDate, showTime) => {
  if (
    !isValidISODate(showDate) ||
    typeof showTime !== 'string' ||
    !/^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(showTime.trim())
  ) {
    return null;
  }
  const startMinutes = parseTimeToMinutes(showTime);
  const [year, month, day] = showDate.split('-').map(Number);
  const showStart = new Date(
    year,
    month - 1,
    day,
    Math.floor(startMinutes / 60),
    startMinutes % 60,
    0,
    0
  );
  return { showStart, startMinutes };
};

/**
 * Evaluate showtime visibility, booking initiation cutoff (+45m), and final payment deadline (+50m).
 * Example (12:30 PM show):
 *  - Visible & booking initiated allowed until 1:15 PM (showStart + 45m)
 *  - Additional 5-minute payment grace period until 1:20 PM (showStart + 50m)
 */
const evaluateBookingWindow = (showDate, showTime, now = new Date()) => {
  const parsed = parseShowtimeDateTime(showDate, showTime);
  if (!parsed) {
    return {
      valid: false,
      canBook: false,
      canPay: false,
      message: 'Showtime date or time is missing or invalid.',
    };
  }

  const { showStart, startMinutes } = parsed;
  const bookingCutoff = new Date(
    showStart.getTime() + BOOKING_AVAILABILITY_AFTER_MINUTES * 60 * 1000
  );
  const finalPaymentDeadline = new Date(
    showStart.getTime() + FINAL_PAYMENT_DEADLINE_AFTER_MINUTES * 60 * 1000
  );
  const nowTime = new Date(now).getTime();

  const cutoffFormatted = formatMinutesToTime(startMinutes + BOOKING_AVAILABILITY_AFTER_MINUTES);
  const finalDeadlineFormatted = formatMinutesToTime(
    startMinutes + FINAL_PAYMENT_DEADLINE_AFTER_MINUTES
  );

  const canBook = nowTime <= bookingCutoff.getTime();
  const canPay = nowTime <= finalPaymentDeadline.getTime();

  return {
    valid: true,
    showStart,
    bookingCutoff,
    finalPaymentDeadline,
    cutoffFormatted,
    finalDeadlineFormatted,
    canBook,
    canPay,
    bookClosedMessage: `Booking is closed. Bookings are only allowed until 45 minutes after showtime (${cutoffFormatted} for the ${showTime} show).`,
    paymentExpiredMessage: `Final payment deadline (${finalDeadlineFormatted}) has passed. Unconfirmed bookings are marked failed and seats released.`,
  };
};

/**
 * Evaluate whether ticket scanning/verification is allowed for (showDate, showTime) at `now`.
 * Window opens 15 minutes before show start and ends 2.5 hours (150 minutes) after show start.
 */
const evaluateTicketScanWindow = (showDate, showTime, now = new Date()) => {
  if (
    !isValidISODate(showDate) ||
    typeof showTime !== 'string' ||
    !/^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(showTime.trim())
  ) {
    return {
      allowed: false,
      reason: 'invalid',
      message: 'Showtime date or time is missing or invalid.',
    };
  }

  const startMinutes = parseTimeToMinutes(showTime);
  const [year, month, day] = showDate.split('-').map(Number);
  const showStart = new Date(
    year,
    month - 1,
    day,
    Math.floor(startMinutes / 60),
    startMinutes % 60,
    0,
    0
  );

  const windowStart = new Date(showStart.getTime() - TICKET_SCAN_LEAD_MINUTES * 60 * 1000);
  const windowEnd = new Date(showStart.getTime() + TICKET_SCAN_WINDOW_AFTER_MINUTES * 60 * 1000);
  const current = new Date(now);
  const nowTime = current.getTime();
  const todayStr = formatLocalDate(current);

  const opensAtDate = formatLocalDate(windowStart);
  const opensAtTime = formatMinutesToTime(startMinutes - TICKET_SCAN_LEAD_MINUTES);
  const closesAtDate = formatLocalDate(windowEnd);
  const closesAtTime = formatMinutesToTime(startMinutes + TICKET_SCAN_WINDOW_AFTER_MINUTES);

  if (nowTime < windowStart.getTime()) {
    const minutesUntilOpen = Math.max(1, Math.ceil((windowStart.getTime() - nowTime) / 60000));
    const sameOpenDay = opensAtDate === todayStr;
    return {
      allowed: false,
      reason: 'too_early',
      showStart,
      windowStart,
      windowEnd,
      message: sameOpenDay
        ? `Scanning opens 15 mins before show start at ${opensAtTime} (in ${minutesUntilOpen} min for the ${showTime} show).`
        : `This ticket is for ${showDate} at ${showTime}. Verification opens on ${opensAtDate} at ${opensAtTime} (15 mins before show start).`,
    };
  }

  if (nowTime > windowEnd.getTime()) {
    const sameCloseDay = closesAtDate === todayStr;
    return {
      allowed: false,
      reason: 'expired',
      showStart,
      windowStart,
      windowEnd,
      message: sameCloseDay
        ? `Ticket verification window has ended. Scanning closed at ${closesAtTime} (2.5 hrs after the ${showTime} show start).`
        : `Ticket verification window has ended. Scanning closed on ${closesAtDate} at ${closesAtTime} (2.5 hrs after show start).`,
    };
  }

  return {
    allowed: true,
    reason: 'open',
    showStart,
    windowStart,
    windowEnd,
  };
};

module.exports = {
  formatLocalDate,
  isValidISODate,
  parseTimeToMinutes,
  formatMinutesToTime,
  TICKET_SCAN_LEAD_MINUTES,
  TICKET_SCAN_WINDOW_AFTER_MINUTES,
  evaluateTicketScanWindow,
  BOOKING_AVAILABILITY_AFTER_MINUTES,
  PAYMENT_GRACE_AFTER_CUTOFF_MINUTES,
  FINAL_PAYMENT_DEADLINE_AFTER_MINUTES,
  parseShowtimeDateTime,
  evaluateBookingWindow,
};
