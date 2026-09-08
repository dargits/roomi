import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAppConfig } from '../../context/AppConfigContext';
import { IoMenu, IoClose } from 'react-icons/io5';

const NAV_LINKS = [
  { path: '/', label: 'Trang chủ' },
  { path: '/rooms', label: 'Phòng & Giá' },
  { path: '/about', label: 'Giới thiệu' },
  { path: '/contact', label: 'Liên hệ' }
];

const PublicHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hotelSetting } = useAppConfig();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

        {/* Desktop Navigation Links - giữa */}
        <div className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map(link => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`font-body-md text-[14px] transition-colors py-1 ${
                  isActive 
                    ? 'text-primary font-bold border-b-2 border-primary' 
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side: Login Button & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => navigate('/login')}
            className="border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-white px-5 md:px-7 py-1.5 rounded-lg uppercase tracking-wide font-label-md font-semibold text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer"
          >
            Đăng nhập
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="lg:hidden p-2 text-on-surface hover:bg-surface-container-low rounded-lg transition-colors"
            title="Menu"
          >
            {mobileMenuOpen ? <IoClose size={24} /> : <IoMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-surface-container-lowest border-b border-border-grey px-6 py-4 space-y-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          {NAV_LINKS.map(link => {
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
    </nav>
  );
};

export default PublicHeader;
