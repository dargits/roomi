import React from 'react';

/**
 * Reusable Button component
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'danger' | 'success'} [props.variant='primary']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.className='']
 * @param {React.ReactNode} props.children
 * @param {React.ElementType} [props.icon]
 */
export default function Button({ 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  className = '', 
  children, 
  icon: Icon,
  ...props 
}) {
  const variantClass = variant ? `btn-${variant}` : '';
  const sizeClass = size !== 'md' ? `btn-${size}` : '';
  
  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children && <span>{children}</span>}
    </button>
  );
}
