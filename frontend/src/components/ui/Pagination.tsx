import React from 'react';
import { IoChevronBackOutline, IoChevronForwardOutline } from 'react-icons/io5';

export interface PaginationProps {
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  onItemsPerPageChange?: (size: number) => void;
  itemsPerPageOptions?: number[];
  itemLabel?: string;
  className?: string;
  showAlways?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 20, 50],
  itemLabel = 'mục',
  className = '',
  showAlways = false
}) => {
  // If no items at all, don't show
  if (totalItems !== undefined && totalItems === 0) return null;
  // If classic call without totalItems and totalPages <= 1, return null
  if (totalItems === undefined && totalPages <= 1 && !showAlways) return null;

  const pagesCount = Math.max(1, totalPages);
  const getPageNumbers = (): (number | string)[] => {
    if (pagesCount <= 7) {
      return Array.from({ length: pagesCount }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, 6, '...', pagesCount];
    }
    if (currentPage >= pagesCount - 4) {
      return [1, '...', pagesCount - 5, pagesCount - 4, pagesCount - 3, pagesCount - 2, pagesCount - 1, pagesCount];
    }
    return [1, '...', currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2, '...', pagesCount];
  };

  const pages = getPageNumbers();
  const effectiveSize = itemsPerPage || 10;
  const startItem = totalItems !== undefined ? (totalItems === 0 ? 0 : (currentPage - 1) * effectiveSize + 1) : null;
  const endItem = totalItems !== undefined ? Math.min(currentPage * effectiveSize, totalItems) : null;

  return (
    <div className={`px-4 py-3 border-t border-border-grey bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant ${className}`}>
      {/* Thông tin số lượng bản ghi hiển thị nếu có totalItems */}
      {totalItems !== undefined ? (
        <div className="flex items-center gap-2">
          <span>
            Hiển thị <strong>{startItem}</strong> - <strong>{endItem}</strong> trong tổng số <strong>{totalItems.toLocaleString()}</strong> {itemLabel}
          </span>
        </div>
      ) : <div />}

      <div className="flex items-center gap-3">
        {/* Dropdown chọn số lượng / trang nếu có callback */}
        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5">
            <span className="whitespace-nowrap">Hiển thị:</span>
            <select
              value={effectiveSize}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 border border-border-grey rounded-md bg-white text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer"
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Các nút phân trang */}
        <div className="flex items-center gap-1">
          {/* Nút lùi trang < */}
          <button
            type="button"
            onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors ${
              currentPage <= 1
                ? 'border-border-grey/50 bg-gray-50 text-gray-400 cursor-not-allowed'
                : 'border-border-grey bg-white hover:bg-surface-container-low text-on-surface cursor-pointer'
            }`}
            title="Trang trước"
          >
            <IoChevronBackOutline size={14} />
          </button>

          {/* Danh sách các trang */}
          <div className="flex items-center gap-1">
            {pages.map((page, index) => {
              if (page === '...') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1 text-xs text-gray-400 select-none font-medium"
                  >
                    ...
                  </span>
                );
              }

              const pageNum = Number(page);
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => onPageChange && onPageChange(pageNum)}
                  className={`min-w-[28px] h-7 px-1.5 rounded-md flex items-center justify-center text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white shadow-xs'
                      : 'border border-border-grey bg-white text-on-surface hover:bg-surface-container-low hover:border-primary/50'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Nút tiến trang > */}
          <button
            type="button"
            onClick={() => onPageChange && onPageChange(Math.min(pagesCount, currentPage + 1))}
            disabled={currentPage >= pagesCount}
            className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors ${
              currentPage >= pagesCount
                ? 'border-border-grey/50 bg-gray-50 text-gray-400 cursor-not-allowed'
                : 'border-border-grey bg-white hover:bg-surface-container-low text-on-surface cursor-pointer'
            }`}
            title="Trang sau"
          >
            <IoChevronForwardOutline size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
