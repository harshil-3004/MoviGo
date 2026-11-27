import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ALLOWED_ADMIN_ROLES = ['admin', 'master_admin', 'theater_admin'];

const AdminProtectedRoute = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const isStaff = isAuthenticated && ALLOWED_ADMIN_ROLES.includes(user?.role);

  useEffect(() => {
    // Alert only if an authenticated non-staff consumer tries to enter admin routes
    if (isAuthenticated && !ALLOWED_ADMIN_ROLES.includes(user?.role)) {
      alert('UNAUTHORIZED ACCESS DETECTED: You must log in via the staff portal to access administrative tools.');
    }
  }, [isAuthenticated, user?.role]);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isStaff) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
