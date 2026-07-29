import React, { useState, useEffect } from 'react';
import { getRoleLabel } from './utils/role';
import api from './utils/api';
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
import { 
  LayoutDashboard, 
  CalendarRange, 
  Users as UsersIcon, 
  BedDouble, 
  TrendingUp, 
  ConciergeBell, 
  ShieldAlert, 
  User, 
  LogOut,
  X,
  Moon,
  Sun,
  UserCheck,
  Menu,
  BarChart3
} from 'lucide-react';

function App() {
  const [token, setToken] = useState(localStorage.getItem('roomi_token') || null);
  const [user, setUser] = useState(null);
  const [showPortal, setShowPortal] = useState(!localStorage.getItem('roomi_token'));
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loadingBarStatus, setLoadingBarStatus] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleViewChange = (viewId) => {
    if (viewId === currentView) return;
    setLoadingBarStatus('active');
    
    setTimeout(() => {
      setCurrentView(viewId);
      
      setTimeout(() => {
        setLoadingBarStatus('finished');
      }, 300);
    }, 150);
  };

  // Toggle Dark/Light Mode
  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }, [darkMode]);

  // Toast notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Fetch current user profile
  const fetchProfile = async (currentToken) => {
    try {
      setLoading(true);
      const res = await api.get('/users/profile');
      if (res.data && res.data.data) {
        setUser(res.data.data);
      }
    } catch (err) {
      showNotification(err.message || 'Không thể lấy thông tin tài khoản', 'error');
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  // Auto-redirect if currentView is not allowed for user role
  useEffect(() => {
    if (user) {
      const allowedIds = menuItems.filter(item => item.roles.includes(user.role)).map(item => item.id);
      if (allowedIds.length > 0 && !allowedIds.includes(currentView)) {
        setCurrentView(allowedIds[0]);
      }
    }
  }, [user, currentView]);


  const handleLogin = (newToken) => {
    localStorage.setItem('roomi_token', newToken);
    setToken(newToken);
    setShowPortal(false);
    showNotification('Đăng nhập thành công!');
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('roomi_token');
    setToken(null);
    setUser(null);
    setShowPortal(true);
    setCurrentView('dashboard');
    showNotification('Đã đăng xuất tài khoản.');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0a0b10',
        color: '#f3f4f6',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          border: '4px solid rgba(255, 255, 255, 0.1)',
          borderTop: '4px solid #6366f1',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }} />
        <p>Đang tải dữ liệu Roomi...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (showPortal) {
    return (
      <>
        <BookingPortal onBackToLogin={() => setShowPortal(false)} showNotification={showNotification} />
        {notification && (
          <div className={`notification notification-${notification.type}`}>
            <span>{notification.message}</span>
          </div>
        )}
      </>
    );
  }

  // If user is not authenticated, render Login/Register
  if (!token || !user) {
    return (
      <>
        <Login onLoginSuccess={handleLogin} showNotification={showNotification} onGoToPortal={() => setShowPortal(true)} />
        {notification && (
          <div className={`notification notification-${notification.type}`}>
            <span>{notification.message}</span>
          </div>
        )}
      </>
    );
  }

  // Navigation items based on roles
  const menuItems = [
    { id: 'dashboard', name: 'Sơ đồ phòng', icon: LayoutDashboard, roles: ['OWNER', 'RECEPTIONIST', 'HOUSEKEEPER', 'ACCOUNTANT', 'ADMIN'] },
    { id: 'bookings', name: 'Đặt phòng', icon: CalendarRange, roles: ['OWNER', 'RECEPTIONIST', 'ACCOUNTANT'] },
    { id: 'guests', name: 'Khách hàng', icon: UsersIcon, roles: ['OWNER', 'RECEPTIONIST'] },
    { id: 'rooms', name: 'Phòng & Loại', icon: BedDouble, roles: ['OWNER'] },
    { id: 'rates', name: 'Giá theo mùa', icon: TrendingUp, roles: ['OWNER', 'RECEPTIONIST', 'ACCOUNTANT'] },
    { id: 'services', name: 'Dịch vụ phụ thu', icon: ConciergeBell, roles: ['OWNER', 'RECEPTIONIST'] },
    { id: 'reports', name: 'Báo cáo doanh thu', icon: BarChart3, roles: ['OWNER', 'ACCOUNTANT', 'ADMIN'] },
    { id: 'users', name: 'Nhân viên', icon: ShieldAlert, roles: ['ADMIN'] },
    { id: 'profile', name: 'Hồ sơ & Bảo mật', icon: User, roles: ['OWNER', 'RECEPTIONIST', 'HOUSEKEEPER', 'ACCOUNTANT', 'ADMIN'] },
  ];

  const allowedMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard user={user} showNotification={showNotification} />;
      case 'bookings':
        return <Bookings user={user} showNotification={showNotification} />;
      case 'guests':
        return <Guests user={user} showNotification={showNotification} />;
      case 'rooms':
        return <Rooms user={user} showNotification={showNotification} />;
      case 'rates':
        return <Rates user={user} showNotification={showNotification} />;
      case 'services':
        return <Services user={user} showNotification={showNotification} />;
      case 'reports':
        return <Reports user={user} showNotification={showNotification} />;
      case 'users':
        return <Users user={user} showNotification={showNotification} />;
      case 'profile':
        return <Profile user={user} showNotification={showNotification} onProfileUpdate={() => fetchProfile(token)} />;
      default:
        return <Dashboard user={user} showNotification={showNotification} />;
    }
  };

  return (
    <div className="dashboard-container">
      <div className={`top-loading-bar ${loadingBarStatus}`} />
      
      {/* Top Navbar */}
      <header className="top-navbar">
        {/* Brand Logo */}
        <div className="navbar-brand">
          <div className="brand-icon">R</div>
          <div className="brand-info">
            <h2 className="brand-name">Roomi</h2>
            <span className="brand-sub">Hotel Management System</span>
          </div>
        </div>

        {/* Navigation List (Desktop) */}
        <nav className="navbar-menu">
          {allowedMenuItems
            .filter(item => item.id !== 'profile')
            .map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleViewChange(item.id)}
                  className={`navbar-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{item.name}</span>
                </button>
              );
            })}
        </nav>

        {/* User profile & actions */}
        <div className="navbar-actions">
          {/* User profile button */}
          <button 
            onClick={() => handleViewChange('profile')}
            className={`navbar-user ${currentView === 'profile' ? 'active' : ''}`}
          >
            <div className="user-avatar">
              <User size={16} />
            </div>
            <div className="user-meta">
              <span className="user-name">{user.fullName}</span>
              <span className="user-role">
                <UserCheck size={10} />
                <span>{getRoleLabel(user.role)}</span>
              </span>
            </div>
          </button>

          {/* Theme switch */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="navbar-action-btn"
            title="Đổi giao diện"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Logout button */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="navbar-action-btn logout-btn"
            title="Đăng xuất"
          >
            <LogOut size={16} />
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="navbar-mobile-toggle"
            aria-label="Toggle navigation"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <nav className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
            {allowedMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleViewChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`mobile-menu-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </button>
              );
            })}
            
            <div className="mobile-menu-divider" />
            
            {/* User Profile Mobile */}
            <div className="mobile-menu-user">
              <div className="user-avatar">
                <User size={16} />
              </div>
              <div className="user-meta">
                <span className="user-name">{user.fullName}</span>
                <span className="user-role" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <UserCheck size={10} />
                  <span>{getRoleLabel(user.role)}</span>
                </span>
              </div>
            </div>
            
            <div className="mobile-menu-actions">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="btn btn-secondary mobile-action-btn"
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                <span>Giao diện</span>
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="btn btn-danger mobile-action-btn"
              >
                <LogOut size={16} />
                <span>Đăng xuất</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        <div key={currentView} className="animate-fade-in" style={{ width: '100%' }}>
          {renderActiveView()}
        </div>
      </main>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-maintenance)' }}>
                <LogOut size={18} />
                Xác nhận đăng xuất
              </h2>
              <button 
                onClick={() => setShowLogoutConfirm(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px 0', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
              <p>Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?</p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => setShowLogoutConfirm(false)} 
                className="btn btn-secondary btn-sm"
              >
                Hủy
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }} 
                className="btn btn-danger btn-sm"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
