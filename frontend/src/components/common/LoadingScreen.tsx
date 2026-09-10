import React from 'react';
import { IoBedOutline } from 'react-icons/io5';

export interface SquareSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: string;
}

/**
 * Mini Square Spinner dùng cho Button, Modal nhỏ hoặc Inline loading
 */
export const SquareSpinner: React.FC<SquareSpinnerProps> = ({
  size = 'md',
  className = '',
  color = 'text-primary'
}) => {
  const sizeMap: Record<string, string> = {
    xs: 'w-3.5 h-3.5 border-[1.5px]',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-[3px]',
    xl: 'w-12 h-12 border-4',
  };

  const selectedSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <span
        className={`inline-block ${selectedSize} border-current border-t-transparent border-l-transparent animate-square-spin ${color}`}
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
}

/**
 * Component Loading đồng bộ toàn hệ thống theo phong cách hình học sắc nét
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({
  fullScreen = false,
  message = 'Đang tải dữ liệu...',
  submessage = 'Vui lòng chờ trong giây lát',
  icon: Icon = IoBedOutline,
  size = 'md',
  className = '',
}) => {
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  const outerFrameSize = isSmall ? 'w-12 h-12' : isLarge ? 'w-24 h-24' : 'w-18 h-18';
  const innerDiamondSize = isSmall ? 'w-8 h-8' : isLarge ? 'w-16 h-16' : 'w-12 h-12';
  const pulseCoreSize = isSmall ? 'w-6 h-6' : isLarge ? 'w-12 h-12' : 'w-9 h-9';
  const iconSize = isSmall ? 'text-base' : isLarge ? 'text-2xl' : 'text-xl';

  const content = (
    <div className={`flex flex-col items-center justify-center p-6 text-center select-none ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* 1. Lõi phát sáng hình vuông góc cạnh */}
        <div className={`absolute ${pulseCoreSize} bg-primary/15 animate-square-pulse`} />

        {/* 2. Khung phụ góc 45 độ (Hình quả trám / Geometric Diamond) xoay ngược chiều */}
        <div
          className={`absolute ${innerDiamondSize} border border-primary/40 animate-square-counter`}
        />

        {/* 3. Khung vuông chính góc sắc nét xoay đồng trục */}
        <div
          className={`${outerFrameSize} border-2 border-primary/20 border-t-primary border-r-primary animate-square-spin`}
        />

        {/* 4. Icon biểu tượng trung tâm */}
        {Icon && (
          <div className="absolute flex items-center justify-center pointer-events-none">
            <Icon className={`text-primary animate-pulse ${iconSize}`} />
          </div>
        )}
      </div>

      {/* Thông điệp tải dữ liệu phong cách Arimo Corporate */}
      {(message || submessage) && (
        <div className={`text-center space-y-1.5 ${isSmall ? 'mt-3' : 'mt-5'}`}>
          {message && (
            <p
              className={`${
                isSmall ? 'text-xs tracking-wider' : 'text-sm tracking-widest'
              } font-bold uppercase text-on-surface`}
            >
              {message}
            </p>
          )}
          {submessage && (
            <p className={`${isSmall ? 'text-[10px]' : 'text-xs'} text-on-surface-variant tracking-normal`}>
              {submessage}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-surface/90 backdrop-blur-sm transition-opacity duration-300">
        {content}
      </div>
    );
  }

  return (
    <div className={`w-full flex items-center justify-center ${isSmall ? 'min-h-[140px]' : 'min-h-[260px]'} py-8`}>
      {content}
    </div>
  );
};

export default LoadingScreen;
