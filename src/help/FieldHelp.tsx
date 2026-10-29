import { AlertTriangle } from 'lucide-react';
import { Tooltip } from '../components/ui';

export interface FieldHintProps {
  /** Field name shown as the tooltip title. */
  title: string;
  /** What to enter / pick. */
  what: string;
  /** A realistic example. */
  example?: string;
  /** Validation rule enforced by the form/backend. */
  validation?: string;
}

/**
 * Contextual field help: a small info icon that is placed next to (or inside)
 * a field's label. Renders what to enter, an example, and validation rules —
 * nothing is saved or submitted by the hint.
 */
export function FieldHint({ title, what, example, validation }: FieldHintProps) {
  const content = (
    <span className="block text-left">
      <span className="block font-semibold text-slate-100 mb-0.5">{title}</span>
      <span className="block">{what}</span>
      {example && <span className="block mt-1 text-slate-300 italic">e.g. {example}</span>}
      {validation && (
        <span className="flex items-start gap-1 mt-1.5 text-amber-300">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{validation}</span>
        </span>
      )}
    </span>
  );
  return (
    <Tooltip content={content} icon="info" className="ml-1" ariaLabel={`Help for ${title}`} />
  );
}

export interface ActionHintProps {
  /** Button name, e.g. "Calculate payroll". */
  label: string;
  /** What happens when it is used. */
  does: string;
  /** Short consequence warning ("IRREVERSIBLE", "LOCKS THE PERIOD"...). */
  warning?: string;
  /** Requirement shown when the button would be disabled. */
  requires?: string;
}

/**
 * Inline action help: a small info icon to place right next to an important
 * button, explaining what it does and its consequences without a permanent
 * paragraph on the page.
 */
export function ActionHint({ label, does, warning, requires }: ActionHintProps) {
  const content = (
    <span className="block text-left">
      <span className="block font-semibold text-slate-100 mb-0.5">{label}</span>
      <span className="block">{does}</span>
      {warning && (
        <span className="flex items-start gap-1 mt-1.5 text-amber-300">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{warning}</span>
        </span>
      )}
      {requires && <span className="block mt-1.5 text-slate-300">Needed: {requires}</span>}
    </span>
  );
  return <Tooltip content={content} icon="info" className="ml-1.5" ariaLabel={`About ${label}`} />;
}

export default FieldHint;
