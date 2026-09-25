import React, { useState, useRef, useEffect } from 'react';
import { IoCheckmarkOutline, IoChevronDownOutline } from 'react-icons/io5';

export interface SelectOption {
  value: any;
  label: string;
}

export interface SelectProps {
  label?: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  required?: boolean;
  error?: string;
  className?: string;
  containerClassName?: string;
  options?: SelectOption[];
  value?: any;
  onChange?: (e: { target: { name?: string; value: any } }) => void;
  name?: string;
  placeholder?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  icon: Icon,
  required = false,
  error,
  className = '',
  containerClassName = '',
  options = [],
  value,
  onChange,
  name,
  placeholder = 'Chọn...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: any) => {
    if (onChange) {
      onChange({ target: { name, value: optionValue } });
    }
    setIsOpen(false);
  };

  return (
    <div className={containerClassName} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}

      <div className="relative">
        <div
          className={`w-full py-2.5 px-3.5 bg-white border rounded-xl cursor-pointer flex items-center justify-between transition-all select-none ${
            Icon ? 'pl-10 pr-10' : 'px-3.5 pr-10'
          } ${error ? 'border-error' : 'border-border-grey'} ${
            isOpen ? 'ring-2 ring-blue-100 border-primary' : 'hover:border-slate-300'
          } ${className}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Icon size={18} strokeWidth={1.5} className="text-slate-400" />
            </div>
          )}

          <span
            className={`block truncate text-sm ${
              !selectedOption ? 'text-slate-400' : 'text-[#002146] font-medium'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <IoChevronDownOutline
              size={18}
              strokeWidth={1.5}
              className={`text-slate-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-primary' : ''
              }`}
            />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1.5 bg-white border border-border-grey rounded-xl shadow-xl max-h-56 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-100">
            <ul className="space-y-0.5 m-0">
              {options.map((option) => (
                <li
                  key={String(option.value)}
                  title={option.label}
                  className={`px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors text-xs ${
                    option.value === value ? 'text-primary font-bold bg-[#EBF3FF]' : 'text-[#002146] font-medium'
                  }`}
                  onClick={() => handleSelect(option.value)}
                >
                  <span className="truncate pr-2">{option.label}</span>
                  {option.value === value && (
                    <IoCheckmarkOutline size={16} strokeWidth={2.5} className="shrink-0 text-primary" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="text-error text-xs mt-1.5 font-medium">{error}</p>}
    </div>
  );
};

export default Select;
