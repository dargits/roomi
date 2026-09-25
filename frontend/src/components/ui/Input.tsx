import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  required?: boolean;
  error?: string;
  helperText?: string;
  helperTextClassName?: string;
  className?: string;
  containerClassName?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  labelClassName = '',
  icon: Icon,
  required = false,
  error,
  helperText,
  helperTextClassName = '',
  className = '',
  containerClassName = '',
  ...props
}) => {
  return (
    <div className={containerClassName}>
      {label && (
        <label className={`block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 ${labelClassName}`}>
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Icon size={18} strokeWidth={1.5} className="text-slate-400" />
          </div>
        )}

        <input
          className={`w-full h-[42px] py-2.5 px-3.5 bg-white border border-border-grey rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-primary outline-none text-sm text-[#002146] placeholder:text-slate-400 transition-all ${
            Icon ? 'pl-10 pr-4' : 'px-3.5'
          } ${error ? 'border-error focus:ring-error/20 focus:border-error' : 'hover:border-slate-300'} ${className}`}
          required={required}
          {...props}
        />
      </div>

      {error && <p className="text-error text-xs mt-1.5 font-medium">{error}</p>}
      {!error && helperText && <p className={`text-slate-500 text-xs mt-1.5 ${helperTextClassName}`}>{helperText}</p>}
    </div>
  );
};

export default Input;
