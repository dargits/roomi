import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Bảo vệ route yêu cầu đăng nhập.
 * - Đang tải: hiển thị spinner
 * - Chưa đăng nhập: redirect về /login
 * - Đã đăng nhập: render children (Outlet)
 */
const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-on-surface-variant font-body-md">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Nếu có giới hạn role, kiểm tra quyền
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user?.role)) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="text-center p-8 bg-surface-container-lowest rounded-lg border border-border-grey max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-error text-3xl">block</span>
            </div>
            <h2 className="font-headline-md text-on-surface mb-2">Không có quyền truy cập</h2>
            <p className="font-body-md text-on-surface-variant">
              Tài khoản của bạn ({user?.role}) không có quyền truy cập trang này.
            </p>
          </div>
        </div>
      );
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
