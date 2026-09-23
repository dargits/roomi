import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import LoadingScreen from '../components/common/LoadingScreen';
import { IoShieldOutline, IoArrowBackOutline } from 'react-icons/io5';

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Chủ sở hữu',
  ADMIN: 'Quản trị viên',
  RECEPTIONIST: 'Lễ tân',
  HOUSEKEEPER: 'Buồng phòng',
  ACCOUNTANT: 'Kế toán'
};

export const getDefaultRouteForRole = (role?: Role): string => {
  if (role === 'HOUSEKEEPER') {
    return '/manage/housekeeping';
  }
  return '/manage/dashboard';
};

export interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

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

  // Bắt buộc đổi mật khẩu tạm trước khi vào bất kỳ màn hình nghiệp vụ nào (NCL-01-CN-005)
  if (user?.mustChangePassword) {
    return <Navigate to="/login" replace />;
  }

  // Nếu có giới hạn role, kiểm tra quyền
  if (allowedRoles && allowedRoles.length > 0) {
    if (!user?.role || !allowedRoles.includes(user.role)) {
      const defaultRoute = getDefaultRouteForRole(user?.role);
      const roleName = (user?.role && ROLE_LABELS[user.role]) || user?.role || 'Nhân viên';

      return (
        <div className="flex-1 w-full min-h-[60vh] flex items-center justify-center p-6 antialiased">
          <div className="w-full max-w-md bg-white rounded-2xl border border-border-grey shadow-sm p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-xs">
              <IoShieldOutline size={32} />
            </div>
            <h2 className="text-xl font-bold text-[#1A2411] mb-2 tracking-tight">
              Giới Hạn Quyền Truy Cập
            </h2>
            <p className="text-sm text-[#606D56] leading-relaxed mb-6">
              Tài khoản vai trò <strong className="text-[#1A2411] font-semibold">{roleName}</strong> chưa được phân quyền truy cập chức năng này.
            </p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => navigate(defaultRoute)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4F63D] hover:bg-[#C2E232] text-xs font-bold text-[#1A2411] transition-all shadow-xs cursor-pointer"
              >
                <IoArrowBackOutline size={16} />
                <span>Quay về trang chính của bạn</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
