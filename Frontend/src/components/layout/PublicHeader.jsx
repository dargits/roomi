import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppConfig } from '../../context/AppConfigContext';
import logoUrl from '../../assets/logo.png';

const PublicHeader = () => {
  const navigate = useNavigate();
  const { hotelSetting } = useAppConfig();

  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-desktop h-16 bg-surface-container-lowest border-b border-border-grey shadow-sm">
      <div className="flex items-center gap-gutter">
        <a className="flex items-center select-none" href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <div className="flex flex-col items-center">
            <span className="font-logo font-medium text-[32px] tracking-wide text-[#4a4a4a] leading-none uppercase">{hotelSetting?.propertyName || 'STAYGO'}</span>
            <div className="flex gap-1.5 mt-1.5">
              <div className="w-2 h-2 rounded-full bg-[#E53935] animate-bounce [animation-delay:0ms]"></div>
              <div className="w-2 h-2 rounded-full bg-[#FDD835] animate-bounce [animation-delay:150ms]"></div>
              <div className="w-2 h-2 rounded-full bg-[#43A047] animate-bounce [animation-delay:300ms]"></div>
              <div className="w-2 h-2 rounded-full bg-[#8E24AA] animate-bounce [animation-delay:450ms]"></div>
              <div className="w-2 h-2 rounded-full bg-[#1E88E5] animate-bounce [animation-delay:600ms]"></div>
            </div>
          </div>
        </a>
        <div className="hidden md:flex gap-6 ml-6">
          <a className="font-body-md text-body-md text-primary border-b-2 border-primary pb-1" href="#">Trang chủ</a>
          <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">Phòng & Giá</a>
          <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">Tiện ích</a>
          <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">Ưu đãi & Khuyến mãi</a>
          <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">Giới thiệu</a>
          <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">Liên hệ</a>
        </div>
      </div>
      <div className="flex items-center">
        <button 
          onClick={() => navigate('/login')}
          className="bg-white text-primary border-2 border-primary hover:bg-surface-blue-light px-8 py-2 rounded uppercase tracking-wide font-label-md transition-colors shadow-sm whitespace-nowrap"
        >
          Đăng nhập
        </button>
      </div>
    </nav>
  );
};

export default PublicHeader;
