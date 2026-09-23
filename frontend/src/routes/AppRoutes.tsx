import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppProviders from '../providers/AppProviders';

// Public pages
import LandingPage from '../features/landing/LandingPage';
import LoginPage from '../features/auth/LoginPage';
import ResetPasswordPage from '../features/auth/ResetPasswordPage';
import RoomsPage from '../features/public/RoomsPage';
import AmenitiesPage from '../features/public/AmenitiesPage';
import PromotionsPage from '../features/public/PromotionsPage';
import AboutPage from '../features/public/AboutPage';
import ContactPage from '../features/public/ContactPage';
import PublicBookingDetailPage from '../features/public/PublicBookingDetailPage';

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
import DepositPolicyPage from '../features/admin/DepositPolicyPage';
import ConcurrencyLogPage from '../features/admin/ConcurrencyLogPage';
import ChannelCalendarPage from '../features/admin/ChannelCalendarPage';
import SessionManagementPage from '../features/admin/SessionManagementPage';
import CorporateClientManagement from '../features/admin/CorporateClientManagement';
import NegotiatedPriceManagement from '../features/admin/NegotiatedPriceManagement';
import PriceSuggestionPage from '../features/admin/PriceSuggestionPage';

// Booking
import BookingManagement from '../features/booking/BookingManagement';
import BookingDetailPage from '../features/booking/BookingDetailPage';
import StayDeclarationPage from '../features/booking/StayDeclarationPage';
import InHouseGuestPage from '../features/booking/InHouseGuestPage';

// Housekeeping
import HousekeepingPage from '../features/housekeeping/HousekeepingPage';
import LostAndFoundPage from '../features/housekeeping/LostAndFoundPage';

// Reports & Backup
import ReportsPage from '../features/reports/ReportsPage';
import CashierShiftPage from '../features/reports/CashierShiftPage';
import DailyLedgerPage from '../features/reports/DailyLedgerPage';
import BackupDataPage from '../features/admin/BackupDataPage';
import PersonalDataAuditLogPage from '../features/booking/PersonalDataAuditLogPage';

// Notifications
import NotificationCenter from '../features/notifications/NotificationCenter';
import NotificationPreferences from '../features/notifications/NotificationPreferences';

const AppRoutes: React.FC = () => {
  return (
    <AppProviders>
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
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

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
              <Route path="/lost-and-found" element={<Navigate to="/manage/lost-and-found" replace />} />
              <Route path="/reports" element={<Navigate to="/manage/reports" replace />} />
              <Route path="/manage" element={<Navigate to="/manage/dashboard" replace />} />

              {/* === Protected /manage Routes === */}
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  {/* Tổng quan — OWNER / ADMIN / RECEPTIONIST / ACCOUNTANT */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'RECEPTIONIST', 'ACCOUNTANT']} />}>
                    <Route path="/manage/dashboard" element={<DashboardPage />} />
                  </Route>

                  {/* Đặt phòng & Khách lưu trú — OWNER / RECEPTIONIST / ADMIN / ACCOUNTANT */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'RECEPTIONIST', 'ADMIN', 'ACCOUNTANT']} />}>
                    <Route path="/manage/bookings" element={<BookingManagement />} />
                    <Route path="/manage/bookings/list" element={<BookingManagement />} />
                    <Route path="/manage/bookings/calendar" element={<BookingManagement />} />
                    <Route path="/manage/bookings/requests" element={<BookingManagement />} />
                    <Route path="/manage/bookings/groups" element={<BookingManagement />} />
                    <Route path="/manage/bookings/:bookingId" element={<BookingDetailPage />} />
                    <Route path="/manage/bookings/:bookingId/:tab" element={<BookingDetailPage />} />
                    <Route path="/manage/in-house-guests" element={<InHouseGuestPage />} />
                    <Route path="/manage/deposit-policies" element={<DepositPolicyPage />} />
                  </Route>

                  {/* Khai báo lưu trú — OWNER / RECEPTIONIST / ADMIN */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'RECEPTIONIST', 'ADMIN']} />}>
                    <Route path="/manage/stay-declarations" element={<StayDeclarationPage />} />
                    <Route path="/manage/rooms" element={<RoomManagement />} />
                    <Route path="/manage/guests" element={<GuestManagement />} />
                    <Route path="/manage/corporate-clients" element={<CorporateClientManagement />} />
                    <Route path="/manage/negotiated-prices" element={<NegotiatedPriceManagement />} />
                  </Route>

                  {/* Cấu hình nâng cao & Kênh phân phối — OWNER / ADMIN */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN']} />}>
                    <Route path="/manage/channels" element={<ChannelCalendarPage />} />
                    <Route path="/manage/room-types" element={<RoomTypeManagement />} />
                    <Route path="/manage/price-suggestions" element={<PriceSuggestionPage />} />
                    <Route path="/manage/staff" element={<StaffManagement />} />
                    <Route path="/manage/concurrency" element={<ConcurrencyLogPage />} />
                    <Route path="/manage/audit-logs" element={<ActivityLog />} />
                    <Route path="/manage/personal-data-audit" element={<PersonalDataAuditLogPage />} />
                    <Route path="/manage/backup" element={<BackupDataPage />} />
                  </Route>

                  {/* Chức năng dành riêng cho Chủ sở hữu — OWNER */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
                    <Route path="/manage/settings" element={<HotelSettings />} />
                    <Route path="/manage/sessions" element={<SessionManagementPage />} />
                    <Route path="/manage/inventory" element={<InventoryManagement />} />
                    <Route path="/manage/extra-services" element={<ExtraServiceManagement />} />
                    <Route path="/manage/loyalty" element={<LoyaltyTierManagement />} />
                  </Route>

                  {/* Buồng phòng & Đồ thất lạc — OWNER / HOUSEKEEPER / RECEPTIONIST / ADMIN */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'RECEPTIONIST', 'ADMIN', 'HOUSEKEEPER']} />}>
                    <Route path="/manage/housekeeping" element={<HousekeepingPage />} />
                    <Route path="/manage/lost-and-found" element={<LostAndFoundPage />} />
                  </Route>

                  {/* Tài chính & Báo cáo */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'ACCOUNTANT', 'ADMIN', 'RECEPTIONIST']} />}>
                    <Route path="/manage/reports" element={<ReportsPage />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'ACCOUNTANT', 'RECEPTIONIST']} />}>
                    <Route path="/manage/cashier-shifts" element={<CashierShiftPage />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'ACCOUNTANT']} />}>
                    <Route path="/manage/daily-ledger" element={<DailyLedgerPage />} />
                  </Route>

                  {/* Hồ sơ cá nhân & Thông báo — Dành cho mọi nhân viên đã đăng nhập */}
                  <Route path="/manage/profile" element={<ProfileSettings />} />
                  <Route path="/manage/notifications" element={<NotificationCenter />} />
                  <Route path="/manage/notifications/preferences" element={<NotificationPreferences />} />
                </Route>
              </Route>

              {/* Redirects for notifications */}
              <Route path="/notifications" element={<Navigate to="/manage/notifications" replace />} />
              <Route path="/notifications/preferences" element={<Navigate to="/manage/notifications/preferences" replace />} />

              {/* Hỗ trợ mở trực tiếp dạng /:token (chuỗi ngẫu nhiên không thể brute force) */}
              <Route path="/:token" element={<ResetPasswordPage />} />

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
    </AppProviders>
  );
};

export default AppRoutes;
