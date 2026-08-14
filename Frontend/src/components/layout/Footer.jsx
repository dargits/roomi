import React from 'react';
import { useAppConfig } from '../../context/AppConfigContext';
import logoUrl from '../../assets/logo.png';

const Footer = () => {
  const { hotelSetting } = useAppConfig();
  
  return (
    <footer className="w-full py-12 px-margin-desktop grid grid-cols-1 md:grid-cols-4 gap-gutter max-w-container-max-width mx-auto bg-surface-container border-t border-border-grey">
      <div className="col-span-1 md:col-span-1 flex flex-col gap-4">
        <div className="flex flex-col self-start select-none">
          <span className="font-logo font-medium text-[32px] tracking-wide text-[#4a4a4a] leading-none uppercase">{hotelSetting?.propertyName || 'STAYGO'}</span>
          <div className="flex gap-1.5 mt-1.5">
            <div className="w-2 h-2 rounded-full bg-[#E53935] animate-bounce [animation-delay:0ms]"></div>
            <div className="w-2 h-2 rounded-full bg-[#FDD835] animate-bounce [animation-delay:150ms]"></div>
            <div className="w-2 h-2 rounded-full bg-[#43A047] animate-bounce [animation-delay:300ms]"></div>
            <div className="w-2 h-2 rounded-full bg-[#8E24AA] animate-bounce [animation-delay:450ms]"></div>
            <div className="w-2 h-2 rounded-full bg-[#1E88E5] animate-bounce [animation-delay:600ms]"></div>
          </div>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">Trải nghiệm lưu trú đẳng cấp, dịch vụ hoàn hảo cho mọi chuyến đi của bạn.</p>
      </div>
      <div className="col-span-1 flex flex-col gap-2">
        <h4 className="font-title-lg text-title-lg text-on-surface mb-2">Liên hệ</h4>
        <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Địa chỉ: {hotelSetting?.address || 'Đang cập nhật'}</a>
        <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Hotline: {hotelSetting?.phone || 'Đang cập nhật'}</a>
        <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Email: {hotelSetting?.email || 'Đang cập nhật'}</a>
      </div>
      <div className="col-span-1 flex flex-col gap-2">
        <h4 className="font-title-lg text-title-lg text-on-surface mb-2">Chính sách</h4>
        <span className="font-body-md text-body-md text-on-surface-variant">Chính sách nhận phòng: {hotelSetting?.defaultCheckinTime?.substring(0,5) || '14:00'}</span>
        <span className="font-body-md text-body-md text-on-surface-variant">Chính sách trả phòng: {hotelSetting?.defaultCheckoutTime?.substring(0,5) || '12:00'}</span>
      </div>
      <div className="col-span-1 flex flex-col gap-2">
        <h4 className="font-title-lg text-title-lg text-on-surface mb-2">Kết nối với chúng tôi</h4>
        <div className="flex gap-4">
          <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Facebook</a>
          <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Instagram</a>
        </div>
      </div>
      <div className="col-span-1 md:col-span-4 mt-8 pt-4 border-t border-border-grey text-center font-body-md text-body-md text-on-surface-variant">
        © {new Date().getFullYear()} {hotelSetting?.propertyName || 'StayGO Hotel'}. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
