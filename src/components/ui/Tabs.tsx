import { ReactNode } from 'react';

interface Tab {
  key: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex bg-subtle rounded-lg p-0.5 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all ${
            active === tab.key
              ? 'bg-surface text-ink shadow-sm'
              : 'text-muted hover:text-ink'
          }`}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${active === tab.key ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300' : 'bg-subtle-hover text-muted'}`}>
            {tab.count}
          </span>
          )}
        </button>
      ))}
    </div>
  );
}
