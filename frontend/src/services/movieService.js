import { fetchApi } from './api';

export const getTrendingMovies = async () => {
  try {
    return await fetchApi(`/movies`);
  } catch (error) {
    console.error("Error fetching movies:", error);
    return [];
  }
};

export const getMovieDetails = async (id) => {
  try {
    return await fetchApi(`/movies/${id}`);
  } catch (error) {
    console.error("Error fetching movie details:", error);
    return null;
  }
};
