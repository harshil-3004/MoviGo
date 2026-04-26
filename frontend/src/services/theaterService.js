import { fetchApi } from './api';

export const getTheaters = async () => {
  try {
    return await fetchApi(`/theaters`);
  } catch (error) {
    console.error("Error fetching theaters:", error);
    return [];
  }
};

export const updateTheaterScreens = async (theaterId, screens) => {
  return await fetchApi(`/theaters/${theaterId}/screens`, {
    method: 'PUT',
    body: JSON.stringify({ screens })
  });
};
