import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageLoader from './PageLoader';

/**
 * ProtectedRoute — Guards a route to authenticated users only.
 *
 * Fixes the issue where unauthorized users could navigate directly to
 * protected URLs (e.g. /users) and only see "Access Denied" after the page
 * loaded. Now they are redirected before the page renders.
 *
 * @param {string[]} [allowedRoles] - If provided, only these roles can access.
 *   If omitted, any authenticated user can access.
 * @param {React.ReactNode} children
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading, token } = useAuth();

  // Show loader while auth state is being resolved on initial load
  if (loading) {
    return <PageLoader message="Đang xác thực..." />;
  }

  // Not authenticated — redirect to portal (public home)
  if (!token || !user) {
    return <Navigate to="/portal" replace />;
  }

  // Role check — redirect to dashboard if role not allowed
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
