import React from 'react';
import { IoSyncOutline } from 'react-icons/io5';

const Button = ({
  children,
  variant = 'primary', // primary, secondary, ghost, danger
  type = 'button',
  icon: Icon,
  isLoading = false,
  className = '',
  disabled = false,
  ...props
}) => {
  const baseStyles = "flex items-center justify-center py-2.5 px-6 rounded-md font-title-md transition-all gap-2";
  
  const variants = {
    primary: "bg-primary text-on-primary shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed",
    secondary: "bg-surface-container-low text-on-surface border border-border-grey hover:bg-surface-container transition-colors disabled:opacity-70 disabled:cursor-not-allowed",
    ghost: "bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors disabled:opacity-70 disabled:cursor-not-allowed",
    danger: "bg-error text-white shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <IoSyncOutline size={20} className="animate-spin" />
      ) : Icon ? (
        <Icon size={20} strokeWidth={1.5} />
      ) : null}
      {children}
    </button>
  );
};

export default Button;
