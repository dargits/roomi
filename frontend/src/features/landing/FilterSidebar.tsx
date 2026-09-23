import React, { useState, useEffect } from 'react';
import { 
  IoFilterOutline, 
  IoChevronDownOutline, 
  IoChevronUpOutline 
} from 'react-icons/io5';

interface FilterSidebarProps {
  roomTypes?: string[];
  selectedTypes?: string[];
  onTypeChange?: (type: string, checked: boolean) => void;
  selectedAmenities?: string[];
  onAmenityChange?: (amenity: string, checked: boolean) => void;
  maxPriceLimit?: number;
  priceLimit?: number;
  onPriceChange?: (price: number) => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ 
  roomTypes = [], 
  selectedTypes = [], 
  onTypeChange = () => {},
  selectedAmenities = [],
  onAmenityChange = () => {},
  maxPriceLimit = 10000000,
  priceLimit = 10000000,
  onPriceChange = () => {}
}) => {
  const [localPriceLimit, setLocalPriceLimit] = useState(priceLimit);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // Sync local state when parent prop changes on mount/fetch
  useEffect(() => {
    setLocalPriceLimit(priceLimit);
  }, [priceLimit]);

  // Extract unique room types
  const uniqueTypes = [...new Set(roomTypes)];
  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN').format(price) + ' ₫';

  const amenitiesOptions = ['View biển', 'Bồn tắm', 'Ban công', 'Điều hòa', 'TV'];

  const activeFiltersCount = 
    selectedTypes.length + 
    selectedAmenities.length + 
    (priceLimit < maxPriceLimit ? 1 : 0);

  return (
    <aside className="md:col-span-3">
      <div className="bg-surface-container-lowest border border-border-grey rounded-2xl md:rounded-xl p-4 md:sticky md:top-24 shadow-xs">
        {/* Toggle header on mobile, standard title on desktop */}
        <button
          type="button"
          onClick={() => setIsMobileExpanded(prev => !prev)}
          className="w-full flex items-center justify-between pb-3 border-b border-border-grey cursor-pointer md:cursor-default"
        >
          <div className="flex items-center gap-2">
            <IoFilterOutline size={18} className="text-primary" />
            <h3 className="font-title-lg text-title-lg text-on-surface font-bold">Lọc kết quả</h3>
            {activeFiltersCount > 0 && (
              <span className="bg-primary text-white text-[11px] px-2 py-0.5 rounded-full font-bold shadow-2xs">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <div className="md:hidden flex items-center gap-1 text-xs text-primary font-semibold bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/20">
            <span>{isMobileExpanded ? 'Thu gọn' : 'Tùy chọn lọc'}</span>
            {isMobileExpanded ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
          </div>
        </button>
        
        {/* Filter Content: Collapsed by default on mobile for quick browsing, visible on md+ */}
        <div className={`${isMobileExpanded ? 'block pt-4' : 'hidden'} md:block md:pt-4 space-y-6 animate-fade-in`}>
          {/* Filter Group: Room Type */}
          <div>
            <h4 className="font-label-md text-label-md text-on-surface-variant mb-2.5 uppercase font-semibold">Loại phòng</h4>
            <div className="space-y-1.5">
              {uniqueTypes.length === 0 && (
                <span className="text-on-surface-variant font-body-sm text-xs">Đang cập nhật...</span>
              )}
              {uniqueTypes.map(type => {
                const isChecked = selectedTypes.includes(type);
                return (
                  <label 
                    key={type} 
                    className={`flex items-center gap-2.5 cursor-pointer p-2 rounded-lg transition-colors min-h-[38px] ${isChecked ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface-container-low text-on-surface'}`}
                  >
                    <input 
                      className="rounded-sm border-border-grey text-primary focus:ring-primary h-4 w-4 shrink-0" 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={(e) => onTypeChange(type, e.target.checked)}
                    />
                    <span className="text-xs sm:text-sm">
                      {type}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Filter Group: Amenities */}
          <div>
            <h4 className="font-label-md text-label-md text-on-surface-variant mb-2.5 uppercase font-semibold">Tiện ích nổi bật</h4>
            <div className="space-y-1.5">
              {amenitiesOptions.map(amenity => {
                const isChecked = selectedAmenities.includes(amenity);
                return (
                  <label 
                    key={amenity} 
                    className={`flex items-center gap-2.5 cursor-pointer p-2 rounded-lg transition-colors min-h-[38px] ${isChecked ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface-container-low text-on-surface'}`}
                  >
                    <input 
                      className="rounded-sm border-border-grey text-primary focus:ring-primary h-4 w-4 shrink-0" 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={(e) => onAmenityChange(amenity, e.target.checked)}
                    />
                    <span className="text-xs sm:text-sm">{amenity}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Filter Group: Price */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-label-md text-label-md text-on-surface-variant uppercase font-semibold">Mức giá tối đa</h4>
              <span className="font-bold text-xs text-primary">{formatPrice(localPriceLimit)}</span>
            </div>
            <input 
              className="w-full accent-primary h-2 bg-surface-container-high rounded-lg cursor-pointer" 
              type="range" 
              min="0"
              max={maxPriceLimit}
              step="100000"
              value={localPriceLimit}
              onChange={(e) => setLocalPriceLimit(Number(e.target.value))}
              onMouseUp={() => onPriceChange(localPriceLimit)}
              onTouchEnd={() => onPriceChange(localPriceLimit)}
            />
            <div className="flex justify-between mt-1.5 text-[11px] text-on-surface-variant">
              <span>0 ₫</span>
              <span>{formatPrice(maxPriceLimit)}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;
