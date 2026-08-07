import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import BookingPortal from './pages/BookingPortal';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import Guests from './pages/Guests';
import Rooms from './pages/Rooms';
import Rates from './pages/Rates';
import Services from './pages/Services';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ActivityLogs from './pages/ActivityLogs';
import Invoices from './pages/Invoices';

const RouteElement = ({ component: Component }) => {
  const { user, cleaningNotifications, setCleaningNotifications, fetchProfile } = useAuth();
  const { showNotification } = useNotification();
  
  return (
    <Component 
      user={user} 
      showNotification={showNotification} 
      cleaningNotifications={cleaningNotifications} 
      setCleaningNotifications={setCleaningNotifications}
      readOnly={user?.role === 'ACCOUNTANT'}
      onProfileUpdate={fetchProfile}
    />
  );
};


const RootRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') {
    return <Navigate to="/settings" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

const LoginWrapper = () => {
  const { handleLogin, user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  if (user) {
    return <RootRedirect />;
  }
  
  return (
    <Login 
      onLoginSuccess={handleLogin} 
      showNotification={showNotification} 
      onGoToPortal={() => navigate('/portal')} 
    />
  );
};

const PortalWrapper = () => {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  return (
    <BookingPortal 
      onBackToLogin={() => navigate('/login')} 
      showNotification={showNotification} 
    />
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginWrapper />} />
      <Route path="/portal" element={<PortalWrapper />} />
      
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<RootRedirect />} />
        <Route path="dashboard" element={<RouteElement component={Dashboard} />} />
        <Route path="bookings" element={<RouteElement component={Bookings} />} />
        <Route path="guests" element={<RouteElement component={Guests} />} />
        <Route path="rooms" element={<RouteElement component={Rooms} />} />
        <Route path="rates" element={<RouteElement component={Rates} />} />
        <Route path="invoices" element={<RouteElement component={Invoices} />} />
        <Route path="services" element={<RouteElement component={Services} />} />
        <Route path="reports" element={<RouteElement component={Reports} />} />
        <Route path="settings" element={<RouteElement component={Settings} />} />
        <Route path="users" element={<RouteElement component={Users} />} />
        <Route path="activity-logs" element={<RouteElement component={ActivityLogs} />} />
        <Route path="profile" element={<RouteElement component={Profile} />} />
        
        {/* Catch-all route within protected routes */}
        <Route path="*" element={<RootRedirect />} />
      </Route>
      
      {/* Fallback global route */}
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
