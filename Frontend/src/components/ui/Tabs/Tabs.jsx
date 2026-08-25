import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Tabs component that synchronizes with URL query parameters.
 * 
 * @param {Array} tabs - Array of tab objects { id: 'tab_id', label: 'Tab Label', icon: OptionalIcon }
 * @param {string} paramKey - URL search param key, default 'tab'
 * @param {string} defaultTab - Default tab id if none in URL
 * @param {string} className - Optional extra wrapper class
 */
const Tabs = ({ tabs = [], paramKey = 'tab', defaultTab, className = 'mb-4' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get(paramKey) || defaultTab || (tabs.length > 0 ? tabs[0].id : '');

  useEffect(() => {
    if (!searchParams.get(paramKey) && activeTab) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set(paramKey, activeTab);
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, paramKey, activeTab]);

  const handleTabChange = (id) => {
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
            onClick={() => handleTabChange(tab.id)}
            className={`py-3 px-5 font-semibold text-sm flex items-center gap-2 focus:outline-none transition-colors relative whitespace-nowrap ${
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
