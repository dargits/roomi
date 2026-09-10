import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export interface TabsProps {
  tabs?: TabItem[];
  paramKey?: string;
  defaultTab?: string;
  className?: string;
}

/**
 * Tabs component that synchronizes with URL query parameters.
 */
const Tabs: React.FC<TabsProps> = ({
  tabs = [],
  paramKey = 'tab',
  defaultTab,
  className = 'mb-4'
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get(paramKey) || defaultTab || (tabs.length > 0 ? tabs[0].id : '');

  useEffect(() => {
    if (!searchParams.get(paramKey) && activeTab) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set(paramKey, activeTab);
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, paramKey, activeTab]);

  const handleTabChange = (id: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set(paramKey, id);
    setSearchParams(newParams);
  };

  return (
    <div className={`flex border-b border-border-grey overflow-x-auto ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={`py-3 px-5 font-semibold text-sm flex items-center gap-2 focus:outline-none transition-colors relative whitespace-nowrap cursor-pointer ${
              isActive
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            {Icon && <Icon size={18} />}
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
