import React, { useEffect, useRef, useState } from 'react';
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
  value?: string;
  onChange?: (id: string) => void;
  variant?: 'line' | 'pill';
  className?: string;
}

/**
 * Tabs component that synchronizes with URL query parameters or controlled state.
 * Có hiệu ứng indicator trượt mượt mà (gliding active indicator) giữa các tab.
 */
const Tabs: React.FC<TabsProps> = ({
  tabs = [],
  paramKey = 'tab',
  defaultTab,
  value,
  onChange,
  variant = 'line',
  className = 'mb-4'
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isControlled = value !== undefined;
  const activeTab = isControlled 
    ? value 
    : (searchParams.get(paramKey) || defaultTab || (tabs.length > 0 ? tabs[0].id : ''));

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; height?: number; top?: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0
  });
  const [hasMoved, setHasMoved] = useState(false);

  useEffect(() => {
    if (!isControlled && !searchParams.get(paramKey) && activeTab) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set(paramKey, activeTab);
      setSearchParams(newParams, { replace: true });
    }
  }, [isControlled, searchParams, setSearchParams, paramKey, activeTab]);

  useEffect(() => {
    const updateIndicator = () => {
      const el = tabRefs.current[activeTab];
      if (el) {
        setIndicatorStyle({
          left: el.offsetLeft,
          width: el.offsetWidth,
          height: el.offsetHeight,
          top: el.offsetTop,
          opacity: 1
        });
        setHasMoved(true);
      } else {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    const rafId = requestAnimationFrame(updateIndicator);
    window.addEventListener('resize', updateIndicator);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeTab, tabs]);

  const handleTabChange = (id: string) => {
    if (onChange) {
      onChange(id);
    }
    if (!isControlled) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set(paramKey, id);
      setSearchParams(newParams);
    }
  };

  const isPill = variant === 'pill';

  return (
    <div
      className={`relative flex items-center overflow-x-auto ${
        isPill
          ? `p-1 bg-surface-container-low rounded-xl border border-border-grey w-fit ${className}`
          : `border-b border-border-grey ${className}`
      }`}
    >
      {/* Gliding Active Indicator */}
      {indicatorStyle.opacity > 0 && (
        <span
          className={`absolute pointer-events-none ${
            isPill
              ? 'rounded-lg bg-white shadow-xs border border-slate-100 z-0'
              : 'bottom-0 h-[2.5px] bg-primary rounded-t z-0'
          }`}
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
            ...(isPill
              ? { top: `${indicatorStyle.top}px`, height: `${indicatorStyle.height}px` }
              : {}),
            opacity: indicatorStyle.opacity,
            transition: hasMoved
              ? 'left 0.28s cubic-bezier(0.22, 1, 0.36, 1), width 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.15s ease'
              : 'opacity 0.15s ease',
            transform: 'translateZ(0)'
          }}
        />
      )}

      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[tab.id] = el; }}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 focus:outline-none transition-colors duration-200 relative whitespace-nowrap cursor-pointer z-10 ${
              isPill
                ? `px-4 py-2 rounded-lg text-xs font-semibold ${
                    isActive
                      ? 'text-primary font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`
                : `py-3 px-5 font-semibold text-sm ${
                    isActive
                      ? 'text-primary font-bold'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                  }`
            }`}
          >
            {Icon && <Icon size={isPill ? 16 : 18} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
