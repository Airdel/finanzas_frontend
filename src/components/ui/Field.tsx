import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

const inputClass =
  'w-full bg-ink/5 border border-ink/10 rounded-xl py-2.5 px-3 text-ink focus:outline-none focus:border-primary/50';

/** Labeled input in the app's style. */
export function Field({ label, hint, className, ...props }: { label: string; hint?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn('block', className)}>
      <span className="block text-ink/60 text-xs font-label uppercase tracking-wider mb-1.5">{label}</span>
      <input {...props} className={inputClass} />
      {hint && <span className="block text-xs text-ink/50 mt-1">{hint}</span>}
    </label>
  );
}

/** Labeled select with the same look as Field. */
export function SelectField({ label, value, onChange, options, className }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="block text-ink/60 text-xs font-label uppercase tracking-wider mb-1.5">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className={inputClass}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** Two or three mutually exclusive options. */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex p-1 rounded-xl bg-ink/5 gap-1">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn('flex-1 py-2 rounded-lg text-sm font-bold transition-colors', value === o.value ? 'bg-raised text-primary shadow-sm' : 'text-ink/50')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Primary action button of a modal. */
export function SubmitButton({ children, disabled, onClick, busy }: { children: ReactNode; disabled?: boolean; onClick: () => void; busy?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className="w-full py-3.5 rounded-xl bg-cta text-on-primary font-bold glow-primary disabled:opacity-40 flex items-center justify-center gap-2"
    >
      {children}
    </button>
  );
}
