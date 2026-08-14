import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '../features/landing/LandingPage';
import LoginPage from '../features/auth/LoginPage';
import { AuthProvider } from '../context/AuthContext';
import { AppConfigProvider } from '../context/AppConfigContext';
import DashboardLayout from '../layouts/DashboardLayout';
import HotelSettings from '../features/admin/HotelSettings';
import RoomTypeManagement from '../features/admin/RoomTypeManagement';
import RoomManagement from '../features/admin/RoomManagement';
import GuestManagement from '../features/admin/GuestManagement';
import ProfileSettings from '../features/admin/ProfileSettings';
import StaffManagement from '../features/admin/StaffManagement';
import ExtraServiceManagement from '../features/admin/ExtraServiceManagement';
import BookingManagement from '../features/booking/BookingManagement';

const AppRoutes = () => {
  return (
    <AppConfigProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Redirect old admin paths to dashboard to prevent blank screen */}
            <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
            <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />
            
            {/* Flattened Dashboard Routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<div className="p-4">Chào mừng đến với trang Tổng quan</div>} />
              <Route path="/room-types" element={<RoomTypeManagement />} />
              <Route path="/rooms" element={<RoomManagement />} />
              <Route path="/guests" element={<GuestManagement />} />
              <Route path="/settings" element={<HotelSettings />} />
              <Route path="/profile" element={<ProfileSettings />} />
              <Route path="/staff" element={<StaffManagement />} />
              <Route path="/extra-services" element={<ExtraServiceManagement />} />
              <Route path="/bookings" element={<BookingManagement />} />
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
