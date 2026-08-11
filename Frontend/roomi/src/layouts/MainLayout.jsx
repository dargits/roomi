import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getRoleLabel } from '../utils/role';
import {
  LayoutDashboard,
  CalendarRange,
  Users as UsersIcon,
  BedDouble,
  TrendingUp,
  ConciergeBell,
  ShieldAlert,
  User,
  Receipt,
  LogOut,
  X,
  UserCheck,
  Menu,
  BarChart3,
  Building2,
  Sparkles,
  ClipboardList,
  Bell
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const MENU_ITEMS = [
  { id: 'dashboard', name: 'Sơ đồ phòng', path: '/dashboard', icon: LayoutDashboard, roles: ['OWNER', 'RECEPTIONIST', 'HOUSEKEEPER', 'ACCOUNTANT'] },
  { id: 'bookings', name: 'Đặt phòng', path: '/bookings', icon: CalendarRange, roles: ['RECEPTIONIST'] },
  { id: 'guests', name: 'Khách hàng', path: '/guests', icon: UsersIcon, roles: ['RECEPTIONIST'] },
  { id: 'rooms', name: 'Phòng & Loại', path: '/rooms', icon: BedDouble, roles: ['OWNER'] },
  { id: 'rates', name: 'Giá theo mùa', path: '/rates', icon: TrendingUp, roles: ['OWNER'] },
  { id: 'invoices', name: 'Hóa đơn & Thanh toán', path: '/invoices', icon: Receipt, roles: ['ACCOUNTANT', 'OWNER', 'RECEPTIONIST'] },
  { id: 'services', name: 'Dịch vụ phụ thu', path: '/services', icon: ConciergeBell, roles: ['OWNER', 'RECEPTIONIST'] },
  { id: 'reports', name: 'Báo cáo doanh thu', path: '/reports', icon: BarChart3, roles: ['OWNER', 'ACCOUNTANT'] },
  { id: 'settings', name: 'Cài đặt cơ sở', path: '/settings', icon: Building2, roles: ['OWNER', 'ADMIN'] },
  { id: 'users', name: 'Nhân viên', path: '/users', icon: ShieldAlert, roles: ['ADMIN'] },
  { id: 'activity-logs', name: 'Nhật ký hoạt động', path: '/activity-logs', icon: ClipboardList, roles: ['ADMIN'] },
  { id: 'profile', name: 'Hồ sơ & Bảo mật', path: '/profile', icon: User, roles: ['OWNER', 'RECEPTIONIST', 'HOUSEKEEPER', 'ACCOUNTANT', 'ADMIN'] },
];

export default function MainLayout() {
  // Get user + auth actions from context (no more prop drilling)
  const { user, cleaningNotifications, setCleaningNotifications, handleLogout } = useAuth();
  const { showNotification } = useNotification();

  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const allowedMenuItems = MENU_ITEMS.filter(item => item.roles.includes(user.role));

  const handleDismissNotification = async (id) => {
    try {
      await api.patch(`/cleaning-notifications/${id}/read`);
      setCleaningNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      showNotification(err.message || 'Không thể đánh dấu đã đọc thông báo', 'error');
    }
  };

  const handleDismissAllNotifications = async () => {
    try {
      await api.post('/cleaning-notifications/read-all');
      setCleaningNotifications([]);
    } catch (err) {
      showNotification(err.message || 'Không thể xóa tất cả thông báo', 'error');
    }
  };

  const handleViewChange = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const currentPath = location.pathname;

  return (
    <div className="dashboard-container">
      {/* Top Navbar */}
      <header className="top-navbar">
        {/* Brand */}
        <div className="navbar-brand" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => handleViewChange('/dashboard')}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0066cc 0%, #0284c7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 10px rgba(0, 102, 204, 0.25)'
          }}>
            <Sparkles size={18} />
          </div>
          <div className="brand-info">
            <h2 className="brand-name">Roomi</h2>
            <span className="brand-sub">Hệ thống quản lý khách sạn</span>
          </div>
        </div>

        {/* Navigation List (Desktop) */}
        <nav className="navbar-menu">
          {allowedMenuItems
            .filter(item => item.id !== 'profile')
            .map((item) => {
              const Icon = item.icon;
              const isActive = currentPath.startsWith(item.path);
              return (
                <button
                  key={item.id}
                  onClick={() => handleViewChange(item.path)}
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
          {/* Notification bell for Housekeeper */}
          {user?.role === 'HOUSEKEEPER' && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: showNotifDropdown ? 'var(--primary-glow)' : 'var(--bg-secondary)',
                  color: cleaningNotifications.length > 0 ? '#b45309' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'var(--transition-fast)'
                }}
                title="Thông báo phòng cần dọn dẹp"
                aria-label={`Thông báo dọn phòng${cleaningNotifications.length > 0 ? `, ${cleaningNotifications.length} thông báo mới` : ''}`}
              >
                <Bell size={18} className={cleaningNotifications.length > 0 ? 'animate-bounce' : ''} />
                {cleaningNotifications.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--bg-secondary)'
                  }}>
                    {cleaningNotifications.length}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '46px',
                  right: '0',
                  width: '320px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 1000,
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '8px',
                    marginBottom: '4px'
                  }}>
                    <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                      Thông báo dọn phòng ({cleaningNotifications.length})
                    </span>
                    {cleaningNotifications.length > 0 && (
                      <button
                        onClick={handleDismissAllNotifications}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        Xóa tất cả
                      </button>
                    )}
                  </div>

                  {cleaningNotifications.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      Không có thông báo mới nào
                    </div>
                  ) : (
                    <div style={{
                      maxHeight: '240px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      {cleaningNotifications.map(notif => (
                        <div
                          key={notif.id}
                          style={{
                            padding: '8px 10px',
                            backgroundColor: '#fffbeb',
                            borderLeft: '3px solid var(--color-cleaning)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <span style={{ color: '#b45309', fontWeight: '500' }}>{notif.message}</span>
                          <button
                            onClick={() => handleDismissNotification(notif.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#b45309',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            aria-label="Đánh dấu đã đọc"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User profile button */}
          <button
            onClick={() => handleViewChange('/profile')}
            className={`navbar-user ${currentPath === '/profile' ? 'active' : ''}`}
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

          {/* Logout button */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="navbar-action-btn logout-btn"
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <LogOut size={16} />
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="navbar-mobile-toggle"
            aria-label="Mở/đóng menu điều hướng"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu - Bottom Sheet */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <nav className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">Điều hướng</div>

            {allowedMenuItems
              .filter(item => item.id !== 'profile')
              .map((item) => {
              const Icon = item.icon;
              const isActive = currentPath.startsWith(item.path);
              return (
                <button
                  key={item.id}
                  onClick={() => handleViewChange(item.path)}
                  className={`mobile-menu-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={20} />
                  <span>{item.name}</span>
                </button>
              );
            })}

            <div className="mobile-menu-divider" />

            {/* User Profile Mobile */}
            <div className="mobile-menu-user">
              <div className="user-avatar">
                <User size={18} />
              </div>
              <div className="user-meta" style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="user-name" style={{ maxWidth: '200px' }}>{user.fullName}</span>
                <span className="user-role" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                  <UserCheck size={11} />
                  <span>{getRoleLabel(user.role)}</span>
                </span>
              </div>
            </div>

            {/* Profile button */}
            <button
              onClick={() => handleViewChange('/profile')}
              className={`mobile-menu-item ${currentPath === '/profile' ? 'active' : ''}`}
            >
              <User size={20} />
              <span>Hồ sơ &amp; Bảo mật</span>
            </button>

            <div className="mobile-menu-actions">
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
        <div className="animate-fade-in" style={{ width: '100%' }}>
          <Outlet />
        </div>
      </main>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '17px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-maintenance)' }}>
                <LogOut size={18} />
                Xác nhận đăng xuất
              </h2>
              <button onClick={() => setShowLogoutConfirm(false)} aria-label="Đóng">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="btn btn-secondary btn-sm"
              >
                Hủy bỏ
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
    </div>
  );
}
