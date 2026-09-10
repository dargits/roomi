import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation, Location } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppConfig } from '../context/AppConfigContext';
import { Role } from '../types';
import { 
  IoCalendarOutline, 
  IoChevronDownOutline, 
  IoCubeOutline, 
  IoGridOutline, 
  IoLogOutOutline, 
  IoPeopleOutline, 
  IoSettingsOutline, 
  IoStatsChartOutline, 
  IoTrophyOutline,
  IoDocumentTextOutline,
  IoCashOutline,
  IoBedOutline,
  IoLayersOutline,
  IoSparklesOutline,
  IoPersonOutline,
  IoShieldCheckmarkOutline,
  IoCloudDownloadOutline,
  IoLockClosedOutline,
  IoTimeOutline,
  IoKeyOutline
} from 'react-icons/io5';
import usePasswordResetNotification from '../hooks/usePasswordResetNotification';
import PasswordResetManagementModal from '../features/admin/PasswordResetManagementModal';

export interface NavItem {
  path: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  allowedRoles: Role[] | null;
}

export interface NavGroupConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: NavItem[];
}

const NAV_GROUPS: NavGroupConfig[] = [
  {
    id: 'dashboard',
    label: 'Tổng quan',
    icon: IoGridOutline,
    items: [
      { path: '/manage/dashboard', label: 'Tổng quan', icon: IoGridOutline, allowedRoles: null }
    ]
  },
  {
    id: 'booking',
    label: 'Đặt phòng',
    icon: IoCalendarOutline,
    items: [
      { path: '/manage/bookings', label: 'Quản lý đặt phòng', icon: IoCalendarOutline, allowedRoles: ['OWNER', 'RECEPTIONIST', 'ADMIN', 'ACCOUNTANT'] },
      { path: '/manage/stay-declarations', label: 'Khai báo lưu trú', icon: IoDocumentTextOutline, allowedRoles: ['OWNER', 'RECEPTIONIST', 'ADMIN'] },
      { path: '/manage/deposit-policies', label: 'Chính sách đặt cọc', icon: IoCashOutline, allowedRoles: ['OWNER', 'ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'] }
    ]
  },
  {
    id: 'rooms',
    label: 'Phòng',
    icon: IoBedOutline,
    items: [
      { path: '/manage/rooms',        label: 'Sơ đồ phòng',   icon: IoLayersOutline,   allowedRoles: ['OWNER', 'RECEPTIONIST', 'ADMIN'] },
      { path: '/manage/room-types',   label: 'Loại phòng',     icon: IoBedOutline,      allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/housekeeping', label: 'Buồng phòng',    icon: IoSparklesOutline, allowedRoles: ['OWNER', 'RECEPTIONIST', 'ADMIN', 'HOUSEKEEPER'] }
    ]
  },
  {
    id: 'guests',
    label: 'Khách & Dịch vụ',
    icon: IoPeopleOutline,
    items: [
      { path: '/manage/guests',         label: 'Khách hàng',           icon: IoPeopleOutline,  allowedRoles: ['OWNER', 'RECEPTIONIST', 'ADMIN'] },
      { path: '/manage/extra-services', label: 'Dịch vụ phụ thu',    icon: IoCubeOutline,    allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/loyalty',        label: 'Khách thân thiết',      icon: IoTrophyOutline,  allowedRoles: ['OWNER'] }
    ]
  },
  {
    id: 'finance',
    label: 'Tài chính',
    icon: IoStatsChartOutline,
    items: [
      { path: '/manage/reports', label: 'Báo cáo doanh thu & công suất', icon: IoStatsChartOutline, allowedRoles: ['OWNER', 'ACCOUNTANT', 'ADMIN'] },
      { path: '/manage/cashier-shifts', label: 'Chốt ca & đối soát', icon: IoCashOutline, allowedRoles: ['OWNER', 'ACCOUNTANT', 'RECEPTIONIST'] }
    ]
  },
  {
    id: 'system',
    label: 'Hệ thống',
    icon: IoSettingsOutline,
    items: [
      { path: '/manage/staff',               label: 'Nhân sự',                    icon: IoPersonOutline,           allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/inventory',           label: 'Kho đồ dùng',                  icon: IoCubeOutline,             allowedRoles: ['OWNER'] },
      { path: '/manage/concurrency',         label: 'Kiểm soát đồng thời',        icon: IoLockClosedOutline,       allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/audit-logs',          label: 'Lịch sử hoạt động',         icon: IoTimeOutline,             allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/personal-data-audit', label: 'Nhật ký dữ liệu cá nhân',   icon: IoShieldCheckmarkOutline,  allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/backup',              label: 'Sao lưu & CSV',              icon: IoCloudDownloadOutline,    allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/settings',            label: 'Cài đặt khách sạn',           icon: IoSettingsOutline,         allowedRoles: ['OWNER', 'ADMIN'] }
    ]
  }
];

const ROLE_LABEL: Record<string, string> = {
  OWNER:        'Chủ sở hữu',
  RECEPTIONIST: 'Lễ tân',
  HOUSEKEEPER:  'Buồng phòng',
  ACCOUNTANT:   'Kế toán',
  ADMIN:        'Quản trị viên'
};

interface NavGroupProps {
  group: NavGroupConfig;
  role?: Role;
  location: Location;
  pendingResetCount: number;
}

const NavGroup: React.FC<NavGroupProps> = ({ group, role, location, pendingResetCount }) => {
  const [open, setOpen] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);

  const visibleItems = group.items.filter((item) =>
    !item.allowedRoles || (role && item.allowedRoles.includes(role))
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (visibleItems.length === 0) return null;

  const isActive = visibleItems.some((item) => location.pathname === item.path);
  const GroupIcon = group.icon;

  if (visibleItems.length === 1) {
    const item = visibleItems[0];
    const active = location.pathname === item.path;
    const ItemIcon = item.icon || GroupIcon;
    return (
      <Link
        to={item.path}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-none font-medium text-[13.5px] transition-all select-none ${
          active
            ? 'bg-primary/10 text-primary font-bold shadow-xs'
            : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
        }`}
      >
        <ItemIcon size={16} className={active ? 'text-primary' : 'text-on-surface-variant'} />
        <span>{group.label}</span>
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-none font-medium text-[13.5px] transition-all select-none cursor-pointer border border-transparent ${
          isActive
            ? 'bg-primary/10 text-primary font-bold shadow-xs border-primary/20'
            : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
        } ${open ? 'bg-surface-container-low text-on-surface' : ''}`}
      >
        <GroupIcon size={16} className={isActive ? 'text-primary' : 'text-on-surface-variant'} />
        <span>{group.label}</span>
        {group.id === 'system' && pendingResetCount > 0 && (
          <span className="px-1.5 py-0.2 text-[10px] font-extrabold bg-red-600 text-white rounded-full animate-pulse" title={`Có ${pendingResetCount} yêu cầu cấp lại mật khẩu`}>
            {pendingResetCount}
          </span>
        )}
        <IoChevronDownOutline
          size={13}
          className={`transition-transform duration-200 ml-0.5 ${open ? 'rotate-180 text-primary' : 'opacity-60'}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-border-grey rounded-none shadow-lg p-1 z-[100] animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2 border-b border-border-grey/50 mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-wider flex items-center gap-1.5">
              <GroupIcon size={14} className="text-primary" /> {group.label}
            </span>
            <span className="text-[10px] text-on-surface-variant/50 font-medium">{visibleItems.length} mục</span>
          </div>
          <div className="space-y-0.5">
            {visibleItems.map((item) => {
              const active = location.pathname === item.path;
              const ItemIcon = item.icon;
              const isStaffReset = item.path === '/manage/staff' && pendingResetCount > 0;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-none font-medium text-[13px] transition-all duration-150 ${
                    active
                      ? 'bg-primary text-white font-bold'
                      : 'text-on-surface hover:bg-surface-container-low hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {ItemIcon && (
                      <ItemIcon size={16} className={active ? 'text-white' : 'text-on-surface-variant/70'} />
                    )}
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isStaffReset && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full border border-red-200 shrink-0">
                      {pendingResetCount} chờ cấp
                    </span>
                  )}
                  {active && !isStaffReset && <span className="w-1.5 h-1.5 bg-white ml-2 flex-shrink-0" />}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { hotelSetting } = useAppConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingCount: pendingResetCount } = usePasswordResetNotification();
  const [showPasswordResetModal, setShowPasswordResetModal] = useState<boolean>(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = (user?.role && ROLE_LABEL[user.role]) || user?.role || 'Nhân viên';

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
                {['bg-red-500', 'bg-yellow-400', 'bg-green-500', 'bg-purple-500', 'bg-blue-500'].map((c, i) => (
                  <div
                    key={i}
                    className={`w-1 h-1 rounded-full ${c} animate-bounce`}
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-border-grey hidden sm:block" />

            {/* Nav groups */}
            <div className="flex items-center gap-1">
              {NAV_GROUPS.map((group) => (
                <NavGroup
                  key={group.id}
                  group={group}
                  role={user?.role}
                  location={location}
                  pendingResetCount={pendingResetCount}
                />
              ))}
            </div>
          </div>

          {/* Right: Notification + User profile + Logout */}
          <div className="flex items-center gap-2">
            {/* Quick Password Reset Alert Button for Admin/Owner */}
            {pendingResetCount > 0 && (user?.role === 'ADMIN' || user?.role === 'OWNER') && (
              <button
                type="button"
                onClick={() => setShowPasswordResetModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-all text-xs font-semibold cursor-pointer shadow-xs animate-fade-in"
                title={`Có ${pendingResetCount} yêu cầu cấp lại mật khẩu từ nhân viên đang chờ duyệt (Tại: Hệ thống → Nhân sự)`}
              >
                <IoKeyOutline size={16} className="text-amber-700 animate-bounce shrink-0" />
                <span className="hidden sm:inline">Cấp lại MK:</span>
                <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-bold">
                  {pendingResetCount}
                </span>
              </button>
            )}

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
        <div key={location.pathname} className="animate-page-enter">
          <Outlet />
        </div>
      </main>

      {/* Modal Quản trị viên cấp lại mật khẩu tạm */}
      <PasswordResetManagementModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
      />
    </div>
  );
};

export default DashboardLayout;
