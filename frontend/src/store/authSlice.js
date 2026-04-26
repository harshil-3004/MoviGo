import { createSlice } from '@reduxjs/toolkit';

const getInitialState = () => {
  try {
    const serializedUser = localStorage.getItem('user');
    if (serializedUser) {
      return {
        isAuthenticated: true,
        user: JSON.parse(serializedUser)
      };
    }
  } catch (err) {
    console.warn("Could not load user from localStorage", err);
  }
  return {
    isAuthenticated: false,
    user: null, // { name, email, role, theaterId }
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    login: (state, action) => {
      // payload expects { name, email, role, theaterId, token }
      state.isAuthenticated = true;
      const { token, ...userData } = action.payload;
      state.user = userData;
      try {
        localStorage.setItem('user', JSON.stringify(userData));
        if (token) {
          localStorage.setItem('token', token);
        }
      } catch (err) {
        console.warn("Could not save auth data to localStorage", err);
      }
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      try {
        localStorage.removeItem('user');
        localStorage.removeItem('token'); // We should also remove token on global logout
      } catch (err) {
        console.warn("Could not remove user from localStorage", err);
      }
    }
  }
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
