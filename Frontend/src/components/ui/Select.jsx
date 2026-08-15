import React, { useState, useRef, useEffect } from 'react';
import { IoCheckmarkOutline, IoChevronDownOutline } from 'react-icons/io5';

const Select = ({ 
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
  placeholder = "Chọn..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue) => {
    if (onChange) {
      onChange({ target: { name, value: optionValue } });
    }
    setIsOpen(false);
  };

  return (
    <div className={containerClassName} ref={containerRef}>
      {label && (
        <label className="block font-label-md text-on-surface-variant mb-1.5">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div 
          className={`w-full py-2.5 bg-surface border rounded-lg cursor-pointer flex items-center justify-between transition-all select-none ${Icon ? 'pl-10 pr-10' : 'px-4 pr-10'} ${error ? 'border-error' : 'border-border-grey'} ${isOpen ? 'ring-2 ring-primary/20 border-primary' : 'hover:border-primary/50'} ${className}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon size={20} strokeWidth={1.5} className="text-on-surface-variant/70" />
            </div>
          )}
          
          <span className={`block truncate font-body-md ${!selectedOption ? 'text-on-surface-variant/70' : 'text-on-surface'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <IoChevronDownOutline size={20} strokeWidth={1.5} className={`text-on-surface-variant/70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-surface border border-border-grey rounded-lg shadow-lg max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100">
            <ul className="py-1 m-0">
              {options.map((option) => (
                <li
                  key={option.value}
                  className={`px-4 py-2.5 cursor-pointer flex items-center justify-between hover:bg-surface-blue-light transition-colors font-body-md ${option.value === value ? 'text-primary font-medium bg-surface-blue-light/50' : 'text-on-surface'}`}
                  onClick={() => handleSelect(option.value)}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <IoCheckmarkOutline size={18} strokeWidth={2} />}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-error text-xs mt-1.5">{error}</p>
      )}
    </div>
  );
};

export default Select;
