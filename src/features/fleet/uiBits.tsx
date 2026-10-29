import { useState } from 'react';

/** Minimal controlled input styled with the app's v-input convention. */
export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-muted">{label}</span>}
      <input className="v-input w-full" {...rest} />
    </label>
  );
}

/** Thin wrapper keeping selects consistent with Input. */
export function LabeledSelect(props: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const { label, children, ...rest } = props;
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-muted">{label}</span>}
      <select className="v-input w-full" {...rest}>{children}</select>
    </label>
  );
}

/** Small reusable disclosure shell. */
export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return { open, onOpen: () => setOpen(true), onClose: () => setOpen(false), onToggle: () => setOpen((v) => !v) };
}
