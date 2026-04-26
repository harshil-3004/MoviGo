import { createSlice } from '@reduxjs/toolkit';

const bookingSlice = createSlice({
  name: 'booking',
  initialState: {
    movieId: null,
    showtime: { theater: null, date: null, time: null },
    selectedSeats: [],
    lockTimer: 0,
    pendingBookingId: null,
    isCheckoutLocked: false,
    couponApplied: null,
    status: 'idle', // idle, locked, confirmed
  },
  reducers: {
    setCheckoutLocked: (state, action) => {
      state.isCheckoutLocked = action.payload;
    },
    setPendingBookingId: (state, action) => {
      state.pendingBookingId = action.payload;
    },
    startBooking: (state, action) => {
      state.movieId = action.payload.movieId;
    },
    setShowtime: (state, action) => {
      const isSameShowtime = state.showtime?.showtimeId === action.payload.showtimeId;
      state.showtime = action.payload;
      // Always clear seats, pending booking, and coupon when starting a new selection
      state.selectedSeats = [];
      state.pendingBookingId = null;
      state.couponApplied = null;
      state.status = 'idle';
    },
    toggleSeat: (state, action) => {
      const seatId = action.payload;
      if (state.selectedSeats.includes(seatId)) {
        state.selectedSeats = state.selectedSeats.filter(s => s !== seatId);
      } else {
        state.selectedSeats.push(seatId);
      }
      state.pendingBookingId = null; // Clear if seats change
    },
    clearSeats: (state) => {
      state.selectedSeats = [];
      state.pendingBookingId = null;
    },
    lockSeats: (state, action) => {
      state.lockTimer = action.payload;
      state.status = 'locked';
    },
    applyCoupon: (state, action) => {
      state.couponApplied = action.payload;
    },
    removeCoupon: (state) => {
      state.couponApplied = null;
    },
    confirmBooking: (state) => {
      // Full reset after a successful booking — allows clean rebooking
      state.status = 'confirmed';
      state.lockTimer = 0;
      state.pendingBookingId = null;
      state.selectedSeats = [];
      state.couponApplied = null;
      // Keep movieId/showtime so Ticket page can still read them briefly
    },
    resetBooking: (state) => {
      state.movieId = null;
      state.showtime = { theater: null, date: null, time: null };
      state.selectedSeats = [];
      state.lockTimer = 0;
      state.pendingBookingId = null;
      state.couponApplied = null;
      state.status = 'idle';
    }
  },
});

export const { 
  startBooking, setShowtime, toggleSeat, clearSeats, 
  lockSeats, applyCoupon, removeCoupon, confirmBooking, 
  resetBooking, setPendingBookingId, setCheckoutLocked
} = bookingSlice.actions;
export default bookingSlice.reducer;
