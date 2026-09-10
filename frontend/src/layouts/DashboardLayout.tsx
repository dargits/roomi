import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
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
  IoKeyOutline,
  IoMenuOutline,
  IoCloseOutline,
  IoGlobeOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoOpenOutline
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

export const NAV_GROUPS: NavGroupConfig[] = [
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

export const ROLE_LABEL: Record<string, string> = {
  OWNER:        'Chủ sở hữu',
  RECEPTIONIST: 'Lễ tân',
  HOUSEKEEPER:  'Buồng phòng',
  ACCOUNTANT:   'Kế toán',
  ADMIN:        'Quản trị viên'
};

export const ROLE_BADGE_STYLE: Record<string, string> = {
  OWNER:        'bg-amber-50 text-amber-700 border-amber-300',
  ADMIN:        'bg-rose-50 text-rose-700 border-rose-300',
  RECEPTIONIST: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  ACCOUNTANT:   'bg-purple-50 text-purple-700 border-purple-300',
  HOUSEKEEPER:  'bg-cyan-50 text-cyan-700 border-cyan-300'
};

const ROUTE_META_MAP: Record<string, { title: string; group: string }> = {
  '/manage/dashboard': { title: 'Tổng Quan Hệ Thống', group: 'Tổng quan' },
  '/manage/bookings': { title: 'Quản Lý Đặt Phòng', group: 'Đặt phòng' },
  '/manage/stay-declarations': { title: 'Khai Báo Lưu Trú', group: 'Đặt phòng' },
  '/manage/deposit-policies': { title: 'Chính Sách Đặt Cọc', group: 'Đặt phòng' },
  '/manage/rooms': { title: 'Sơ Đồ Phòng', group: 'Phòng' },
  '/manage/room-types': { title: 'Quản Lý Loại Phòng', group: 'Phòng' },
  '/manage/housekeeping': { title: 'Quản Lý Buồng Phòng', group: 'Phòng' },
  '/manage/guests': { title: 'Quản Lý Khách Hàng', group: 'Khách & Dịch vụ' },
  '/manage/extra-services': { title: 'Dịch Vụ Phụ Thu', group: 'Khách & Dịch vụ' },
  '/manage/loyalty': { title: 'Khách Thân Thiết', group: 'Khách & Dịch vụ' },
  '/manage/reports': { title: 'Báo Cáo Doanh Thu & Công Suất', group: 'Tài chính' },
  '/manage/cashier-shifts': { title: 'Chốt Ca & Đối Soát Tiền Mặt', group: 'Tài chính' },
  '/manage/staff': { title: 'Quản Lý Nhân Sự', group: 'Hệ thống' },
  '/manage/inventory': { title: 'Kho Đồ Dùng', group: 'Hệ thống' },
  '/manage/concurrency': { title: 'Kiểm Soát Đồng Thời', group: 'Hệ thống' },
  '/manage/audit-logs': { title: 'Lịch Sử Hoạt Động', group: 'Hệ thống' },
  '/manage/personal-data-audit': { title: 'Nhật Ký Dữ Liệu Cá Nhân', group: 'Hệ thống' },
  '/manage/backup': { title: 'Sao Lưu & Xuất Dữ Liệu', group: 'Hệ thống' },
  '/manage/settings': { title: 'Cài Đặt Khách Sạn', group: 'Hệ thống' },
  '/manage/profile': { title: 'Hồ Sơ Cá Nhân', group: 'Cá nhân' }
};

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { hotelSetting } = useAppConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingCount: pendingResetCount } = usePasswordResetNotification();
  const [showPasswordResetModal, setShowPasswordResetModal] = useState<boolean>(false);

  // Responsive mobile drawer state
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Collapsible sidebar state (persisted)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('staygo_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('staygo_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Accordion open/close state for nav groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g) => {
      initial[g.id] = g.items.some((item) => item.path === location.pathname);
    });
    return initial;
  });

  // Auto-expand group containing the active path
  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((g) =>
      g.items.some((item) => item.path === location.pathname)
    );
    if (activeGroup) {
      setOpenGroups((prev) => ({ ...prev, [activeGroup.id]: true }));
    }
    // Close mobile drawer on route change
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = (user?.role && ROLE_LABEL[user.role]) || user?.role || 'Nhân viên';
  const roleBadgeStyle = (user?.role && ROLE_BADGE_STYLE[user.role]) || 'bg-neutral-100 text-neutral-700 border-neutral-300';
  const currentRouteMeta = ROUTE_META_MAP[location.pathname] || { title: 'Quản Trị Hệ Thống', group: 'Hệ thống' };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f8fafc] text-on-surface flex flex-col antialiased">
      <div className="flex flex-1 h-full overflow-hidden relative">
        
        {/* Mobile Backdrop */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          />
        )}

        {/* ── Left Sidebar (Desktop + Mobile Drawer) ── */}
        <aside
          className={`
            fixed lg:static top-0 bottom-0 left-0 z-50
            flex flex-col bg-surface-container-lowest border-r border-border-grey shadow-xs
            transition-all duration-300 ease-in-out select-none
            ${mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
            ${isCollapsed ? 'lg:w-[76px]' : 'lg:w-64'}
          `}
        >
          {/* Sidebar Header: Brand & Logo */}
          <div className="h-16 px-4 border-b border-border-grey flex items-center justify-between shrink-0 bg-white">
            <Link
              to="/"
              className="flex items-center gap-2.5 overflow-hidden group py-1"
              title="Về trang chủ"
            >
              <div className="flex flex-col">
                <span className={`font-logo font-bold text-primary leading-none uppercase tracking-wide group-hover:opacity-85 transition-all ${
                  isCollapsed ? 'lg:hidden text-[20px]' : 'text-[22px]'
                }`}>
                  {hotelSetting?.propertyName || 'STAYGO'}
                </span>
                <div className={`flex gap-1 mt-1.5 ${isCollapsed ? 'lg:hidden' : ''}`}>
                  {['bg-[#E53935]', 'bg-[#FDD835]', 'bg-[#43A047]', 'bg-[#8E24AA]', 'bg-[#1E88E5]'].map((c, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${c} animate-bounce`}
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon fallback when collapsed */}
              {isCollapsed && (
                <div className="hidden lg:flex w-10 h-10 rounded-xl bg-primary/10 items-center justify-center text-primary font-bold font-logo text-xl">
                  {hotelSetting?.propertyName?.[0] || 'S'}
                </div>
              )}
            </Link>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg cursor-pointer"
              title="Đóng menu"
            >
              <IoCloseOutline size={22} />
            </button>
          </div>

          {/* Sidebar Navigation Items */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1.5 sidebar-scroll">
            {NAV_GROUPS.map((group) => {
              const visibleItems = group.items.filter((item) =>
                !item.allowedRoles || (user?.role && item.allowedRoles.includes(user.role))
              );

              if (visibleItems.length === 0) return null;

              const isGroupActive = visibleItems.some((item) => location.pathname === item.path);
              const isGroupOpen = !!openGroups[group.id];
              const GroupIcon = group.icon;
              const hasMultiple = visibleItems.length > 1;

              // Single item direct link
              if (!hasMultiple) {
                const singleItem = visibleItems[0];
                const active = location.pathname === singleItem.path;
                const ItemIcon = singleItem.icon || GroupIcon;

                return (
                  <div key={group.id} className="relative group/tooltip">
                    <Link
                      to={singleItem.path}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-[13.5px] transition-all
                        ${active
                          ? 'bg-primary text-white font-bold shadow-sm'
                          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
                        }
                        ${isCollapsed ? 'justify-center px-0' : ''}
                      `}
                      title={isCollapsed ? singleItem.label : undefined}
                    >
                      <ItemIcon size={20} className={`shrink-0 ${active ? 'text-white' : 'text-primary/80'}`} />
                      <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{singleItem.label}</span>
                    </Link>

                    {/* Tooltip on collapsed desktop mode */}
                    {isCollapsed && (
                      <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-neutral-900 text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity z-50">
                        {singleItem.label}
                      </div>
                    )}
                  </div>
                );
              }

              // Multi-item group with Accordion & Collapsed hover popover
              return (
                <div key={group.id} className="relative group/tooltip">
                  {/* Group Trigger Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isCollapsed) {
                        setIsCollapsed(false);
                      }
                      toggleGroup(group.id);
                    }}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-[13.5px] transition-all cursor-pointer
                      ${isGroupActive && !isGroupOpen
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                      }
                      ${isCollapsed ? 'justify-center px-0' : ''}
                    `}
                    title={isCollapsed ? group.label : undefined}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <GroupIcon size={20} className={`shrink-0 ${isGroupActive ? 'text-primary' : 'text-on-surface-variant/80'}`} />
                      <span className={`truncate font-semibold ${isCollapsed ? 'lg:hidden' : ''}`}>{group.label}</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${isCollapsed ? 'lg:hidden' : ''}`}>
                      {group.id === 'system' && pendingResetCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-red-600 text-white rounded-full animate-pulse">
                          {pendingResetCount}
                        </span>
                      )}
                      <IoChevronDownOutline
                        size={14}
                        className={`transition-transform duration-200 text-on-surface-variant/70 ${isGroupOpen ? 'rotate-180 text-primary' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Accordion Submenu (when expanded) */}
                  {!isCollapsed && isGroupOpen && (
                    <div className="mt-1 pl-4 pr-1 space-y-1 border-l-2 border-primary/20 ml-5 py-1">
                      {visibleItems.map((item) => {
                        const active = location.pathname === item.path;
                        const ItemIcon = item.icon;
                        const isStaffReset = item.path === '/manage/staff' && pendingResetCount > 0;

                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`
                              flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all
                              ${active
                                ? 'bg-primary text-white font-bold shadow-xs'
                                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
                              }
                            `}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              {ItemIcon && (
                                <ItemIcon size={16} className={`shrink-0 ${active ? 'text-white' : 'text-on-surface-variant/60'}`} />
                              )}
                              <span className="truncate">{item.label}</span>
                            </div>
                            {isStaffReset && (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-red-100 text-red-700 rounded-full border border-red-200">
                                {pendingResetCount}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* Floating Popover when Collapsed on Desktop */}
                  {isCollapsed && (
                    <div className="hidden lg:block absolute left-full top-0 ml-3 w-56 bg-white border border-border-grey rounded-2xl shadow-xl p-2 opacity-0 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:pointer-events-auto transition-all duration-150 z-50">
                      <div className="px-3 py-1.5 mb-1.5 border-b border-border-grey/50 font-bold text-xs text-primary flex items-center gap-2">
                        <GroupIcon size={16} />
                        <span>{group.label}</span>
                      </div>
                      <div className="space-y-0.5">
                        {visibleItems.map((item) => {
                          const active = location.pathname === item.path;
                          const ItemIcon = item.icon;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`
                                flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors
                                ${active
                                  ? 'bg-primary text-white font-bold'
                                  : 'text-on-surface hover:bg-surface-container-low hover:text-primary'
                                }
                              `}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {ItemIcon && <ItemIcon size={14} className={active ? 'text-white' : 'text-on-surface-variant/70'} />}
                                <span className="truncate">{item.label}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sidebar Footer: Collapse Toggle & Profile Info */}
          <div className="p-3 border-t border-border-grey bg-surface-container-lowest flex flex-col gap-2 shrink-0">
            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              onClick={toggleCollapse}
              className={`
                hidden lg:flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors cursor-pointer
                ${isCollapsed ? 'justify-center px-0' : ''}
              `}
              title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            >
              {isCollapsed ? (
                <IoChevronForwardOutline size={18} />
              ) : (
                <>
                  <IoChevronBackOutline size={18} />
                  <span>Thu gọn thanh menu</span>
                </>
              )}
            </button>

            {/* User Profile Mini Badge */}
            <div className={`flex items-center gap-2.5 p-2 rounded-xl bg-surface-container-low/60 border border-border-grey/50 ${
              isCollapsed ? 'justify-center p-1.5' : ''
            }`}>
              {user?.avatarImage ? (
                <img
                  src={user.avatarImage}
                  alt={user?.name || 'Tài khoản'}
                  className="w-8 h-8 rounded-full object-cover border border-border-grey shrink-0 shadow-xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {user?.name?.[0] || 'U'}
                </div>
              )}
              <div className={`flex-1 min-w-0 ${isCollapsed ? 'lg:hidden' : ''}`}>
                <p className="text-xs font-bold text-on-surface truncate leading-tight">
                  {user?.name || 'Tài khoản'}
                </p>
                <span className={`inline-block mt-0.5 text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${roleBadgeStyle}`}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Area Column (Header + Content) ── */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          
          {/* Topbar Header */}
          <header className="h-16 px-4 md:px-6 bg-white border-b border-border-grey flex items-center justify-between shrink-0 shadow-xs z-30">
            {/* Left: Hamburger & Breadcrumbs */}
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth >= 1024) {
                    toggleCollapse();
                  } else {
                    setMobileOpen(true);
                  }
                }}
                className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer shrink-0"
                title="Đóng / Mở Menu"
              >
                <IoMenuOutline size={24} />
              </button>

              {/* Breadcrumb Info */}
              <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-on-surface-variant truncate">
                <span className="hidden sm:inline text-on-surface-variant/60">{currentRouteMeta.group}</span>
                <span className="hidden sm:inline text-on-surface-variant/40">/</span>
                <h1 className="font-title-md font-bold text-on-surface truncate text-sm md:text-base">
                  {currentRouteMeta.title}
                </h1>
              </div>
            </div>

            {/* Right: Quick Actions + Account */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              
              {/* Quick Password Reset Alert Button for Admin/Owner */}
              {pendingResetCount > 0 && (user?.role === 'ADMIN' || user?.role === 'OWNER') && (
                <button
                  type="button"
                  onClick={() => setShowPasswordResetModal(true)}
                  className="btn-shimmer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-all text-xs font-semibold cursor-pointer shadow-xs animate-fade-in"
                  title={`Có ${pendingResetCount} yêu cầu cấp lại mật khẩu từ nhân viên đang chờ duyệt`}
                >
                  <IoKeyOutline size={16} className="text-amber-700 animate-bounce shrink-0" />
                  <span className="hidden md:inline">Cấp lại MK:</span>
                  <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-bold">
                    {pendingResetCount}
                  </span>
                </button>
              )}

              {/* View Public Website */}
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-primary bg-primary/10 hover:bg-primary hover:text-white transition-all cursor-pointer"
                title="Mở website đặt phòng của khách trong tab mới"
              >
                <IoGlobeOutline size={15} />
                <span>Xem Website</span>
                <IoOpenOutline size={12} className="opacity-70" />
              </a>

              <div className="hidden sm:block h-6 w-px bg-border-grey" />

              {/* Profile Link */}
              <button
                type="button"
                onClick={() => navigate('/manage/profile')}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer text-left"
                title="Cài đặt hồ sơ cá nhân"
              >
                {user?.avatarImage ? (
                  <img
                    src={user.avatarImage}
                    alt={user?.name || 'Tài khoản'}
                    className="w-8 h-8 rounded-full object-cover border border-primary/20 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                    {user?.name?.[0] || 'U'}
                  </div>
                )}
                <div className="hidden md:flex flex-col">
                  <span className="text-xs font-bold text-on-surface leading-tight truncate max-w-[120px]">
                    {user?.name || 'Tài khoản'}
                  </span>
                  <span className="text-[10px] text-on-surface-variant font-medium">
                    {roleLabel}
                  </span>
                </div>
              </button>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl text-on-surface-variant hover:text-error hover:bg-red-50 transition-colors cursor-pointer"
                title="Đăng xuất khỏi hệ thống"
              >
                <IoLogOutOutline size={20} />
              </button>
            </div>
          </header>

          {/* Main Scrollable Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#f8fafc] w-full">
            <div key={location.pathname} className="max-w-screen-2xl mx-auto animate-page-enter">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Modal Quản trị viên cấp lại mật khẩu tạm */}
      <PasswordResetManagementModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
      />
    </div>
  );
};

export default DashboardLayout;
