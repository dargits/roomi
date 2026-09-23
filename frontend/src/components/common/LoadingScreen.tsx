import React, { useContext } from 'react';
import { IoBedOutline, IoSparkles } from 'react-icons/io5';
import AppConfigContext from '../../context/AppConfigContext';

export interface SquareSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: string;
}

/**
 * Spinner tinh tế dùng cho Button, Modal nhỏ hoặc Inline loading
 */
export const SquareSpinner: React.FC<SquareSpinnerProps> = ({
  size = 'md',
  className = '',
  color = 'text-primary',
}) => {
  const sizeMap: Record<string, string> = {
    xs: 'w-3.5 h-3.5 border-[1.5px]',
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2',
    lg: 'w-8 h-8 border-[2.5px]',
    xl: 'w-11 h-11 border-3',
  };

  const selectedSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <span
        className={`inline-block ${selectedSize} rounded-full border-current border-t-transparent animate-spin ${color}`}
      />
    </div>
  );
};

export interface LoadingScreenProps {
  fullScreen?: boolean;
  message?: string;
  submessage?: string;
  icon?: React.ComponentType<{ className?: string }>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  brandName?: string;
  showTopBar?: boolean;
}

/**
 * Component Loading đồng bộ toàn hệ thống theo phong cách cơ sở lưu trú cao cấp
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({
  fullScreen = false,
  message = 'Đang tải dữ liệu...',
  submessage = 'Vui lòng chờ trong giây lát',
  icon: Icon = IoBedOutline,
  size = 'md',
  className = '',
  brandName,
  showTopBar = true,
}) => {
  // An toàn khi truy xuất Context mà không gây lỗi nếu không có Provider bao quanh
  const appConfig = useContext(AppConfigContext);
  const displayBrand = brandName || appConfig?.hotelSetting?.propertyName || 'STAYAWAY';

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  // 1. GIAO DIỆN TOÀN MÀN HÌNH (FULLSCREEN LUXURY MODAL LOADER)
  if (fullScreen) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-surface/75 backdrop-blur-md transition-all duration-300 antialiased"
      >
        {/* Thanh tiến trình ánh sáng chạy trên đỉnh màn hình */}
        {showTopBar && (
          <div className="fixed top-0 left-0 right-0 h-[3px] z-[10001] bg-surface-container-high overflow-hidden shadow-xs">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-primary via-lodgify-sage to-transparent animate-top-loader-glow" />
          </div>
        )}

        {/* Thẻ nổi phong cách Khách sạn cao cấp (Elevated Hospitality Card) */}
        <div className="relative bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-lodgify-border shadow-[0_20px_50px_-12px_rgba(26,36,17,0.14)] rounded-2xl px-8 sm:px-10 py-8 max-w-sm w-[90%] mx-4 flex flex-col items-center animate-scale-up select-none">
          {/* Huy hiệu trung tâm với vòng quỹ đạo phát sáng */}
          <div className="relative flex items-center justify-center my-1">
            {/* Vòng xoay ngoài */}
            <div className="w-[72px] h-[72px] rounded-2xl border-2 border-primary/20 border-t-primary border-r-lodgify-sage animate-spin [animation-duration:2.5s]" />

            {/* Vòng xoay ngược mờ phía sau */}
            <div className="absolute w-[84px] h-[84px] rounded-[20px] border border-primary/10 border-b-primary/30 animate-spin-reverse [animation-duration:6s]" />

            {/* Lõi huy hiệu chứa Icon */}
            <div className="absolute w-14 h-14 rounded-xl bg-gradient-to-br from-primary-fixed/80 via-surface to-primary/10 border border-primary/25 flex items-center justify-center shadow-inner">
              {Icon && <Icon className="text-primary text-2xl animate-luxury-pulse" />}
            </div>

            {/* Ngôi sao lấp lánh ở góc huy hiệu */}
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-surface-container-lowest border border-lodgify-border shadow-xs flex items-center justify-center">
              <IoSparkles className="text-rating-gold text-[10px] animate-pulse" />
            </div>
          </div>

          {/* 3 chấm thanh lịch đồng điệu bảng màu thương hiệu */}
          <div className="flex items-center gap-1.5 mt-4 mb-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]"></span>
            <span className="w-2 h-2 rounded-full bg-lodgify-sage animate-bounce [animation-delay:150ms]"></span>
            <span className="w-2 h-2 rounded-full bg-lodgify-lime animate-bounce [animation-delay:300ms]"></span>
          </div>

          {/* Nhãn thương hiệu */}
          <span className="text-[10px] font-bold tracking-[0.24em] text-primary/85 uppercase">
            {displayBrand}
          </span>

          {/* Thông điệp chính */}
          {message && (
            <h3 className="text-base font-bold text-on-surface tracking-tight mt-1 text-center">
              {message}
            </h3>
          )}

          {/* Thanh chạy tiến trình mượt mà (Indeterminate Shimmer Progress Bar) */}
          <div className="w-48 h-1.5 bg-surface-container-high rounded-full overflow-hidden mt-3 relative">
            <div className="h-full w-2/5 bg-gradient-to-r from-primary via-lodgify-sage to-lodgify-lime rounded-full animate-luxury-sweep" />
          </div>

          {/* Phụ chú */}
          {submessage && (
            <p className="text-xs text-on-surface-variant text-center max-w-[260px] leading-relaxed mt-2.5">
              {submessage}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 2. GIAO DIỆN INLINE NHỎ (COMPACT TAB / CARD LOADING)
  if (isSmall) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`w-full flex items-center justify-center py-6 px-4 ${className}`}
      >
        <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low/70 border border-lodgify-border shadow-xs">
          <div className="relative flex items-center justify-center shrink-0">
            <div className="w-6 h-6 rounded-lg border-2 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute w-4 h-4 rounded-md bg-primary-fixed/60 flex items-center justify-center">
              {Icon && <Icon className="text-primary text-[10px]" />}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-on-surface tracking-tight">
              {message}
            </span>
            {submessage && (
              <span className="text-[10px] text-on-surface-variant">
                {submessage}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. GIAO DIỆN INLINE TRUNG BÌNH & LỚN (PAGE CONTENT / REPORT / LIST LOADING)
  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full flex flex-col items-center justify-center select-none ${
        isLarge ? 'min-h-[320px] py-14' : 'min-h-[200px] py-8'
      } ${className}`}
    >
      <div className="flex flex-col items-center p-6 text-center max-w-sm">
        {/* Huy hiệu biểu tượng xoay mượt */}
        <div className="relative flex items-center justify-center mb-3">
          <div className="w-14 h-14 rounded-xl border-2 border-primary/20 border-t-primary border-r-lodgify-sage animate-spin [animation-duration:2.5s]" />
          <div className="absolute w-10 h-10 rounded-lg bg-gradient-to-br from-primary-fixed/80 via-surface to-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
            {Icon && <Icon className="text-primary text-xl animate-luxury-pulse" />}
          </div>
        </div>

        {/* 3 chấm thương hiệu */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-lodgify-sage animate-bounce [animation-delay:150ms]"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-lodgify-lime animate-bounce [animation-delay:300ms]"></span>
        </div>

        {/* Thông điệp tải dữ liệu */}
        {message && (
          <p className="text-sm font-bold text-on-surface tracking-tight mt-1">
            {message}
          </p>
        )}

        {/* Thanh tiến trình mini */}
        <div className="w-36 h-1 bg-surface-container-high rounded-full overflow-hidden mt-2.5 relative">
          <div className="h-full w-2/5 bg-gradient-to-r from-primary via-lodgify-sage to-lodgify-lime rounded-full animate-luxury-sweep" />
        </div>

        {/* Phụ chú */}
        {submessage && (
          <p className="text-xs text-on-surface-variant mt-2 max-w-[240px]">
            {submessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
