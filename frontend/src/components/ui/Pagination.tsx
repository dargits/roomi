import React from 'react';
import { IoChevronBackOutline, IoChevronForwardOutline } from 'react-icons/io5';

export interface PaginationProps {
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = ''
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, 6, '...', totalPages];
    }
    if (currentPage >= totalPages - 4) {
      return [1, '...', totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div className={`flex items-center justify-center gap-2 py-4 border-t border-border-grey/60 ${className}`}>
      {/* Nút lùi trang < */}
      <button
        type="button"
        onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          currentPage === 1
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer'
        }`}
        title="Trang trước"
      >
        <IoChevronBackOutline size={15} />
      </button>

      {/* Danh sách các nút số tròn */}
      <div className="flex items-center gap-2">
        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-1 text-sm text-gray-400 select-none font-medium"
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
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#48bb78] text-white shadow-xs font-semibold'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-[#48bb78] hover:text-[#48bb78]'
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
        onClick={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          currentPage === totalPages
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 cursor-pointer'
        }`}
        title="Trang sau"
      >
        <IoChevronForwardOutline size={15} />
      </button>
    </div>
  );
};

export default Pagination;
