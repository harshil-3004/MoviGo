import { createSlice } from '@reduxjs/toolkit';

const movieSlice = createSlice({
  name: 'movies',
  initialState: {
    trending: [],
    recommended: [],
    upcoming: [],
    selectedMovie: null,
    status: 'idle',
  },
  reducers: {
    setMovies: (state, action) => {
      state.trending = action.payload.trending || [];
      state.recommended = action.payload.recommended || [];
      state.upcoming = action.payload.upcoming || [];
    },
    selectMovie: (state, action) => {
      state.selectedMovie = action.payload;
    },
  },
});

export const { setMovies, selectMovie } = movieSlice.actions;
export default movieSlice.reducer;
