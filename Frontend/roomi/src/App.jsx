import React, { useState, useEffect } from 'react';
import api from './utils/api';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Bookings from './components/Bookings';
import Guests from './components/Guests';
import Rooms from './components/Rooms';
import Rates from './components/Rates';
import Services from './components/Services';
import Users from './components/Users';
import Profile from './components/Profile';
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
  Moon,
  Sun,
  UserCheck
} from 'lucide-react';

function App() {
  const [token, setToken] = useState(localStorage.getItem('roomi_token') || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

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

  const handleLogin = (newToken) => {
    localStorage.setItem('roomi_token', newToken);
    setToken(newToken);
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

  // If user is not authenticated, render Login/Register
  if (!token || !user) {
    return (
      <>
        <Login onLoginSuccess={handleLogin} showNotification={showNotification} />
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
    { id: 'bookings', name: 'Đặt phòng', icon: CalendarRange, roles: ['OWNER', 'RECEPTIONIST', 'ACCOUNTANT', 'ADMIN'] },
    { id: 'guests', name: 'Khách hàng', icon: UsersIcon, roles: ['OWNER', 'RECEPTIONIST', 'ADMIN'] },
    { id: 'rooms', name: 'Phòng & Loại', icon: BedDouble, roles: ['OWNER', 'ADMIN'] },
    { id: 'rates', name: 'Giá theo mùa', icon: TrendingUp, roles: ['OWNER', 'RECEPTIONIST', 'ACCOUNTANT', 'ADMIN'] },
    { id: 'services', name: 'Dịch vụ phụ thu', icon: ConciergeBell, roles: ['OWNER', 'RECEPTIONIST', 'ADMIN'] },
    { id: 'users', name: 'Nhân viên', icon: ShieldAlert, roles: ['ADMIN'] },
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
      {/* Sidebar Navigation */}
      <aside style={{
        width: '260px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        height: '100vh',
        position: 'sticky',
        top: 0
      }}>
        {/* Brand Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '32px',
          paddingLeft: '8px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            R
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Roomi</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hotel Management System</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {allowedMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isActive ? 'var(--primary-glow)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '14px',
                  transition: 'var(--transition-fast)',
                  outline: 'none'
                }}
              >
                <Icon size={18} color={isActive ? 'var(--primary)' : 'var(--text-secondary)'} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer / User Section */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* User profile link */}
          <button 
            onClick={() => setCurrentView('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'left',
              transition: 'var(--transition-fast)'
            }}
            className="btn-secondary"
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <User size={18} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {user.fullName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <UserCheck size={10} />
                <span>{user.role}</span>
              </div>
            </div>
          </button>

          {/* Theme & Logout Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '8px' }}
              title="Đổi giao diện"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '8px', color: 'var(--color-maintenance)' }}
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {renderActiveView()}
      </main>

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
