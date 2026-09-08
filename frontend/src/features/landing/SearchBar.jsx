import React, { useState, useRef, useEffect } from 'react';
import { DateRange } from 'react-date-range';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { IoCalendarClearOutline, IoCalendarOutline } from 'react-icons/io5';
import 'react-date-range/dist/styles.css'; 
import 'react-date-range/dist/theme/default.css'; 

const SearchBar = ({ onSearch }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: 'selection'
    }
  ]);

  const datePickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (ranges) => {
    setDateRange([ranges.selection]);
    if (ranges.selection.startDate !== ranges.selection.endDate) {
      setIsSelected(true);
    }
  };

  const nights = Math.round((dateRange[0].endDate - dateRange[0].startDate) / (1000 * 60 * 60 * 24));

  return (
    <div className="w-full max-w-4xl px-4 z-20 relative">
      <div className="bg-surface-container p-2 rounded-lg shadow-md border border-border-grey flex flex-col md:flex-row gap-2">
        
        {/* Combined Date Inputs Wrapper */}
        <div 
          ref={datePickerRef}
          className={`flex-1 flex items-center bg-white border-2 rounded cursor-pointer relative transition-colors ${showDatePicker ? 'border-primary' : 'border-border-grey hover:border-outline-variant'}`}
          onClick={() => setShowDatePicker(true)}
        >
          {/* Check-in */}
          <div className="flex-1 flex items-center px-4 py-3 relative">
            <IoCalendarOutline className="text-outline mr-3" size={24} strokeWidth={1.5} />
            <div className="flex flex-col flex-1">
              {isSelected ? (
                <span className="font-bold text-on-surface text-base">
                  {format(dateRange[0].startDate, 'dd/MM/yyyy')}
                </span>
              ) : (
                <span className="font-bold text-on-surface text-base">Nhận phòng</span>
              )}
            </div>
            {/* Vertical Divider */}
            <div className="absolute right-0 top-[15%] bottom-[15%] w-[1px] bg-border-grey"></div>
          </div>
          
          {/* Check-out */}
          <div className="flex-1 flex items-center px-4 py-3">
            <IoCalendarClearOutline className="text-outline mr-3" size={24} strokeWidth={1.5} />
            <div className="flex flex-col flex-1">
              {isSelected ? (
                <span className="font-bold text-on-surface text-base">
                  {format(dateRange[0].endDate, 'dd/MM/yyyy')}
                </span>
              ) : (
                <span className="font-bold text-on-surface text-base">Trả phòng</span>
              )}
            </div>
          </div>

          {/* Date Picker Popover */}
          {showDatePicker && (
            <div 
              className="absolute top-[110%] left-0 z-50 bg-white shadow-xl rounded-lg border border-border-grey overflow-hidden" 
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border-grey bg-surface-container-lowest">
                <h3 className="font-title-lg text-title-lg text-on-surface">Xác nhận ngày quý khách đến/đi để xem giá</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Ngày nhận phòng - Ngày trả phòng ({nights} đêm)
                </p>
              </div>
              <DateRange
                editableDateInputs={true}
                onChange={handleSelect}
                moveRangeOnFirstSelection={false}
                ranges={dateRange}
                months={2}
                direction="horizontal"
                locale={vi}
                minDate={new Date()}
                rangeColors={['#005ea4']}
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button 
          onClick={() => {
            if (onSearch) {
              onSearch(dateRange[0].startDate, dateRange[0].endDate);
            }
          }}
          className="bg-primary text-on-primary font-label-md text-label-md px-10 py-3 rounded uppercase tracking-wide hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm whitespace-nowrap"
        >
          TÌM PHÒNG TRỐNG
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
