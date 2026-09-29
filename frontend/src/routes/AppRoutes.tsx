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
import ProtectedRoute, { RoleBasedRedirect } from './ProtectedRoute';

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
import DebtApprovalPage from '../features/admin/DebtApprovalPage';
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
import HousekeepingProductivityPage from '../features/housekeeping/HousekeepingProductivityPage';

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

              {/* Redirect old /admin, /dashboard & /manage paths theo vai trò */}
              <Route path="/admin" element={<RoleBasedRedirect />} />
              <Route path="/admin/*" element={<RoleBasedRedirect />} />
              <Route path="/dashboard" element={<RoleBasedRedirect />} />
              <Route path="/bookings" element={<Navigate to="/manage/bookings" replace />} />
              <Route path="/housekeeping" element={<Navigate to="/manage/housekeeping" replace />} />
              <Route path="/lost-and-found" element={<Navigate to="/manage/lost-and-found" replace />} />
              <Route path="/reports" element={<Navigate to="/manage/reports" replace />} />
              <Route path="/manage" element={<RoleBasedRedirect />} />

              {/* === Protected /manage Routes === */}
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  {/* Tổng quan — OWNER / ADMIN / RECEPTIONIST / ACCOUNTANT */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'RECEPTIONIST', 'ACCOUNTANT']} />}>
                    <Route path="/manage/dashboard" element={<DashboardPage />} />
                  </Route>

                  {/* Chính sách đặt cọc & hoàn hủy, Phê duyệt công nợ — OWNER */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
                    <Route path="/manage/deposit-policies" element={<DepositPolicyPage />} />
                    <Route path="/manage/cancellation-policies" element={<DepositPolicyPage />} />
                    <Route path="/manage/debt-approvals" element={<DebtApprovalPage />} />
                  </Route>

                  {/* Quản lý đặt phòng, khách lưu trú & khách hàng tác nghiệp — RECEPTIONIST */}
                  <Route element={<ProtectedRoute allowedRoles={['RECEPTIONIST']} />}>
                    <Route path="/manage/bookings" element={<BookingManagement />} />
                    <Route path="/manage/bookings/list" element={<BookingManagement />} />
                    <Route path="/manage/bookings/calendar" element={<BookingManagement />} />
                    <Route path="/manage/bookings/requests" element={<BookingManagement />} />
                    <Route path="/manage/bookings/groups" element={<BookingManagement />} />
                    <Route path="/manage/in-house-guests" element={<InHouseGuestPage />} />
                    <Route path="/manage/guests" element={<GuestManagement />} />
                  </Route>

                  {/* Chi tiết đặt phòng & đối soát hóa đơn — OWNER / RECEPTIONIST / ACCOUNTANT */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'RECEPTIONIST', 'ACCOUNTANT']} />}>
                    <Route path="/manage/bookings/:bookingId" element={<BookingDetailPage />} />
                    <Route path="/manage/bookings/:bookingId/:tab" element={<BookingDetailPage />} />
                  </Route>

                  {/* Khách hàng công ty & Hợp đồng công nợ — OWNER / RECEPTIONIST / ACCOUNTANT */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'RECEPTIONIST', 'ACCOUNTANT']} />}>
                    <Route path="/manage/corporate-clients" element={<CorporateClientManagement />} />
                    <Route path="/manage/negotiated-prices" element={<NegotiatedPriceManagement />} />
                  </Route>

                  {/* Khai báo lưu trú — RECEPTIONIST */}
                  <Route element={<ProtectedRoute allowedRoles={['RECEPTIONIST']} />}>
                    <Route path="/manage/stay-declarations" element={<StayDeclarationPage />} />
                  </Route>

                  {/* Sơ đồ phòng — OWNER / RECEPTIONIST / HOUSEKEEPER */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'RECEPTIONIST', 'HOUSEKEEPER']} />}>
                    <Route path="/manage/rooms" element={<RoomManagement />} />
                  </Route>

                  {/* Cấu hình kênh, loại phòng, giá, năng suất buồng phòng & Khách thân thiết — OWNER */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
                    <Route path="/manage/channels" element={<ChannelCalendarPage />} />
                    <Route path="/manage/room-types" element={<RoomTypeManagement />} />
                    <Route path="/manage/price-suggestions" element={<PriceSuggestionPage />} />
                    <Route path="/manage/housekeeping-productivity" element={<HousekeepingProductivityPage />} />
                    <Route path="/manage/extra-services" element={<ExtraServiceManagement />} />
                    <Route path="/manage/loyalty" element={<LoyaltyTierManagement />} />
                  </Route>

                  {/* Quản trị hệ thống, tài khoản, giám sát & sao lưu — OWNER / ADMIN */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN']} />}>
                    <Route path="/manage/staff" element={<StaffManagement />} />
                    <Route path="/manage/sessions" element={<SessionManagementPage />} />
                    <Route path="/manage/concurrency" element={<ConcurrencyLogPage />} />
                    <Route path="/manage/audit-logs" element={<ActivityLog />} />
                    <Route path="/manage/personal-data-audit" element={<PersonalDataAuditLogPage />} />
                    <Route path="/manage/backup" element={<BackupDataPage />} />
                    <Route path="/manage/settings" element={<HotelSettings />} />
                  </Route>

                  {/* Kho đồ dùng & vật tư tiêu hao — OWNER / HOUSEKEEPER */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'HOUSEKEEPER']} />}>
                    <Route path="/manage/inventory" element={<InventoryManagement />} />
                  </Route>

                  {/* Buồng phòng & Đồ thất lạc — HOUSEKEEPER / RECEPTIONIST */}
                  <Route element={<ProtectedRoute allowedRoles={['RECEPTIONIST', 'HOUSEKEEPER']} />}>
                    <Route path="/manage/housekeeping" element={<HousekeepingPage />} />
                    <Route path="/manage/lost-and-found" element={<LostAndFoundPage />} />
                  </Route>

                  {/* Báo cáo & Phân tích — OWNER / ACCOUNTANT */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'ACCOUNTANT']} />}>
                    <Route path="/manage/reports" element={<ReportsPage />} />
                  </Route>

                  {/* Chốt ca & đối soát tiền mặt — OWNER / ACCOUNTANT / RECEPTIONIST */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'ACCOUNTANT', 'RECEPTIONIST']} />}>
                    <Route path="/manage/cashier-shifts" element={<CashierShiftPage />} />
                  </Route>

                  {/* Sổ quỹ ngày — OWNER / ACCOUNTANT */}
                  <Route element={<ProtectedRoute allowedRoles={['OWNER', 'ACCOUNTANT']} />}>
                    <Route path="/manage/daily-ledger" element={<DailyLedgerPage />} />
                  </Route>

                  {/* Hồ sơ cá nhân & Thông báo — Dành cho mọi nhân viên đã đăng nhập */}
                  <Route path="/manage/profile" element={<ProfileSettings />} />
                  <Route path="/manage/notifications" element={<NotificationCenter />} />
                  <Route path="/manage/notifications/preferences" element={<Navigate to="/manage/notifications?tab=preferences" replace />} />
                </Route>
              </Route>

              {/* Redirects for notifications */}
              <Route path="/notifications" element={<Navigate to="/manage/notifications" replace />} />
              <Route path="/notifications/preferences" element={<Navigate to="/manage/notifications?tab=preferences" replace />} />

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
