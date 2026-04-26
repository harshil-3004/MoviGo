import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const AdminProtectedRoute = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    // If a user tries to hit this route without being a valid admin, fire the alert.
    if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'theater_admin')) {
      alert("UNAUTHORIZED ACCESS DETECTED: You must log in via the staff portal to access administrative tools.");
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'theater_admin')) {
    // Boot them strictly back to the consumer home/login
    return <Navigate to="/login" replace />;
  }

  // If secure, render the wrapped Admin routes
  return <Outlet />;
};

export default AdminProtectedRoute;
