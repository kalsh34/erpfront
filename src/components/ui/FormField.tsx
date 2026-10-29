import { InputHTMLAttributes, ReactNode } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  /** Wrapper pattern: FormField renders its label around the given control
   *  (input/select/textarea) instead of its own internal <input>. */
  children?: ReactNode;
}

/**
 * Form field with two usage patterns:
 *  1. Self-closing  — <FormField label="Name" value={v} onChange={...} /> renders an <input>.
 *  2. With children — <FormField label="X"><select …/></FormField> wraps any control.
 * The children pattern is what every payroll tab uses; rendering children onto
 * the internal <input> would crash React (void element with children).
 */
export function FormField({ label, error, hint, icon, className = '', required, children, ...props }: FormFieldProps) {
  return (
    <div className="w-full">
      {label && <label className={`v-label ${required ? 'v-label--required' : ''}`}>{label}</label>}
      {children ? (
        <div className="relative">{children}</div>
      ) : (
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">{icon}</div>}
          <input
            required={required}
            className={`v-input ${icon ? '!pl-10' : ''} ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-500/10' : ''} ${className}`}
            {...props}
          />
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
