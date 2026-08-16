import React from 'react';

/**
 * PageHeader — Component dùng chung để thống nhất header các trang admin.
 *
 * @param {React.ElementType} icon - Lucide icon component
 * @param {string} title           - Tiêu đề trang
 * @param {string} [subtitle]      - Mô tả ngắn bên dưới tiêu đề
 * @param {React.ReactNode} [actions] - Nút/action bên phải header
 */
const PageHeader = ({ icon: Icon, title, subtitle, actions, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 mb-1 border-b border-border-grey">
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="w-11 h-11 bg-surface-blue-light rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon size={22} className="text-primary" />
        </div>
      )}
      <div className="min-w-0">
        <h1 className="font-headline-md text-on-surface leading-tight">{title}</h1>
        {subtitle && (
          <p className="font-body-md text-on-surface-variant mt-0.5 text-sm">{subtitle}</p>
        )}
      </div>
    </div>

    {(actions || children) && (
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions || children}
      </div>
    )}
  </div>
);

export default PageHeader;
