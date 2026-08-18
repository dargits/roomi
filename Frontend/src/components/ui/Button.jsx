import React from 'react';
import { IoSyncOutline } from 'react-icons/io5';

const Button = ({
  children,
  variant = 'primary', // primary, secondary, outline, ghost, text, danger, dangerOutline, success
  size = 'md', // sm, md, lg
  type = 'button',
  icon: Icon,
  isLoading = false,
  className = '',
  disabled = false,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-title-md transition-all gap-2 cursor-pointer select-none rounded-md font-bold tracking-wider border";
  
  const sizeStyles = {
    sm: "py-1.5 px-3 text-xs",
    md: "py-2.5 px-5 text-sm",
    lg: "py-3 px-6 text-base"
  };

  const variants = {
    primary: "bg-primary text-on-primary border-primary shadow-xs hover:bg-primary-container hover:border-primary-container hover:shadow-sm active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed",
    secondary: "bg-surface-container-lowest text-on-surface border-border-grey shadow-2xs hover:bg-surface-container-low hover:border-outline/50 active:bg-surface-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
    outline: "bg-surface-container-lowest text-primary border-primary/60 shadow-2xs hover:bg-primary/5 hover:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
    ghost: "bg-surface-container-lowest text-on-surface border-border-grey shadow-2xs hover:bg-surface-container-low hover:border-outline/50 hover:text-on-surface active:bg-surface-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
    text: "bg-transparent text-on-surface-variant border-transparent hover:bg-surface-container-low hover:text-on-surface transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
    danger: "bg-error text-white border-error shadow-xs hover:bg-red-700 hover:border-red-700 hover:shadow-sm active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed",
    dangerOutline: "bg-surface-container-lowest text-error border-error/40 shadow-2xs hover:bg-red-50 hover:border-error transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
    success: "bg-green-600 text-white border-green-600 shadow-xs hover:bg-green-700 hover:border-green-700 hover:shadow-sm active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
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
        <IoSyncOutline size={size === 'sm' ? 16 : 18} className="animate-spin shrink-0" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 16 : 18} strokeWidth={1.5} className="shrink-0" />
      ) : null}
      {children}
    </button>
  );
};

export default Button;
