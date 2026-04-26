import { fetchApi } from './api';

/**
 * Step 1: Create a pending booking and lock seats
 */
export const createPendingBooking = async (bookingData) => {
  return fetchApi('/bookings', { 
    method: 'POST', 
    body: JSON.stringify(bookingData) 
  });
};

/**
 * Step 2: Confirm payment and finalize booking
 */
export const confirmPaymentAndBooking = async (bookingId) => {
  return fetchApi('/bookings/confirm', { 
    method: 'POST', 
    body: JSON.stringify({ bookingId }) 
  });
};

export const getBookingById = async (id) => {
  return fetchApi(`/bookings/${id}`);
};

export const validateCoupon = async (code, theaterId = null) => {
  try {
    return await fetchApi('/promotions/validate', {
      method: 'POST',
      body: JSON.stringify({ code, theaterId })
    });
  } catch (err) {
    return { valid: false, message: err.message || 'Server validation failed' };
  }
};

export const downloadBookingPDF = async (id, filename = 'Ticket.pdf') => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/bookings/${id}/pdf`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  });

  if (!response.ok) throw new Error('Failed to download PDF');

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
