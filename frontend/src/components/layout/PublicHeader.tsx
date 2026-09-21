import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAppConfig } from '../../context/AppConfigContext';
import AuthContext from '../../context/AuthContext';
import { IoMenu, IoClose, IoReceiptOutline, IoSearchOutline } from 'react-icons/io5';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

export const PUBLIC_NAV_LINKS = [
  { path: '/', label: 'Trang chủ' },
  { path: '/rooms', label: 'Phòng & Giá' },
  { path: '/about', label: 'Giới thiệu' },
  { path: '/contact', label: 'Liên hệ' }
];

const NAV_LINKS = PUBLIC_NAV_LINKS;

const PublicHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hotelSetting } = useAppConfig();
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const isAuthenticated = !!authContext?.isAuthenticated;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [lookupBookingCode, setLookupBookingCode] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Gliding active indicator state cho Desktop Header Nav
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0
  });
  const [hasMoved, setHasMoved] = useState(false);

  useEffect(() => {
    const updateIndicator = () => {
      const el = linkRefs.current[location.pathname];
      if (el) {
        setIndicatorStyle({
          left: el.offsetLeft,
          width: el.offsetWidth,
          opacity: 1
        });
        setHasMoved(true);
      } else {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    const rafId = requestAnimationFrame(updateIndicator);
    window.addEventListener('resize', updateIndicator);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [location.pathname]);

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest border-b border-border-grey shadow-xs">
      <div className="flex justify-between items-center px-4 md:px-margin-desktop h-16 max-w-container-max-width mx-auto">
        {/* Brand Logo - căn trái */}
        <Link to="/" className="flex items-center select-none group flex-shrink-0">
          <div className="flex flex-col items-center">
            <span className="font-logo font-bold text-[26px] tracking-wide text-primary leading-none uppercase group-hover:opacity-85 transition-opacity">
              {hotelSetting?.propertyName || ''}
            </span>
            <div className="flex gap-1.5 mt-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E53935] animate-bounce [animation-delay:0ms]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#FDD835] animate-bounce [animation-delay:150ms]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#43A047] animate-bounce [animation-delay:300ms]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#8E24AA] animate-bounce [animation-delay:450ms]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#1E88E5] animate-bounce [animation-delay:600ms]"></div>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links - giữa có thanh trượt gliding indicator */}
        <div className="hidden lg:flex items-center gap-6 relative py-1">
          {/* Gliding Active Indicator Bar */}
          {indicatorStyle.opacity > 0 && (
            <span
              className="absolute bottom-0 h-[2.5px] bg-primary rounded-full pointer-events-none"
              style={{
                left: `${indicatorStyle.left}px`,
                width: `${indicatorStyle.width}px`,
                opacity: indicatorStyle.opacity,
                transition: hasMoved
                  ? 'left 0.28s cubic-bezier(0.22, 1, 0.36, 1), width 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.15s ease'
                  : 'opacity 0.15s ease',
                transform: 'translateZ(0)'
              }}
            />
          )}

          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                ref={(el) => { linkRefs.current[link.path] = el; }}
                className={`font-body-md text-[14px] transition-colors duration-200 py-1 px-1 relative ${
                  isActive 
                    ? 'text-primary font-bold' 
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side: User Profile / Login Button & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setLookupError(null); setIsLookupOpen(true); }}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover px-3 py-1.5 rounded-lg border border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer"
          >
            <IoReceiptOutline size={15} /> Tra cứu hóa đơn
          </button>

          {isAuthenticated && user ? (
            <Link
              to="/manage"
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all group"
              title="Đến trang quản trị"
            >
              {user.avatarImage ? (
                <img
                  src={user.avatarImage}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-primary/30 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
                  {user.name?.[0] || 'U'}
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors leading-tight truncate max-w-[110px]">
                  {user.name}
                </span>
                <span className="text-[10px] text-on-surface-variant font-medium">
                  Quản trị
                </span>
              </div>
            </Link>
          ) : (
            <button 
              type="button"
              onClick={() => navigate('/login')}
              className="btn-shimmer border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-white px-5 md:px-7 py-1.5 rounded-lg uppercase tracking-wide font-label-md font-semibold text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer hover:shadow-md active:scale-95"
            >
              Đăng nhập
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-2 text-on-surface hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
            title="Menu"
          >
            {mobileMenuOpen ? <IoClose size={24} /> : <IoMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-surface-container-lowest border-b border-border-grey px-6 py-4 space-y-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            type="button"
            onClick={() => { setMobileMenuOpen(false); setLookupError(null); setIsLookupOpen(true); }}
            className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm text-primary font-semibold bg-primary/5 border border-primary/20 mb-2 cursor-pointer"
          >
            <IoReceiptOutline size={18} /> Tra cứu hóa đơn & đặt phòng
          </button>

          {isAuthenticated && user && (
            <Link
              to="/manage"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/10 text-primary font-semibold mb-2"
            >
              {user.avatarImage ? (
                <img
                  src={user.avatarImage}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover border border-primary/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs uppercase">
                  {user.name?.[0] || 'U'}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-bold">{user.name}</span>
                <span className="text-xs opacity-80">Trang quản trị &rarr;</span>
              </div>
            </Link>
          )}

          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2.5 px-3 rounded-lg text-sm transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-bold' 
                    : 'text-on-surface hover:bg-surface-container-low'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Modal tra cứu hóa đơn & đặt phòng trực tuyến (NCL-09-CN-008) */}
      <Modal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        title="Tra cứu Hóa đơn & Đặt phòng trực tuyến"
        maxWidth="max-w-md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const cleanCode = lookupBookingCode.trim().replace(/[^0-9]/g, '');
            const cleanPhone = lookupPhone.trim();
            if (!cleanCode) {
              setLookupError('Vui lòng nhập mã đặt phòng (chỉ gồm các chữ số).');
              return;
            }
            if (!cleanPhone) {
              setLookupError('Vui lòng nhập số điện thoại đã đăng ký khi đặt phòng.');
              return;
            }
            setLookupError(null);
            setIsLookupOpen(false);
            navigate(`/booking-detail/${cleanCode}?tab=invoice&phone=${encodeURIComponent(cleanPhone)}`);
          }}
          className="space-y-4 p-2"
        >
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Nhập <strong>Mã đặt phòng</strong> và <strong>Số điện thoại</strong> Quý khách đã đăng ký khi đặt phòng để xem bảng kê chi tiết và tải hóa đơn thanh toán.
          </p>

          <Input
            label="Mã đặt phòng *"
            placeholder="Ví dụ: 101"
            value={lookupBookingCode}
            onChange={(e) => { setLookupBookingCode(e.target.value); setLookupError(null); }}
            required
            autoFocus
          />

          <Input
            label="Số điện thoại đăng ký *"
            placeholder="Ví dụ: 0912345678"
            type="tel"
            value={lookupPhone}
            onChange={(e) => { setLookupPhone(e.target.value); setLookupError(null); }}
            required
          />

          {lookupError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {lookupError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border-grey">
            <Button type="button" variant="ghost" onClick={() => setIsLookupOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" icon={IoSearchOutline}>
              Tra cứu hóa đơn
            </Button>
          </div>
        </form>
      </Modal>
    </nav>
  );
};

export default PublicHeader;
