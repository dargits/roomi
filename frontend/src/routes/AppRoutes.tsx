import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoadingScreen from '../components/common/LoadingScreen';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';

// === Public pages (Lazy loaded) ===
const LandingPage = lazy(() => import('../features/landing/LandingPage'));
const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const RoomsPage = lazy(() => import('../features/public/RoomsPage'));
const AmenitiesPage = lazy(() => import('../features/public/AmenitiesPage'));
const PromotionsPage = lazy(() => import('../features/public/PromotionsPage'));
const AboutPage = lazy(() => import('../features/public/AboutPage'));
const ContactPage = lazy(() => import('../features/public/ContactPage'));
const PublicBookingDetailPage = lazy(() => import('../features/public/PublicBookingDetailPage'));

// === Dashboard & Admin (Lazy loaded) ===
const DashboardPage = lazy(() => import('../features/admin/DashboardPage'));
const HotelSettings = lazy(() => import('../features/admin/HotelSettings'));
const RoomTypeManagement = lazy(() => import('../features/admin/RoomTypeManagement'));
const RoomManagement = lazy(() => import('../features/admin/RoomManagement'));
const GuestManagement = lazy(() => import('../features/admin/GuestManagement'));
const ProfileSettings = lazy(() => import('../features/admin/ProfileSettings'));
const StaffManagement = lazy(() => import('../features/admin/StaffManagement'));
const ExtraServiceManagement = lazy(() => import('../features/admin/ExtraServiceManagement'));
const ActivityLog = lazy(() => import('../features/admin/ActivityLog'));
const InventoryManagement = lazy(() => import('../features/admin/InventoryManagement'));
const LoyaltyTierManagement = lazy(() => import('../features/admin/LoyaltyTierManagement'));
const DepositPolicyPage = lazy(() => import('../features/admin/DepositPolicyPage'));
const ConcurrencyLogPage = lazy(() => import('../features/admin/ConcurrencyLogPage'));

// === Booking (Lazy loaded) ===
const BookingManagement = lazy(() => import('../features/booking/BookingManagement'));
const BookingDetailPage = lazy(() => import('../features/booking/BookingDetailPage'));
const StayDeclarationPage = lazy(() => import('../features/booking/StayDeclarationPage'));

// === Housekeeping (Lazy loaded) ===
const HousekeepingPage = lazy(() => import('../features/housekeeping/HousekeepingPage'));

// === Reports & Backup (Lazy loaded) ===
const ReportsPage = lazy(() => import('../features/reports/ReportsPage'));
const CashierShiftPage = lazy(() => import('../features/reports/CashierShiftPage'));
const BackupDataPage = lazy(() => import('../features/admin/BackupDataPage'));
const PersonalDataAuditLogPage = lazy(() => import('../features/booking/PersonalDataAuditLogPage'));

const RouteLoadingFallback = () => (
  <LoadingScreen message="Đang tải trang..." />
);

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* === Public routes === */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/amenities" element={<AmenitiesPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Public Booking Details & Sharing */}
          <Route path="/booking-detail/:bookingId" element={<PublicBookingDetailPage />} />
          <Route path="/booking-detail/:bookingId/:tab" element={<PublicBookingDetailPage />} />
          <Route path="/share/booking/:bookingId" element={<PublicBookingDetailPage />} />
          <Route path="/share/booking/:bookingId/:tab" element={<PublicBookingDetailPage />} />
          <Route path="/p/booking/:bookingId" element={<PublicBookingDetailPage />} />
          <Route path="/p/booking/:bookingId/:tab" element={<PublicBookingDetailPage />} />

          {/* Redirect old /admin & /dashboard paths */}
          <Route path="/admin" element={<Navigate to="/manage/dashboard" replace />} />
          <Route path="/admin/*" element={<Navigate to="/manage/dashboard" replace />} />
          <Route path="/dashboard" element={<Navigate to="/manage/dashboard" replace />} />
          <Route path="/bookings" element={<Navigate to="/manage/bookings" replace />} />
          <Route path="/housekeeping" element={<Navigate to="/manage/housekeeping" replace />} />
          <Route path="/reports" element={<Navigate to="/manage/reports" replace />} />
          <Route path="/manage" element={<Navigate to="/manage/dashboard" replace />} />

          {/* === Protected /manage Routes === */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              {/* Tổng quan */}
              <Route path="/manage/dashboard" element={<DashboardPage />} />

              {/* Đặt phòng */}
              <Route path="/manage/bookings" element={<BookingManagement />} />
              <Route path="/manage/bookings/list" element={<BookingManagement />} />
              <Route path="/manage/bookings/calendar" element={<BookingManagement />} />
              <Route path="/manage/bookings/requests" element={<BookingManagement />} />
              <Route path="/manage/bookings/groups" element={<BookingManagement />} />
              <Route path="/manage/bookings/:bookingId" element={<BookingDetailPage />} />
              <Route path="/manage/bookings/:bookingId/:tab" element={<BookingDetailPage />} />

              {/* Khai báo lưu trú — NCL-12 */}
              <Route path="/manage/stay-declarations" element={<StayDeclarationPage />} />

              {/* Phòng */}
              <Route path="/manage/rooms" element={<RoomManagement />} />

              {/* Loại phòng */}
              <Route path="/manage/room-types" element={<RoomTypeManagement />} />

              {/* Khách hàng */}
              <Route path="/manage/guests" element={<GuestManagement />} />

              {/* Dịch vụ phụ thu */}
              <Route path="/manage/extra-services" element={<ExtraServiceManagement />} />

              {/* Buồng phòng */}
              <Route path="/manage/housekeeping" element={<HousekeepingPage />} />

              {/* Báo cáo */}
              <Route path="/manage/reports" element={<ReportsPage />} />
              <Route path="/manage/cashier-shifts" element={<CashierShiftPage />} />

              {/* Lịch sử hoạt động */}
              <Route path="/manage/audit-logs" element={<ActivityLog />} />

              {/* Nhật ký truy cập dữ liệu cá nhân */}
              <Route path="/manage/personal-data-audit" element={<PersonalDataAuditLogPage />} />

              {/* Nhân sự */}
              <Route path="/manage/staff" element={<StaffManagement />} />

              {/* Cài đặt khách sạn */}
              <Route path="/manage/settings" element={<HotelSettings />} />

              {/* Sao lưu & CSV */}
              <Route path="/manage/backup" element={<BackupDataPage />} />

              {/* Kho đồ dùng */}
              <Route path="/manage/inventory" element={<InventoryManagement />} />

              {/* Khách hàng thân thiết */}
              <Route path="/manage/loyalty" element={<LoyaltyTierManagement />} />

              {/* Chính sách đặt cọc */}
              <Route path="/manage/deposit-policies" element={<DepositPolicyPage />} />

              {/* Kiểm soát đồng thời & Minh chứng */}
              <Route path="/manage/concurrency" element={<ConcurrencyLogPage />} />

              {/* Hồ sơ cá nhân */}
              <Route path="/manage/profile" element={<ProfileSettings />} />
            </Route>
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRoutes;
