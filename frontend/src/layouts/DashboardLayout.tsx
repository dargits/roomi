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
  IoBookOutline,
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
  IoOpenOutline,
  IoSyncOutline
} from 'react-icons/io5';
import usePasswordResetNotification from '../hooks/usePasswordResetNotification';
import PasswordResetManagementModal from '../features/admin/PasswordResetManagementModal';
import NotificationBell from '../features/notifications/NotificationBell';

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
      { path: '/manage/in-house-guests', label: 'Khách đang lưu trú', icon: IoBedOutline, allowedRoles: ['OWNER', 'RECEPTIONIST', 'ADMIN', 'ACCOUNTANT'] },
      { path: '/manage/stay-declarations', label: 'Khai báo lưu trú', icon: IoDocumentTextOutline, allowedRoles: ['OWNER', 'RECEPTIONIST', 'ADMIN'] },
      { path: '/manage/deposit-policies', label: 'Chính sách đặt cọc', icon: IoCashOutline, allowedRoles: ['OWNER', 'ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'] },
      { path: '/manage/channels', label: 'Đồng bộ lịch kênh (iCal)', icon: IoSyncOutline, allowedRoles: ['OWNER', 'ADMIN'] }
    ]
  },
  {
    id: 'rooms',
    label: 'Phòng',
    icon: IoBedOutline,
    items: [
      { path: '/manage/rooms',        label: 'Sơ đồ phòng',   icon: IoLayersOutline,   allowedRoles: ['OWNER', 'RECEPTIONIST', 'ADMIN'] },
      { path: '/manage/room-types',   label: 'Loại phòng',     icon: IoBedOutline,      allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/housekeeping', label: 'Buồng phòng',    icon: IoSparklesOutline, allowedRoles: ['OWNER', 'RECEPTIONIST', 'ADMIN', 'HOUSEKEEPER'] },
      { path: '/manage/lost-and-found', label: 'Đồ khách để quên', icon: IoCubeOutline, allowedRoles: ['OWNER', 'RECEPTIONIST', 'ADMIN', 'HOUSEKEEPER'] }
    ]
  },
  {
    id: 'guests',
    label: 'Khách & Dịch vụ',
    icon: IoPeopleOutline,
    items: [
      { path: '/manage/guests',              label: 'Khách hàng',           icon: IoPeopleOutline,      allowedRoles: ['OWNER', 'RECEPTIONIST', 'ADMIN'] },
      { path: '/manage/corporate-clients',   label: 'Khách công ty',        icon: IoDocumentTextOutline, allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/negotiated-prices',   label: 'Thỏa thuận giá',       icon: IoStatsChartOutline,  allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/extra-services',      label: 'Dịch vụ phụ thu',      icon: IoCubeOutline,        allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/loyalty',             label: 'Khách thân thiết',      icon: IoTrophyOutline,      allowedRoles: ['OWNER'] }
    ]
  },
  {
    id: 'finance',
    label: 'Tài chính',
    icon: IoStatsChartOutline,
    items: [
      { path: '/manage/reports', label: 'Báo cáo doanh thu & công suất', icon: IoStatsChartOutline, allowedRoles: ['OWNER', 'ACCOUNTANT', 'ADMIN'] },
      { path: '/manage/cashier-shifts', label: 'Chốt ca & đối soát', icon: IoCashOutline, allowedRoles: ['OWNER', 'ACCOUNTANT', 'RECEPTIONIST'] },
      { path: '/manage/daily-ledger', label: 'Sổ quỹ ngày', icon: IoBookOutline, allowedRoles: ['OWNER', 'ACCOUNTANT'] }
    ]
  },
  {
    id: 'system',
    label: 'Hệ thống',
    icon: IoSettingsOutline,
    items: [
      { path: '/manage/staff',               label: 'Nhân sự',                    icon: IoPersonOutline,           allowedRoles: ['OWNER', 'ADMIN'] },
      { path: '/manage/sessions',            label: 'Phiên đăng nhập',            icon: IoKeyOutline,              allowedRoles: ['OWNER', 'ADMIN'] },
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
  '/manage/in-house-guests': { title: 'Danh Sách Khách Đang Lưu Trú', group: 'Đặt phòng' },
  '/manage/stay-declarations': { title: 'Khai Báo Lưu Trú', group: 'Đặt phòng' },
  '/manage/deposit-policies': { title: 'Chính Sách Đặt Cọc', group: 'Đặt phòng' },
  '/manage/rooms': { title: 'Sơ Đồ Phòng', group: 'Phòng' },
  '/manage/room-types': { title: 'Quản Lý Loại Phòng', group: 'Phòng' },
  '/manage/housekeeping': { title: 'Quản Lý Buồng Phòng', group: 'Phòng' },
  '/manage/lost-and-found': { title: 'Quản Lý Đồ Khách Để Quên', group: 'Phòng' },
  '/manage/guests': { title: 'Quản Lý Khách Hàng', group: 'Khách & Dịch vụ' },
  '/manage/corporate-clients': { title: 'Khách Hàng Công Ty', group: 'Khách & Dịch vụ' },
  '/manage/negotiated-prices': { title: 'Thỏa Thuận Giá Hợp Đồng', group: 'Khách & Dịch vụ' },
  '/manage/extra-services': { title: 'Dịch Vụ Phụ Thu', group: 'Khách & Dịch vụ' },
  '/manage/loyalty': { title: 'Khách Thân Thiết', group: 'Khách & Dịch vụ' },
  '/manage/reports': { title: 'Báo Cáo Doanh Thu & Công Suất', group: 'Tài chính' },
  '/manage/cashier-shifts': { title: 'Chốt Ca & Đối Soát Tiền Mặt', group: 'Tài chính' },
  '/manage/daily-ledger': { title: 'Sổ Quỹ Theo Ngày', group: 'Tài chính' },
  '/manage/staff': { title: 'Quản Lý Nhân Sự', group: 'Hệ thống' },
  '/manage/sessions': { title: 'Theo Dõi Phiên Đăng Nhập', group: 'Hệ thống' },
  '/manage/inventory': { title: 'Kho Đồ Dùng', group: 'Hệ thống' },
  '/manage/concurrency': { title: 'Kiểm Soát Đồng Thời', group: 'Hệ thống' },
  '/manage/audit-logs': { title: 'Lịch Sử Hoạt Động', group: 'Hệ thống' },
  '/manage/personal-data-audit': { title: 'Nhật Ký Dữ Liệu Cá Nhân', group: 'Hệ thống' },
  '/manage/backup': { title: 'Sao Lưu & Xuất Dữ Liệu', group: 'Hệ thống' },
  '/manage/settings': { title: 'Cài Đặt Khách Sạn', group: 'Hệ thống' },
  '/manage/notifications': { title: 'Trung Tâm Thông Báo', group: 'Hệ thống' },
  '/manage/notifications/preferences': { title: 'Cài Đặt Nhận Thông Báo', group: 'Hệ thống' },
  '/manage/profile': { title: 'Hồ Sơ Cá Nhân', group: 'Cá nhân' }
};

/**
 * Component hiển thị danh sách menu con (menu bé)
 * với hiệu ứng khối trượt nền (gliding active pill) khi chuyển đổi giữa các menu con.
 * Hỗ trợ cả chế độ expanded accordion lẫn chế độ collapsed floating popover.
 */
const SubmenuNav: React.FC<{
  items: NavItem[];
  currentPath: string;
  pendingResetCount: number;
  variant?: 'accordion' | 'popover';
}> = ({ items, currentPath, pendingResetCount, variant = 'accordion' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ top: number; height: number; opacity: number }>({
    top: 0,
    height: 0,
    opacity: 0
  });
  const [hasMoved, setHasMoved] = useState(false);
  const subRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const updatePill = () => {
      const activeItem = items.find((i) => i.path === currentPath);
      if (!activeItem) {
        setPill((prev) => ({ ...prev, opacity: 0 }));
        return;
      }

      const container = containerRef.current;
      const activeEl = subRefs.current[activeItem.path];
      if (container && activeEl) {
        const top = activeEl.offsetTop;
        const height = activeEl.offsetHeight;
        setPill({ top, height, opacity: 1 });
        setHasMoved(true);
      } else {
        setPill((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    const rafId = requestAnimationFrame(updatePill);
    return () => cancelAnimationFrame(rafId);
  }, [currentPath, items]);

  const isPopover = variant === 'popover';

  return (
    <div
      ref={containerRef}
      className={`relative w-full py-1 ${
        isPopover
          ? 'space-y-0.5'
          : 'mt-1 pl-4 pr-1 space-y-1 border-l-2 border-primary/20 ml-5'
      }`}
    >
      {/* Gliding Submenu Pill (Lodgify Lime Active) */}
      {pill.opacity > 0 && (
        <div
          className={`absolute z-0 rounded-xl bg-[#D4F63D] shadow-xs pointer-events-none ${
            isPopover ? 'left-0 right-0' : 'left-3 right-1'
          }`}
          style={{
            top: `${pill.top}px`,
            height: `${pill.height}px`,
            opacity: pill.opacity,
            transition: hasMoved
              ? 'top 0.24s cubic-bezier(0.22, 1, 0.36, 1), height 0.2s ease, opacity 0.15s ease'
              : 'opacity 0.15s ease',
            transform: 'translateZ(0)'
          }}
        />
      )}

      {items.map((item) => {
        const active = currentPath === item.path;
        const ItemIcon = item.icon;
        const isStaffReset = item.path === '/manage/staff' && pendingResetCount > 0;

        return (
          <Link
            key={item.path}
            to={item.path}
            ref={(el) => { subRefs.current[item.path] = el; }}
            className={`
              relative z-10 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-150
              ${active
                ? 'text-[#1A2411] font-bold'
                : 'text-[#586650] hover:bg-[#F2F6EC] hover:text-[#1A2411]'
              }
            `}
          >
            <div className="flex items-center gap-2.5 truncate">
              {ItemIcon && (
                <ItemIcon
                  size={isPopover ? 15 : 16}
                  className={`shrink-0 transition-colors duration-150 ${active ? 'text-[#1A2411]' : 'text-[#73826B]'}`}
                />
              )}
              <span className="truncate">{item.label}</span>
            </div>
            {isStaffReset && (
              <span
                className={`px-1.5 py-0.2 text-[9px] font-bold rounded-full transition-colors ${
                  active ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 border border-red-200'
                }`}
              >
                {pendingResetCount}
              </span>
            )}
          </Link>
        );
      })}
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

  // Sliding active indicator pill state for collapsed sidebar
  const [pillStyle, setPillStyle] = useState<{
    top: number;
    opacity: number;
  }>({ top: 0, opacity: 0 });
  const [hasPillMoved, setHasPillMoved] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!isCollapsed) {
      setPillStyle({ top: 0, opacity: 0 });
      setHasPillMoved(false);
      return;
    }

    const updatePill = () => {
      const container = navContainerRef.current;
      if (!container) return;

      const currentGroup = NAV_GROUPS.find((g) =>
        g.items.some((item) => item.path === location.pathname)
      );

      if (!currentGroup) {
        setPillStyle((prev) => ({ ...prev, opacity: 0 }));
        return;
      }

      const activeEl = itemRefs.current[currentGroup.id];
      if (!activeEl) {
        setPillStyle((prev) => ({ ...prev, opacity: 0 }));
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();

      const top = activeRect.top - containerRect.top + container.scrollTop;

      setPillStyle({
        top,
        opacity: 1
      });
      setHasPillMoved(true);
    };

    // Khi đổi đường dẫn route trong chế độ thu gọn: Cập nhật vị trí pill TỨC THÌ (0ms delay)
    // Để pill lướt ngay lập tức mà không bị chớp hay lag
    const rafId = requestAnimationFrame(updatePill);

    // Khi thanh sidebar đang animate co giãn: Đặt thêm fallback cập nhật vị trí chính xác
    const settleTimer = setTimeout(updatePill, 310);

    window.addEventListener('resize', updatePill);
    const container = navContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updatePill);
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(settleTimer);
      window.removeEventListener('resize', updatePill);
      if (container) {
        container.removeEventListener('scroll', updatePill);
      }
    };
  }, [location.pathname, isCollapsed]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabel = (user?.role && ROLE_LABEL[user.role]) || user?.role || 'Nhân viên';
  const roleBadgeStyle = (user?.role && ROLE_BADGE_STYLE[user.role]) || 'bg-neutral-100 text-neutral-700 border-neutral-300';
  const currentRouteMeta = ROUTE_META_MAP[location.pathname] || { title: 'Quản Trị Hệ Thống', group: 'Hệ thống' };

  return (
    <div className="h-screen w-full overflow-hidden bg-[#F4F6F0] text-on-surface flex flex-col antialiased">
      <div className="flex flex-1 h-full overflow-hidden relative">
        
        {/* Mobile Backdrop */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          />
        )}

        {/* ── Left Sidebar (Desktop + Mobile Drawer) ── */}
        {/* ── Left Sidebar (Desktop + Mobile Drawer) ── */}
        <aside
          className={`
            fixed lg:static top-0 bottom-0 left-0 z-50
            flex flex-col bg-white border-r border-border-grey shadow-[1px_0_12px_rgba(0,0,0,0.02)]
            transition-all duration-300 ease-in-out select-none
            ${mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
            ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'}
          `}
        >
          {/* Sidebar Header: Brand & Logo */}
          <div className="h-16 px-4 border-b border-border-grey flex items-center justify-between shrink-0 bg-white">
            <Link
              to="/"
              className={`flex items-center group py-1 ${isCollapsed ? 'justify-center w-full' : 'px-1 gap-3'}`}
              title={isCollapsed ? (hotelSetting?.propertyName || 'STAY AWAY') : 'Về trang chủ'}
            >
              {isCollapsed ? (
                <div className="flex flex-col items-center justify-center">
                  <span className="font-logo font-bold text-2xl text-primary leading-none">
                    {(hotelSetting?.propertyName || 'S')[0]}
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#43A047] mt-1.5"></div>
                </div>
              ) : (
                <div className="flex flex-col select-none">
                  <span className="font-logo font-bold text-[22px] tracking-wide text-primary leading-none uppercase group-hover:opacity-85 transition-opacity">
                    {hotelSetting?.propertyName || 'STAY AWAY'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#E53935] animate-bounce [animation-delay:0ms]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FDD835] animate-bounce [animation-delay:150ms]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#43A047] animate-bounce [animation-delay:300ms]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8E24AA] animate-bounce [animation-delay:450ms]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1E88E5] animate-bounce [animation-delay:600ms]"></div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#73826B] ml-1.5">
                      HOTEL MANAGEMENT
                    </span>
                  </div>
                </div>
              )}
            </Link>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              title="Đóng menu"
            >
              <IoCloseOutline size={22} />
            </button>
          </div>

          {/* Sidebar Navigation Items */}
          <div
            ref={navContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1.5 sidebar-scroll relative"
          >
            {/* Gliding Active Indicator Pill (Collapsed Mode) */}
            {isCollapsed && pillStyle.opacity > 0 && (
              <div
                className="absolute z-0 rounded-xl bg-[#D4F63D] shadow-md shadow-[#D4F63D]/30 pointer-events-none"
                style={{
                  top: `${pillStyle.top}px`,
                  left: '50%',
                  width: '44px',
                  height: '44px',
                  opacity: pillStyle.opacity,
                  transform: 'translateX(-50%) translateZ(0)',
                  transition: hasPillMoved
                    ? 'top 0.32s cubic-bezier(0.34, 1.25, 0.64, 1), opacity 0.2s ease'
                    : 'opacity 0.2s ease'
                }}
              />
            )}

            {NAV_GROUPS.map((group) => {
              const visibleItems = group.items.filter((item) =>
                !item.allowedRoles || (user?.role && item.allowedRoles.includes(user.role))
              );

              if (visibleItems.length === 0) return null;

              const isGroupActive = visibleItems.some((item) => location.pathname === item.path);
              const isGroupOpen = !!openGroups[group.id];
              const GroupIcon = group.icon;
              const hasMultiple = visibleItems.length > 1;

              // Single item direct link (e.g. Dashboard)
              if (!hasMultiple) {
                const singleItem = visibleItems[0];
                const active = location.pathname === singleItem.path;
                const ItemIcon = singleItem.icon || GroupIcon;

                return (
                  <div key={group.id} className="relative group/tooltip flex justify-center">
                    <Link
                      to={singleItem.path}
                      ref={(el) => { itemRefs.current[group.id] = el; }}
                      className={`
                        flex items-center transition-all duration-200 relative z-10
                        ${isCollapsed
                          ? `w-11 h-11 rounded-xl justify-center ${
                              active
                                ? 'text-[#1A2411] font-bold'
                                : 'text-[#586650] hover:text-primary hover:bg-[#F2F6EC]'
                            }`
                          : `w-full gap-3 px-3 py-2.5 rounded-xl font-medium text-[13.5px] ${
                              active
                                ? 'bg-[#D4F63D] text-[#1A2411] font-bold shadow-xs'
                                : 'text-[#586650] hover:bg-[#F2F6EC] hover:text-[#1A2411]'
                            }`
                        }
                      `}
                      title={isCollapsed ? singleItem.label : undefined}
                    >
                      <ItemIcon
                        size={20}
                        className={`shrink-0 transition-colors duration-200 ${
                          active ? 'text-[#1A2411]' : (isCollapsed ? 'text-[#586650] group-hover/tooltip:text-primary' : 'text-[#73826B]')
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{singleItem.label}</span>}
                    </Link>

                    {/* Tooltip on collapsed desktop mode */}
                    {isCollapsed && (
                      <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#1A2411] text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity z-50">
                        {singleItem.label}
                      </div>
                    )}
                  </div>
                );
              }

              // Multi-item group with Accordion & Collapsed hover popover
              return (
                <div key={group.id} className="relative group/tooltip flex flex-col items-center">
                  {/* Group Trigger Button */}
                  <button
                    type="button"
                    ref={(el) => { itemRefs.current[group.id] = el; }}
                    onClick={() => {
                      if (isCollapsed) {
                        setIsCollapsed(false);
                        try {
                          localStorage.setItem('staygo_sidebar_collapsed', 'false');
                        } catch {}
                        setOpenGroups((prev) => ({ ...prev, [group.id]: true }));
                        return;
                      }
                      toggleGroup(group.id);
                    }}
                    className={`
                      transition-all duration-200 cursor-pointer relative z-10
                      ${isCollapsed
                        ? `w-11 h-11 rounded-xl flex items-center justify-center ${
                            isGroupActive
                              ? 'text-[#1A2411] font-bold'
                              : 'text-[#586650] hover:text-primary hover:bg-[#F2F6EC]'
                          }`
                        : `w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-[13.5px] ${
                            isGroupActive && !isGroupOpen
                              ? 'bg-[#EEFAB8] text-[#1A2411] font-bold'
                              : isGroupOpen
                              ? 'bg-[#F2F6EC] text-[#1A2411] font-semibold'
                              : 'text-[#586650] hover:bg-[#F2F6EC] hover:text-[#1A2411]'
                          }`
                      }
                    `}
                    title={isCollapsed ? group.label : undefined}
                  >
                    <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
                      <GroupIcon
                        size={20}
                        className={`shrink-0 transition-colors duration-200 ${
                          isCollapsed && isGroupActive ? 'text-[#1A2411]' : (isGroupActive ? 'text-[#5E7144]' : 'text-[#73826B]')
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate font-semibold">{group.label}</span>
                      )}
                    </div>

                    {/* Badge & Chevron when expanded */}
                    {!isCollapsed && (
                      <div className="flex items-center gap-1.5">
                        {group.id === 'system' && pendingResetCount > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-red-600 text-white rounded-full animate-pulse">
                            {pendingResetCount}
                          </span>
                        )}
                        <IoChevronDownOutline
                          size={14}
                          className={`transition-transform duration-200 text-slate-400 ${isGroupOpen ? 'rotate-180 text-primary' : ''}`}
                        />
                      </div>
                    )}
                  </button>

                  {/* Accordion Submenu (when expanded) with Gliding Indicator */}
                  {!isCollapsed && isGroupOpen && (
                    <SubmenuNav
                      items={visibleItems}
                      currentPath={location.pathname}
                      pendingResetCount={pendingResetCount}
                    />
                  )}

                  {/* Floating Popover when Collapsed on Desktop */}
                  {isCollapsed && (
                    <div className="hidden lg:block absolute left-full top-0 ml-3 w-56 bg-white/95 backdrop-blur-md border border-border-grey rounded-2xl shadow-2xl p-2 opacity-0 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:pointer-events-auto transition-all duration-150 z-50">
                      <div className="px-3 py-2 mb-1.5 border-b border-border-grey font-bold text-xs text-[#1A2411] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GroupIcon size={16} />
                          <span>{group.label}</span>
                        </div>
                        {group.id === 'system' && pendingResetCount > 0 && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-red-100 text-red-700 rounded-full border border-red-200">
                            {pendingResetCount}
                          </span>
                        )}
                      </div>
                      <SubmenuNav
                        items={visibleItems}
                        currentPath={location.pathname}
                        pendingResetCount={pendingResetCount}
                        variant="popover"
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Lodgify Assistant / Hotel Helper Card (Expanded mode) */}
            {!isCollapsed && (
              <div className="mt-4 mx-1 p-3.5 rounded-2xl bg-gradient-to-br from-[#F5ECD5]/70 via-[#F7F9F2] to-[#EEFAB8]/60 border border-[#E2E8D8] shadow-2xs">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-md bg-[#D4F63D] text-[#1A2411] flex items-center justify-center font-bold text-[10px] shadow-2xs">
                    ✦
                  </div>
                  <span className="text-xs font-bold text-[#1A2411] tracking-tight">Lodgify Smart PMS</span>
                </div>
                <p className="text-[11px] text-[#5E6D54] leading-relaxed">
                  Tối ưu công suất phòng và doanh thu tự động hôm nay.
                </p>
                <Link
                  to="/manage/bookings"
                  className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#1A2411] bg-white hover:bg-[#D4F63D] px-2.5 py-1 rounded-lg border border-[#DCE4D2] transition-colors shadow-2xs"
                >
                  <span>Xem lịch phòng</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            )}
          </div>

          {/* ── Sidebar Footer: Profile & Collapse Toggle ── */}
          {/* Collapsed Mode Footer */}
          {isCollapsed && (
            <div className="hidden lg:flex flex-col items-center gap-3 py-3 px-2 border-t border-border-grey bg-white shrink-0">
              {/* Toggle expand button */}
              <button
                type="button"
                onClick={toggleCollapse}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[#606D56] hover:text-primary hover:bg-[#F2F6ED] transition-all cursor-pointer border border-transparent hover:border-border-grey group/toggle"
                title="Mở rộng menu"
              >
                <IoChevronForwardOutline size={18} className="group-hover/toggle:translate-x-0.5 transition-transform" />
              </button>

              {/* User Avatar with Green Indicator Dot & Hover Card */}
              <div className="relative group/user">
                <button
                  type="button"
                  onClick={() => navigate('/manage/profile')}
                  className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-border-grey hover:ring-primary shadow-xs hover:scale-105 transition-all cursor-pointer flex items-center justify-center bg-primary/10"
                  title="Cài đặt hồ sơ cá nhân"
                >
                  {user?.avatarImage ? (
                    <img
                      src={user.avatarImage}
                      alt={user?.name || 'Tài khoản'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-bold text-primary text-xs uppercase">
                      {user?.name?.[0] || 'U'}
                    </span>
                  )}
                </button>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white pointer-events-none" />

                {/* Floating tooltip popover on hover */}
                <div className="absolute left-full bottom-0 ml-3 w-48 bg-[#1A2411] text-white text-xs rounded-xl shadow-2xl p-2.5 opacity-0 pointer-events-none group-hover/user:opacity-100 transition-opacity z-50 border border-white/10">
                  <p className="font-bold text-sm truncate">{user?.name || 'Tài khoản'}</p>
                  <p className="text-[11px] text-[#A4B465] mt-0.5">{roleLabel}</p>
                  <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-[#D4F63D] font-semibold flex items-center justify-between">
                    <span>Xem hồ sơ</span>
                    <span>&rarr;</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expanded Mode Footer */}
          <div className={`p-3 border-t border-border-grey bg-white flex flex-col gap-2 shrink-0 ${isCollapsed ? 'lg:hidden' : ''}`}>
            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden lg:flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#606D56] hover:bg-[#F2F6ED] hover:text-[#1A2411] transition-colors cursor-pointer group/btn"
              title="Thu gọn menu"
            >
              <div className="flex items-center gap-2">
                <IoChevronBackOutline size={16} className="group-hover/btn:-translate-x-0.5 transition-transform" />
                <span>Thu gọn thanh menu</span>
              </div>
              <span className="text-[10px] text-[#8E9B86] font-mono">Alt + M</span>
            </button>

            {/* User Profile Card */}
            <button
              type="button"
              onClick={() => navigate('/manage/profile')}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F2F6ED] transition-all cursor-pointer text-left border border-border-grey group/profile"
              title="Cài đặt hồ sơ cá nhân"
            >
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-primary/20 shadow-xs flex items-center justify-center bg-primary/10">
                  {user?.avatarImage ? (
                    <img
                      src={user.avatarImage}
                      alt={user?.name || 'Tài khoản'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                      {user?.name?.[0] || 'U'}
                    </div>
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white pointer-events-none" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#1A2411] truncate group-hover/profile:text-primary transition-colors leading-tight">
                  {user?.name || 'Tài khoản'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border ${roleBadgeStyle}`}>
                    {roleLabel}
                  </span>
                </div>
              </div>

              <IoSettingsOutline size={16} className="text-slate-400 group-hover/profile:text-primary group-hover/profile:rotate-45 transition-all shrink-0" />
            </button>
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

              {/* Notification Bell with Badge and Dropdown */}
              <NotificationBell />

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
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#F4F6F0] w-full">
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
