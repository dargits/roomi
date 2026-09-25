import React, { useState, useRef, useEffect } from 'react';
import { DateRange, RangeKeyDict, Range } from 'react-date-range';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { IoCalendarClearOutline, IoCalendarOutline, IoCloseOutline, IoCheckmarkOutline } from 'react-icons/io5';
import 'react-date-range/dist/styles.css'; 
import 'react-date-range/dist/theme/default.css'; 

interface SearchBarProps {
  onSearch?: (from: Date, to: Date) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dateRange, setDateRange] = useState<Range[]>([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: 'selection'
    }
  ]);

  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (ranges: RangeKeyDict) => {
    if (ranges.selection) {
      setDateRange([ranges.selection]);
      if (ranges.selection.startDate && ranges.selection.endDate && ranges.selection.startDate !== ranges.selection.endDate) {
        setIsSelected(true);
      }
    }
  };

  const startDate = dateRange[0]?.startDate || new Date();
  const endDate = dateRange[0]?.endDate || new Date();
  const nights = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="w-full max-w-4xl px-2 sm:px-4 z-30 relative">
      <div className="bg-surface-container p-2 rounded-xl md:rounded-lg shadow-md border border-border-grey flex flex-col md:flex-row gap-2">
        
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
              {isSelected && dateRange[0]?.startDate ? (
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
              {isSelected && dateRange[0]?.endDate ? (
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
              className="absolute top-[110%] left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 z-50 bg-white shadow-2xl rounded-2xl md:rounded-xl border border-border-grey overflow-hidden w-[calc(100vw-24px)] sm:w-auto animate-in fade-in zoom-in-95 duration-150" 
              onClick={e => e.stopPropagation()}
            >
              {/* Popover Header */}
              <div className="p-3.5 sm:p-4 border-b border-border-grey bg-surface-container-lowest flex items-center justify-between">
                <div>
                  <h3 className="font-title-md sm:font-title-lg text-sm sm:text-base text-on-surface font-semibold">Chọn ngày lưu trú để xem giá</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {isSelected 
                      ? `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')} (${nights} đêm)`
                      : `Ngày nhận phòng - Ngày trả phòng (${nights} đêm)`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(false)}
                  className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  aria-label="Đóng"
                >
                  <IoCloseOutline size={22} />
                </button>
              </div>

              {/* Calendar Body */}
              <div className="overflow-x-auto flex justify-center p-2">
                <DateRange
                  editableDateInputs={true}
                  onChange={handleSelect}
                  moveRangeOnFirstSelection={false}
                  ranges={dateRange}
                  months={isMobile ? 1 : 2}
                  direction={isMobile ? 'vertical' : 'horizontal'}
                  locale={vi}
                  minDate={new Date()}
                  rangeColors={['#0070F4']}
                />
              </div>

              {/* Popover Footer */}
              <div className="p-3 border-t border-border-grey bg-surface-container-lowest flex items-center justify-between gap-2">
                <span className="text-[11px] sm:text-xs text-on-surface-variant truncate">
                  {nights > 0 ? `Đã chọn ${nights} đêm` : 'Vui lòng chọn ngày'}
                </span>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDatePicker(false);
                      if (onSearch && dateRange[0]?.startDate && dateRange[0]?.endDate) {
                        onSearch(dateRange[0].startDate, dateRange[0].endDate);
                      }
                    }}
                    className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors shadow-xs cursor-pointer active:scale-95"
                  >
                    <IoCheckmarkOutline size={16} />
                    Áp dụng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button 
          onClick={() => {
            if (onSearch && dateRange[0]?.startDate && dateRange[0]?.endDate) {
              onSearch(dateRange[0].startDate, dateRange[0].endDate);
            }
          }}
          className="bg-primary text-on-primary font-bold text-xs sm:text-sm w-full md:w-auto px-8 py-3.5 rounded-lg uppercase tracking-wider hover:bg-primary-hover transition-all shadow-xs whitespace-nowrap cursor-pointer active:scale-98"
        >
          TÌM PHÒNG TRỐNG
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
