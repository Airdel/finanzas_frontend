import { cn } from '../../lib/cn';
import type { StatementStatus } from '../../lib/types';

const STYLE: Record<StatementStatus, { label: string; className: string }> = {
  OPEN: { label: 'Abierto', className: 'bg-primary/10 text-primary' },
  DUE: { label: 'Por pagar', className: 'bg-warning/15 text-warning' },
  OVERDUE: { label: 'Vencido', className: 'bg-error/15 text-error' },
  PAID: { label: 'Pagado', className: 'bg-secondary/15 text-secondary' },
  EMPTY: { label: 'Sin compras', className: 'bg-ink/5 text-ink/50' },
};

export function StatusBadge({ status }: { status: StatementStatus }) {
  const { label, className } = STYLE[status];
  return <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap', className)}>{label}</span>;
}
