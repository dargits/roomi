import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppConfig } from '../context/AppConfigContext';
import { IoCalendarOutline, IoChevronDownOutline, IoCubeOutline, IoGridOutline, IoLogOutOutline, IoPeopleOutline, IoSettingsOutline, IoStatsChartOutline, IoTrophyOutline } from 'react-icons/io5';

/**
 * Cấu hình nhóm menu theo role.
 */
const NAV_GROUPS = [
  {
    id: 'dashboard',
    label: 'Tổng quan',
    icon: IoGridOutline,
    items: [
      { path: '/manage/dashboard', label: 'Tổng quan', allowedRoles: null }
    ]
  },
  {
    id: 'booking',
    label: 'Đặt phòng',
    icon: IoCalendarOutline,
    items: [
      { path: '/manage/bookings', label: 'Quản lý đặt phòng', allowedRoles: ['OWNER', 'RECEPTIONIST', 'ADMIN', 'ACCOUNTANT'] },
      { path: '/manage/deposit-policies', label: 'Chính sách đặt cọc', allowedRoles: ['OWNER', 'ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'] }
    ]
  },
  {
    id: 'rooms',
    label: 'Phòng',
    icon: IoLogOutOutline,
    items: [
      { path: '/manage/rooms',        label: 'Sơ đồ phòng',   allowedRoles: ['OWNER', 'RECEPTIONIST', 'ADMIN'] },
      { path: '/manage/room-types',   label: 'Loại phòng',     allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/housekeeping', label: 'Buồng phòng',    allowedRoles: ['OWNER', 'HOUSEKEEPER'] }
    ]
  },
  {
    id: 'guests',
    label: 'Khách & Dịch vụ',
    icon: IoPeopleOutline,
    items: [
      { path: '/manage/guests',         label: 'Khách hàng',           allowedRoles: ['OWNER', 'RECEPTIONIST', 'ADMIN'] },
      { path: '/manage/extra-services', label: 'Dịch vụ phụ thu',    allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/loyalty',        label: 'Khách thân thiết',      allowedRoles: ['OWNER'] }
    ]
  },
  {
    id: 'finance',
    label: 'Tài chính',
    icon: IoStatsChartOutline,
    items: [
      { path: '/manage/reports', label: 'Báo cáo doanh thu & công suất', allowedRoles: ['OWNER', 'ACCOUNTANT', 'ADMIN'] }
    ]
  },
  {
    id: 'system',
    label: 'Hệ thống',
    icon: IoSettingsOutline,
    items: [
      { path: '/manage/staff',       label: 'Nhân sự',               allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/inventory',   label: 'Kho đồ dùng',             allowedRoles: ['OWNER'] },
      { path: '/manage/concurrency', label: 'Kiểm soát đồng thời',   allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/audit-logs',  label: 'Lịch sử hoạt động',    allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/backup',      label: 'Sao lưu & CSV',         allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/settings',    label: 'Cài đặt khách sạn',      allowedRoles: ['OWNER', 'ADMIN'] }
    ]
  }
];

const ROLE_LABEL = {
  OWNER:        'Chủ cơ sở',
  RECEPTIONIST: 'Lễ tân',
  HOUSEKEEPER:  'Buồng phòng',
  ACCOUNTANT:   'Kế toán',
  ADMIN:        'Quản trị viên'
};

/**
 * Dropdown menu item cho một nhóm.
 */
const NavGroup = ({ group, role, location }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Lọc items theo role
  const visibleItems = group.items.filter(item =>
    !item.allowedRoles || item.allowedRoles.includes(role)
  );

  // Đóng khi click ngoài
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (visibleItems.length === 0) return null;

  const isActive = visibleItems.some(item => location.pathname === item.path);

  // Nhóm chỉ có 1 item → render link thẳng
  if (visibleItems.length === 1) {
    const item = visibleItems[0];
    const active = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-normal normal-case text-[14px] tracking-normal transition-all select-none ${
          active
            ? 'bg-surface-blue-light text-primary font-semibold shadow-xs'
            : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
        }`}
      >
        <span>{group.label}</span>
      </Link>
    );
  }

  // Nhiều items → dropdown
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg font-normal normal-case text-[14px] tracking-normal transition-all select-none cursor-pointer border-none ${
          isActive
            ? 'bg-surface-blue-light text-primary font-semibold shadow-xs'
            : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface bg-transparent'
        }`}
      >
        <span>{group.label}</span>
        <IoChevronDownOutline
          size={14}
          className={`transition-transform duration-200 opacity-70 ${open ? 'rotate-180 opacity-100 text-primary' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-surface-container-lowest border border-border-grey rounded-xl shadow-xl py-1.5 z-[100] animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 border-b border-border-grey/60 mb-1">
            <span className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider">
              {group.label}
            </span>
          </div>
          {visibleItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2 font-normal normal-case text-[13.5px] tracking-normal transition-colors ${
                  active
                    ? 'bg-surface-blue-light text-primary font-semibold'
                    : 'text-on-surface hover:bg-surface-container-low hover:text-primary'
                }`}
              >
                <span>{item.label}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { hotelSetting } = useAppConfig();
  const navigate         = useNavigate();
  const location         = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = ROLE_LABEL[user?.role] || user?.role || 'Nhân viên';

  return (
    <div className="min-h-screen bg-surface flex flex-col antialiased">
      {/* ── Top Navbar ── */}
      <nav className="sticky top-0 left-0 w-full z-50 bg-surface-container-lowest border-b border-border-grey shadow-xs">
        <div className="flex justify-between items-center px-4 md:px-6 h-16 max-w-screen-2xl mx-auto w-full">
          {/* Left: Brand + Nav groups */}
          <div className="flex items-center gap-3 md:gap-5">
            {/* Brand Logo */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex flex-col items-center flex-shrink-0 group bg-transparent border-none p-0 cursor-pointer"
            >
              <span className="font-logo font-bold text-[24px] tracking-wide text-primary leading-none uppercase group-hover:opacity-85 transition-opacity">
                {hotelSetting?.propertyName || 'STAYGO'}
              </span>
              <div className="flex gap-1 mt-1">
                {['bg-red-500','bg-yellow-400','bg-green-500','bg-purple-500','bg-blue-500'].map((c, i) => (
                  <div key={i} className={`w-1 h-1 rounded-full ${c} animate-bounce`}
                    style={{ animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-border-grey hidden sm:block" />

            {/* Nav groups */}
            <div className="flex items-center gap-1">
              {NAV_GROUPS.map(group => (
                <NavGroup
                  key={group.id}
                  group={group}
                  role={user?.role}
                  location={location}
                />
              ))}
            </div>
          </div>

          {/* Right: User profile + Logout */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/manage/profile')}
              className="hidden sm:flex flex-col items-end cursor-pointer group bg-transparent border-none p-0 text-right"
            >
              <span className="font-title-sm text-on-surface group-hover:text-primary transition-colors leading-tight text-sm font-semibold normal-case">
                {user?.name || 'Người dùng'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                {roleLabel}
              </span>
            </button>

            <div className="hidden sm:block h-5 w-px bg-border-grey mx-2" />

            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-red-50 border border-transparent hover:border-red-200 transition-all text-sm font-medium normal-case bg-transparent cursor-pointer"
            >
              <IoLogOutOutline size={15} />
              <span className="hidden md:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto p-5 md:p-7 w-full max-w-screen-2xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
