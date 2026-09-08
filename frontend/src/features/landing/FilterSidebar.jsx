import React from 'react';

const FilterSidebar = ({ 
  roomTypes = [], 
  selectedTypes = [], 
  onTypeChange = () => {},
  selectedAmenities = [],
  onAmenityChange = () => {},
  maxPriceLimit = 10000000,
  priceLimit = 10000000,
  onPriceChange = () => {}
}) => {
  const [localPriceLimit, setLocalPriceLimit] = React.useState(priceLimit);

  // Sync local state when parent prop changes on mount/fetch
  React.useEffect(() => {
    setLocalPriceLimit(priceLimit);
  }, [priceLimit]);

  // Extract unique room types
  const uniqueTypes = [...new Set(roomTypes)];
  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + ' ₫';

  const amenitiesOptions = ['View biển', 'Bồn tắm', 'Ban công', 'Điều hòa', 'TV'];

  return (
    <aside className="md:col-span-3">
      <div className="bg-surface-container-lowest border border-border-grey rounded p-4 sticky top-24">
        <h3 className="font-title-lg text-title-lg text-on-surface mb-4 pb-2 border-b border-border-grey">Lọc kết quả</h3>
        
        {/* Filter Group: Room Type */}
        <div className="mb-6">
          <h4 className="font-label-md text-label-md text-on-surface-variant mb-2 uppercase">Loại phòng</h4>
          <div className="space-y-2">
            {uniqueTypes.length === 0 && (
              <span className="text-on-surface-variant font-body-sm">Đang cập nhật...</span>
            )}
            {uniqueTypes.map(type => {
              const isChecked = selectedTypes.includes(type);
              return (
                <label 
                  key={type} 
                  className={`flex items-center gap-2 cursor-pointer p-1 rounded transition-colors ${isChecked ? 'bg-surface-blue-light' : 'hover:bg-surface-container-low'}`}
                >
                  <input 
                    className="rounded-sm border-border-grey text-primary focus:ring-primary h-4 w-4" 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={(e) => onTypeChange(type, e.target.checked)}
                  />
                  <span className={`font-body-md text-body-md text-on-surface ${isChecked ? 'font-semibold' : ''}`}>
                    {type}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Filter Group: Amenities */}
        <div className="mb-6">
          <h4 className="font-label-md text-label-md text-on-surface-variant mb-2 uppercase">Tiện ích nổi bật</h4>
          <div className="space-y-2">
            {amenitiesOptions.map(amenity => {
              const isChecked = selectedAmenities.includes(amenity);
              return (
                <label key={amenity} className={`flex items-center gap-2 cursor-pointer p-1 rounded transition-colors ${isChecked ? 'bg-surface-blue-light' : 'hover:bg-surface-container-low'}`}>
                  <input 
                    className="rounded-sm border-border-grey text-primary focus:ring-primary h-4 w-4" 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={(e) => onAmenityChange(amenity, e.target.checked)}
                  />
                  <span className={`font-body-md text-body-md text-on-surface ${isChecked ? 'font-semibold' : ''}`}>{amenity}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Filter Group: Price */}
        <div>
          <h4 className="font-label-md text-label-md text-on-surface-variant mb-2 uppercase">Khoảng giá (tối đa)</h4>
          <div className="mb-2 font-label-md text-primary text-right">{formatPrice(localPriceLimit)}</div>
          <input 
            className="w-full accent-primary" 
            type="range" 
            min="0"
            max={maxPriceLimit}
            step="100000"
            value={localPriceLimit}
            onChange={(e) => setLocalPriceLimit(Number(e.target.value))}
            onMouseUp={() => onPriceChange(localPriceLimit)}
            onTouchEnd={() => onPriceChange(localPriceLimit)}
          />
          <div className="flex justify-between mt-2 font-body-md text-body-md text-on-surface-variant">
            <span>0 ₫</span>
            <span>{formatPrice(maxPriceLimit)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;
