import React from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppConfig } from '../context/AppConfigContext';
import { LogOut } from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { hotelSetting } = useAppConfig();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Tổng quan' },
    { path: '/rooms', label: 'Sơ đồ Phòng' },
    { path: '/bookings', label: 'Quản lý Đặt phòng' },
    { path: '/guests', label: 'Khách hàng' },
    { path: '/room-types', label: 'Loại phòng' },
    { path: '/extra-services', label: 'Dịch vụ phụ thu' },
    { path: '/settings', label: 'Cài đặt Khách sạn' }
  ];

  if (user?.role === 'OWNER' || user?.role === 'ADMIN') {
    navItems.push({ path: '/staff', label: 'Nhân sự' });
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col antialiased">
      {/* Top Navbar */}
      <nav className="sticky top-0 left-0 w-full z-50 flex justify-between items-center px-margin-desktop h-16 bg-surface-container-lowest border-b border-border-grey shadow-sm">
        <div className="flex items-center gap-gutter">
          {/* Brand Logo */}
          <a className="flex items-center select-none cursor-pointer" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
            <div className="flex flex-col items-center group">
              <span className="font-logo font-bold text-[32px] tracking-wide text-primary leading-none uppercase group-hover:opacity-90 transition-opacity">
                {hotelSetting?.propertyName || 'STAYGO'}
              </span>
              <div className="flex gap-1.5 mt-1.5">
                <div className="w-2 h-2 rounded-full bg-[#E53935] animate-bounce [animation-delay:0ms]"></div>
                <div className="w-2 h-2 rounded-full bg-[#FDD835] animate-bounce [animation-delay:150ms]"></div>
                <div className="w-2 h-2 rounded-full bg-[#43A047] animate-bounce [animation-delay:300ms]"></div>
                <div className="w-2 h-2 rounded-full bg-[#8E24AA] animate-bounce [animation-delay:450ms]"></div>
                <div className="w-2 h-2 rounded-full bg-[#1E88E5] animate-bounce [animation-delay:600ms]"></div>
              </div>
            </div>
          </a>

          {/* Navigation Links */}
          <div className="hidden md:flex gap-6 ml-8">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.path}
                  to={item.path} 
                  className={`font-body-md text-body-md transition-colors duration-200 py-5 ${isActive ? 'text-primary border-b-2 border-primary font-semibold' : 'text-on-surface-variant hover:text-primary border-b-2 border-transparent'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center">
          <div 
            className="flex items-center cursor-pointer group"
            onClick={() => navigate('/profile')}
            title="Xem hồ sơ cá nhân"
          >
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-title-sm text-on-surface group-hover:text-primary transition-colors">{user?.name || 'User'}</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-surface-blue-light text-primary border border-primary/10">
                {user?.role || 'Nhân viên'}
              </span>
            </div>
          </div>
          
          <div className="h-4 w-px bg-border-grey mx-4 hidden sm:block"></div>
          
          <a 
            onClick={handleLogout}
            className="flex items-center justify-center px-3 py-2 rounded-md text-on-surface-variant hover:text-error hover:bg-error/10 hover:border-error/20 border border-transparent transition-all font-title-sm gap-2 cursor-pointer select-none"
            title="Đăng xuất"
          >
            <LogOut size={20} strokeWidth={1.5} />
            <span className="hidden sm:inline">Đăng xuất</span>
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 md:p-8 w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
