import { SelectHTMLAttributes, ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  placeholder?: string;
  children: ReactNode;
}

export function Select({ label, error, placeholder, className = '', children, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && <label className="v-label">{label}</label>}
      <select
        className={`v-input appearance-none cursor-pointer ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-500/10' : ''} ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
