import React from 'react';

/**
 * Reusable Badge component
 * @param {Object} props
 * @param {'available' | 'occupied' | 'cleaning' | 'maintenance' | 'new' | 'confirmed' | 'cancelled' | 'no_show'} props.variant
 * @param {string} [props.className='']
 * @param {React.ReactNode} props.children
 */
export default function Badge({ 
  variant = 'available', 
  className = '', 
  children,
  ...props 
}) {
  return (
    <span 
      className={`badge badge-${variant} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}
