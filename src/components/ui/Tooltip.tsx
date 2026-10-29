import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info } from 'lucide-react';

export interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  icon?: 'info' | 'help';
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  popupClassName?: string;
  ariaLabel?: string;
}

export function Tooltip({
  content,
  children,
  icon = 'info',
  position = 'top',
  className = '',
  popupClassName = '',
  ariaLabel,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Close when clicked outside on mobile / touch devices
  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  if (!content) return <>{children || null}</>;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 dark:border-t-slate-800 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 dark:border-b-slate-800 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 dark:border-l-slate-800 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 dark:border-r-slate-800 border-y-transparent border-l-transparent',
  }[position];

  const IconComponent = icon === 'help' ? HelpCircle : Info;

  return (
    <span
      ref={containerRef}
      className={`group relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {children ? (
        children
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="inline-flex items-center justify-center text-slate-400 hover:text-primary-600 dark:text-slate-500 dark:hover:text-primary-400 transition-colors p-0.5 rounded-full focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-help"
          aria-label={ariaLabel || 'More information'}
        >
          <IconComponent className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Floating tooltip box */}
      <span
        role="tooltip"
        className={`absolute ${positionClasses} z-50 pointer-events-none transition-all duration-150 transform ${
          isOpen
            ? 'opacity-100 scale-100 visible'
            : 'opacity-0 scale-95 pointer-events-none invisible'
        } ${popupClassName}`}
      >
        <span className="block max-w-[calc(100vw-3rem)] sm:max-w-sm w-max rounded-lg bg-slate-900 dark:bg-slate-800 text-slate-100 px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal shadow-xl border border-slate-700/60 text-left">
          {content}
        </span>
        <span
          className={`absolute w-0 h-0 border-4 ${arrowClasses}`}
          aria-hidden="true"
        />
      </span>
    </span>
  );
}

/** Convenience alias for info icon tooltips */
export function InfoTooltip(props: TooltipProps) {
  return <Tooltip {...props} />;
}

export default Tooltip;
