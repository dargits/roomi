import React from 'react';
import { IoBedOutline } from 'react-icons/io5';

/**
 * Component Loading đồng bộ toàn hệ thống (đồng nhất với thiết kế ở màn hình ngoài LandingPage)
 *
 * @param {boolean} fullScreen - Nếu true: hiển thị phủ toàn màn hình (fixed overlay z-[9999]); nếu false: hiển thị dạng container.
 * @param {string} message - Tiêu đề loading (mặc định: 'Đang tải dữ liệu...')
 * @param {string} submessage - Phụ đề phụ (mặc định: 'Vui lòng chờ trong giây lát')
 * @param {React.ComponentType} icon - Icon biểu tượng trung tâm (mặc định: IoBedOutline)
 * @param {'sm'|'md'|'lg'} size - Kích thước của spinner ('sm' cho tab/khối nhỏ, 'md' mặc định, 'lg' cho trang lớn)
 * @param {string} className - Tùy biến class bổ sung
 */
const LoadingScreen = ({
  fullScreen = false,
  message = 'Đang tải dữ liệu...',
  submessage = 'Vui lòng chờ trong giây lát',
  icon: Icon = IoBedOutline,
  size = 'md',
  className = '',
}) => {
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  const glowSize = isSmall ? 'w-14 h-14' : isLarge ? 'w-28 h-28' : 'w-24 h-24';
  const ringSize = isSmall ? 'w-10 h-10 border-3' : isLarge ? 'w-20 h-20 border-4' : 'w-16 h-16 border-4';
  const iconSize = isSmall ? 'text-lg' : isLarge ? 'text-3xl' : 'text-2xl';

  const content = (
    <div className={`flex flex-col items-center justify-center p-6 text-center select-none ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Pulsing glow */}
        <div className={`absolute rounded-full bg-primary/20 animate-ping opacity-75 ${glowSize}`} />
        {/* Spinning gradient ring */}
        <div className={`rounded-full border-primary/20 border-t-primary animate-spin ${ringSize}`} />
        {/* Center icon / hotel symbol */}
        <div className="absolute flex items-center justify-center">
          {Icon && <Icon className={`text-primary animate-pulse ${iconSize}`} />}
        </div>
      </div>
      {(message || submessage) && (
        <div className={`text-center space-y-1 ${isSmall ? 'mt-3' : 'mt-5'}`}>
          {message && (
            <p className={`${isSmall ? 'text-xs' : 'text-sm'} font-medium text-on-surface animate-pulse`}>
              {message}
            </p>
          )}
          {submessage && (
            <p className={`${isSmall ? 'text-[10px]' : 'text-xs'} text-on-surface-variant`}>
              {submessage}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-surface transition-opacity duration-300">
        {content}
      </div>
    );
  }

  return (
    <div className={`w-full flex items-center justify-center ${isSmall ? 'min-h-[160px]' : 'min-h-[300px]'} py-8`}>
      {content}
    </div>
  );
};

export default LoadingScreen;
