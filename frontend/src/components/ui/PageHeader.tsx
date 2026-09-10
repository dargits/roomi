import React, { ReactNode } from 'react';

export interface PageHeaderProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  actions,
  children
}) => (
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
        {subtitle && <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>}
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
