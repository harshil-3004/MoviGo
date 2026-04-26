import { configureStore } from '@reduxjs/toolkit';
import movieReducer from './movieSlice';
import bookingReducer from './bookingSlice';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    movies: movieReducer,
    booking: bookingReducer,
  },
});
