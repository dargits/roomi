import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { AppConfigProvider } from '../context/AppConfigContext';

// Public pages
import LandingPage from '../features/landing/LandingPage';
import LoginPage from '../features/auth/LoginPage';
import RoomsPage from '../features/public/RoomsPage';
import AmenitiesPage from '../features/public/AmenitiesPage';
import PromotionsPage from '../features/public/PromotionsPage';
import AboutPage from '../features/public/AboutPage';
import ContactPage from '../features/public/ContactPage';

// Layout
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';

// Dashboard & Admin
import DashboardPage from '../features/admin/DashboardPage';
import HotelSettings from '../features/admin/HotelSettings';
import RoomTypeManagement from '../features/admin/RoomTypeManagement';
import RoomManagement from '../features/admin/RoomManagement';
import GuestManagement from '../features/admin/GuestManagement';
import ProfileSettings from '../features/admin/ProfileSettings';
import StaffManagement from '../features/admin/StaffManagement';
import ExtraServiceManagement from '../features/admin/ExtraServiceManagement';
import ActivityLog from '../features/admin/ActivityLog';
import InventoryManagement from '../features/admin/InventoryManagement';
import LoyaltyTierManagement from '../features/admin/LoyaltyTierManagement';

// Booking
import BookingManagement from '../features/booking/BookingManagement';

// Housekeeping
import HousekeepingPage from '../features/housekeeping/HousekeepingPage';

// Reports & Backup
import ReportsPage from '../features/reports/ReportsPage';
import BackupDataPage from '../features/admin/BackupDataPage';

const AppRoutes = () => {
  return (
    <AppConfigProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* === Public routes === */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/amenities" element={<AmenitiesPage />} />
            <Route path="/promotions" element={<PromotionsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Redirect old /admin paths */}
            <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
            <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />

            {/* === Protected Dashboard Routes === */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                {/* Tổng quan */}
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Đặt phòng — OWNER / RECEPTIONIST */}
                <Route path="/bookings" element={<BookingManagement />} />

                {/* Phòng */}
                <Route path="/rooms" element={<RoomManagement />} />

                {/* Loại phòng — OWNER */}
                <Route path="/room-types" element={<RoomTypeManagement />} />

                {/* Khách hàng — OWNER / RECEPTIONIST */}
                <Route path="/guests" element={<GuestManagement />} />

                {/* Dịch vụ phụ thu — OWNER */}
                <Route path="/extra-services" element={<ExtraServiceManagement />} />

                {/* Buồng phòng — OWNER / HOUSEKEEPER / RECEPTIONIST */}
                <Route path="/housekeeping" element={<HousekeepingPage />} />

                {/* Báo cáo — OWNER / ACCOUNTANT */}
                <Route path="/reports" element={<ReportsPage />} />

                {/* Lịch sử hoạt động — OWNER / ADMIN */}
                <Route path="/audit-logs" element={<ActivityLog />} />

                {/* Nhân sự — OWNER / ADMIN */}
                <Route path="/staff" element={<StaffManagement />} />

                {/* Cài đặt khách sạn — OWNER */}
                <Route path="/settings" element={<HotelSettings />} />

                {/* Sao lưu & CSV — OWNER / ADMIN */}
                <Route path="/backup" element={<BackupDataPage />} />

                {/* Kho đồ dùng — OWNER */}
                <Route path="/inventory" element={<InventoryManagement />} />

                {/* Khách hàng thân thiết — OWNER */}
                <Route path="/loyalty" element={<LoyaltyTierManagement />} />

                {/* Hồ sơ cá nhân */}
                <Route path="/profile" element={<ProfileSettings />} />
              </Route>
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppConfigProvider>
  );
};

export default AppRoutes;
