import React from 'react';
import { Link } from 'react-router-dom';
import { useAppConfig } from '../../context/AppConfigContext';
import { IoCallOutline, IoMailOutline, IoLocationOutline } from 'react-icons/io5';

const Footer = () => {
  const { hotelSetting } = useAppConfig();
  
  return (
    <footer className="w-full py-12 px-4 md:px-margin-desktop bg-surface-container border-t border-border-grey mt-auto">
      <div className="max-w-container-max-width mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        
        {/* Col 1: Brand & Bio */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col self-start select-none">
            <span className="font-logo font-bold text-[28px] tracking-wide text-primary leading-none uppercase">
              {hotelSetting?.propertyName || 'STAYGO'}
            </span>
            <div className="flex gap-1.5 mt-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E53935] animate-bounce [animation-delay:0ms]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#FDD835] animate-bounce [animation-delay:150ms]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#43A047] animate-bounce [animation-delay:300ms]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#8E24AA] animate-bounce [animation-delay:450ms]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#1E88E5] animate-bounce [animation-delay:600ms]"></div>
            </div>
          </div>
          <p className="font-body-md text-xs md:text-sm text-on-surface-variant leading-relaxed">
            Trải nghiệm lưu trú đẳng cấp, dịch vụ hoàn hảo và kỳ nghỉ trọn vẹn cho mọi hành trình của bạn.
          </p>
        </div>

        {/* Col 2: Navigation Links */}
        <div className="flex flex-col gap-2.5">
          <h4 className="font-title-md font-bold text-on-surface mb-1">Khám Phá</h4>
          <Link to="/" className="text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">Trang chủ</Link>
          <Link to="/rooms" className="text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">Phòng & Bảng giá</Link>
          <Link to="/amenities" className="text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">Tiện ích & Dịch vụ</Link>
          <Link to="/promotions" className="text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">Ưu đãi & Khuyến mãi</Link>
          <Link to="/about" className="text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">Giới thiệu & Quy định</Link>
          <Link to="/contact" className="text-xs md:text-sm text-on-surface-variant hover:text-primary transition-colors">Liên hệ & Hỗ trợ</Link>
        </div>

        {/* Col 3: Contact Details */}
        <div className="flex flex-col gap-2.5 text-xs md:text-sm text-on-surface-variant">
          <h4 className="font-title-md font-bold text-on-surface mb-1">Thông Tin Liên Hệ</h4>
          <div className="flex items-start gap-2">
            <IoLocationOutline size={18} className="text-primary shrink-0 mt-0.5" />
            <span>{hotelSetting?.address || 'Đang cập nhật địa chỉ'}</span>
          </div>
          <div className="flex items-center gap-2">
            <IoCallOutline size={16} className="text-primary shrink-0" />
            <a href={`tel:${hotelSetting?.phone}`} className="hover:text-primary transition-colors font-medium">
              {hotelSetting?.phone || 'Đang cập nhật hotline'}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <IoMailOutline size={16} className="text-primary shrink-0" />
            <a href={`mailto:${hotelSetting?.email}`} className="hover:text-primary transition-colors font-medium">
              {hotelSetting?.email || 'contact@staygo.vn'}
            </a>
          </div>
        </div>

        {/* Col 4: Checkin Policies & Socials */}
        <div className="flex flex-col gap-3 text-xs md:text-sm text-on-surface-variant">
          <h4 className="font-title-md font-bold text-on-surface mb-1">Chính Sách Lưu Trú</h4>
          <div>Nhận phòng: <strong className="text-on-surface">{hotelSetting?.defaultCheckinTime?.substring(0,5) || '14:00'}</strong></div>
          <div>Trả phòng: <strong className="text-on-surface">{hotelSetting?.defaultCheckoutTime?.substring(0,5) || '12:00'}</strong></div>
          <div className="pt-2 text-xs text-on-surface-variant">
            Lễ tân phục vụ 24/24. Vui lòng liên hệ trước nếu quý khách đến sau 22:00.
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-4 mt-6 pt-6 border-t border-border-grey text-center text-xs text-on-surface-variant">
          © {new Date().getFullYear()} {hotelSetting?.propertyName || 'STAYGO'}. Tất cả quyền được bảo lưu.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
