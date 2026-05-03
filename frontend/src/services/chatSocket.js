/**
 * chatSocket.js — Singleton socket instance shared across AdminLayout & AdminChat.
 * This ensures one connection registers the user as "online" app-wide,
 * and AdminChat reuses the same socket without creating duplicates.
 */
import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket || socket.disconnected) {
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'http://localhost:5000';
    socket = io(socketUrl, { autoConnect: true });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
