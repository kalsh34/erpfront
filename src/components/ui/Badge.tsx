import { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: ReactNode;
  className?: string;
}

// Semantic palette: success=green, warning=amber, error=red, info=blue, default=subtle neutral.
const variantStyles = {
  default: 'bg-subtle text-muted border border-line',
  success: 'bg-success-subtle text-success-text border border-success-line',
  warning: 'bg-warning-subtle text-warning-text border border-warning-line',
  danger: 'bg-danger-subtle text-danger-text border border-danger-line',
  info: 'bg-info-subtle text-info-text border border-info-line',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
