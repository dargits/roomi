import React from 'react';
import { SquareSpinner } from '../common/LoadingScreen';

export type ButtonVariant =
  | 'primary'
  | 'lime'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'text'
  | 'danger'
  | 'dangerOutline'
  | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  icon: Icon,
  isLoading = false,
  className = '',
  disabled = false,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-200 gap-2 cursor-pointer select-none rounded-xl font-semibold border text-center whitespace-nowrap shrink-0';

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'py-1.5 px-4 text-xs min-h-[34px]',
    md: 'py-2 px-5 text-sm min-h-[40px]',
    lg: 'py-2.5 px-6 text-base min-h-[46px]'
  };

  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-primary text-white border-primary shadow-xs hover:bg-primary-hover hover:border-primary-hover hover:shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
    lime:
      'bg-[#D4F63D] text-[#1A2411] border-[#BEDF2E] shadow-xs hover:bg-[#C2E232] hover:border-[#BEDF2E] hover:shadow-sm active:scale-[0.98] font-bold disabled:opacity-60 disabled:cursor-not-allowed',
    secondary:
      'bg-white text-[#1A2411] border-border-grey shadow-2xs hover:bg-[#F2F6EC] hover:border-[#CCD8C2] active:bg-[#E8EFE0] transition-all disabled:opacity-60 disabled:cursor-not-allowed',
    outline:
      'bg-white text-primary border-border-grey shadow-2xs hover:bg-[#F2F6EC] hover:border-primary/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed',
    ghost:
      'bg-transparent text-[#586650] border-transparent hover:bg-[#F2F6EC] hover:text-[#1A2411] active:bg-[#E8EFE0] transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
    text:
      'bg-transparent text-on-surface-variant border-transparent hover:bg-surface-container-low hover:text-on-surface transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
    danger:
      'bg-error text-white border-error shadow-xs hover:bg-red-700 hover:border-red-700 hover:shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
    dangerOutline:
      'bg-white text-error border-error/30 shadow-2xs hover:bg-red-50 hover:border-error transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
    success:
      'bg-green-600 text-white border-green-600 shadow-xs hover:bg-green-700 hover:border-green-700 hover:shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed'
  };

  const selectedSize = sizeStyles[size] || sizeStyles.md;
  const selectedVariant = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${selectedSize} ${selectedVariant} ${className}`}
      {...props}
    >
      {isLoading ? (
        <SquareSpinner size={size === 'sm' ? 'xs' : 'sm'} color="text-current" className="shrink-0" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 16 : 18} strokeWidth={1.5} className="shrink-0" />
      ) : null}
      {children}
    </button>
  );
};

export default Button;
