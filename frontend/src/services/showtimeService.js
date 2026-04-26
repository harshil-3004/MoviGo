import { fetchApi } from './api';

export const getShowtimesByMovie = async (movieId) => {
  try {
    return await fetchApi(`/showtimes/movie/${movieId}`);
  } catch (error) {
    console.error("Error fetching showtimes:", error);
    return [];
  }
};

export const getShowtimesByTheater = async (theaterId) => {
  try {
    return await fetchApi(`/showtimes/theater/${theaterId}`);
  } catch (error) {
    console.error("Error fetching theater showtimes:", error);
    return [];
  }
};

export const getShowtimeById = async (id) => {
  try {
    return await fetchApi(`/showtimes/${id}`);
  } catch (error) {
    console.error("Error fetching showtime by ID:", error);
    throw error;
  }
};

export const createShowtime = async (showtimeData) => {
  try {
    return await fetchApi(`/showtimes`, {
      method: 'POST',
      body: JSON.stringify(showtimeData)
    });
  } catch (error) {
    console.error("Error creating showtime:", error);
    throw error;
  }
};

export const updateShowtime = async (id, data) => {
  try {
    return await fetchApi(`/showtimes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.error("Error updating showtime:", error);
    throw error;
  }
};

export const deleteShowtime = async (id) => {
  try {
    return await fetchApi(`/showtimes/${id}`, { method: 'DELETE' });
  } catch (error) {
    console.error("Error deleting showtime:", error);
    throw error;
  }
};
