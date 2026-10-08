import React from 'react';
import { cn } from '../../utils/cn';

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={cn('flex items-center gap-1 border-b border-border overflow-x-auto no-scrollbar', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 whitespace-nowrap',
              isActive
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-secondary hover:text-primary hover:border-border'
            )}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-mono',
                  isActive
                    ? 'bg-primary text-surface-white'
                    : 'bg-border text-secondary'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
