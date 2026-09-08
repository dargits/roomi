import React from 'react';

const Input = ({ 
  label, 
  icon: Icon, 
  required = false, 
  error, 
  className = '', 
  containerClassName = '',
  ...props 
}) => {
  return (
    <div className={containerClassName}>
      {label && (
        <label className="block font-label-md text-on-surface-variant mb-1.5">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon size={20} strokeWidth={1.5} className="text-on-surface-variant/70" />
          </div>
        )}
        
        <input 
          className={`w-full py-2.5 bg-surface border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${Icon ? 'pl-10 pr-4' : 'px-4'} ${error ? 'border-error' : 'border-border-grey'} ${className}`}
          required={required}
          {...props}
        />
      </div>
      
      {error && (
        <p className="text-error text-xs mt-1.5">{error}</p>
      )}
    </div>
  );
};

export default Input;
