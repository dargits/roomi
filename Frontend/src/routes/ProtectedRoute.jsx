import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';

/**
 * Bảo vệ route yêu cầu đăng nhập.
 * - Đang tải: hiển thị màn hình loading đồng bộ
 * - Chưa đăng nhập: redirect về /login
 * - Đã đăng nhập: render children (Outlet)
 */
const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <LoadingScreen
        fullScreen
        message="Đang xác thực tài khoản..."
        submessage="Vui lòng chờ trong giây lát"
      />
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
