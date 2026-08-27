import React from 'react';

/**
 * PageHeader — Component dùng chung để thống nhất header các trang admin tinh gọn.
 *
 * @param {React.ElementType} icon - Lucide/Ionicons icon component
 * @param {string} title           - Tiêu đề trang
 * @param {string} [subtitle]      - Mô tả ngắn (tùy chọn)
 * @param {React.ReactNode} [actions] - Nút/action bên phải header
 */
const PageHeader = ({ icon: Icon, title, subtitle, actions, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 mb-2 border-b border-border-grey">
    <div className="flex items-center gap-2.5 min-w-0">
      {Icon && (
        <div className="w-8 h-8 bg-surface-blue-light rounded-lg flex items-center justify-center shrink-0">
          <Icon size={18} className="text-primary" />
        </div>
      )}
      <div className="min-w-0">
        <h1 className="font-title-lg text-on-surface font-bold text-base sm:text-lg leading-tight truncate">
          {title}
        </h1>
      </div>
    </div>

    {(actions || children) && (
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {actions || children}
      </div>
    )}
  </div>
);

export default PageHeader;
