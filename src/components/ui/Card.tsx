import { ReactNode } from 'react';

/** HTML attributes (class, data-*, aria-*) may be passed through. */
type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  padding?: boolean;
};

/** White surface, light-gray border, soft shadow — the one card style used everywhere. */
export function Card({ children, className = '', padding = true, ...rest }: CardProps) {
  return (
    <div className={`bg-surface border border-line rounded-2xl shadow-card ${padding ? 'p-6' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-base font-semibold text-ink ${className}`}>{children}</h3>;
}
