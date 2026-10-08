import { useEffect, useMemo, useState } from 'react';
import { Delete, Loader2, Star } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import { notifyError, toast } from '../../lib/dialogs';
import { daysBetween, formatCents, parseCents, relativeDays, shortDay } from '../../lib/format';
import type { CreatedTransaction } from '../../lib/types';
import { unwrap } from '../../lib/unwrap';
import { useFinanceStore } from '../../store/finance';

const CATEGORIES = ['Comida', 'Súper', 'Transporte', 'Gasolina', 'Servicios', 'Salud', 'Ocio', 'Ropa', 'Casa', 'Otro'];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const;

/**
 * Three taps: open (+), pick the account, save. The amount is typed on the
 * keypad (or a physical keyboard); category, note and date are optional.
 */
export function QuickCapture({ onClose }: { onClose: () => void }) {
  const { accounts, overview, load } = useFinanceStore();
  const today = overview?.today ?? new Date().toLocaleDateString('en-CA');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [isIncome, setIsIncome] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today);
  const [pickDate, setPickDate] = useState(false);
  const [saving, setSaving] = useState(false);

  const cents = parseCents(amount);
  const canSave = accountId !== null && cents > 0 && !saving;

  const cardInfo = useMemo(() => new Map(overview?.cards.map(c => [c.id, c]) ?? []), [overview]);
  const choices = (accounts ?? []).filter(a => a.kind !== 'SAVINGS');

  const press = (key: (typeof KEYS)[number]) => {
    setAmount(prev => {
      if (key === 'back') return prev.slice(0, -1);
      const next = prev === '0' && key !== '.' ? key : prev + key;
      return /^\d{0,7}(\.\d{0,2})?$/.test(next) ? next : prev;
    });
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await api.post('/transactions', {
        accountId,
        amountCents: isIncome ? cents : -cents,
        date,
        category: category ?? undefined,
        description: description.trim() || undefined,
      });
      const created = unwrap<CreatedTransaction>(res);
      const where = created.statement
        ? `Entra al corte del ${shortDay(created.statement.cutDate)} · pagas ${relativeDays(daysBetween(today, created.statement.paymentDate))}`
        : created.account?.name ?? '';
      toast.success(where, `${formatCents(Math.abs(created.amountCents))} guardado`);
      onClose();
      void load();
    } catch (err) {
      notifyError(err, 'No se guardó');
      setSaving(false);
    }
  };

  // Physical keyboard (tablet with keyboard, desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (/^[0-9.]$/.test(e.key)) press(e.key as (typeof KEYS)[number]);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') void save();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const yesterday = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  }, [today]);

  return (
    <Modal title={isIncome ? 'Nuevo ingreso' : 'Nuevo gasto'} onClose={onClose}>
      <div className="space-y-4">
        {/* Account */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
          {choices.map(a => {
            const card = cardInfo.get(a.id);
            const selected = accountId === a.id;
            const best = overview?.bestCardId === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAccountId(a.id)}
                className={cn(
                  'shrink-0 px-3 py-2 rounded-xl border text-left transition-all active:scale-95',
                  selected ? 'bg-primary text-on-primary border-primary glow-primary-soft' : 'bg-ink/5 border-ink/10 text-ink',
                )}
              >
                <span className="flex items-center gap-1 text-sm font-bold whitespace-nowrap">
                  {best && <Star className="w-3.5 h-3.5 fill-current" />} {a.name}
                </span>
                {card && date === today && (
                  <span className={cn('block text-[11px]', selected ? 'opacity-80' : 'text-ink/50')}>
                    pagas en {card.purchaseToday.daysToPay} d
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex rounded-full bg-ink/5 p-1 text-xs font-bold">
            {[false, true].map(income => (
              <button
                key={String(income)}
                onClick={() => setIsIncome(income)}
                className={cn('px-3 py-1 rounded-full', isIncome === income ? (income ? 'bg-secondary text-on-secondary' : 'bg-error text-canvas') : 'text-ink/50')}
              >
                {income ? 'Ingreso' : 'Gasto'}
              </button>
            ))}
          </div>
          <p className={cn('font-headline text-4xl font-bold font-mono truncate', !amount && 'text-ink/30', isIncome ? 'text-secondary' : 'text-ink')}>
            ${amount || '0'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map(key => (
            <button
              key={key}
              onClick={() => press(key)}
              className="h-12 rounded-xl bg-ink/5 hover:bg-ink/10 active:scale-95 transition-transform font-headline text-xl font-bold flex items-center justify-center"
              aria-label={key === 'back' ? 'Borrar' : key}
            >
              {key === 'back' ? <Delete className="w-5 h-5" /> : key}
            </button>
          ))}
        </div>

        {/* Optional details */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? null : c)}
              className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border', category === c ? 'bg-accent text-canvas border-accent' : 'border-ink/10 text-ink/60')}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={120}
            placeholder="Descripción (opcional)"
            className="flex-1 min-w-0 bg-ink/5 border border-ink/10 rounded-xl py-2 px-3 text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-primary/50"
          />
          {pickDate ? (
            <input
              type="date"
              value={date}
              max={today}
              onChange={e => e.target.value && setDate(e.target.value)}
              className="bg-ink/5 border border-ink/10 rounded-xl px-2 text-sm text-ink"
              aria-label="Fecha"
            />
          ) : (
            <select
              value={date === today ? 'today' : 'yesterday'}
              onChange={e => {
                if (e.target.value === 'today') setDate(today);
                else if (e.target.value === 'yesterday') setDate(yesterday);
                else setPickDate(true);
              }}
              className="bg-ink/5 border border-ink/10 rounded-xl px-2 text-sm text-ink"
              aria-label="Fecha"
            >
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="other">Otra…</option>
            </select>
          )}
        </div>

        <button
          onClick={save}
          disabled={!canSave}
          className="w-full py-3.5 rounded-xl bg-cta text-on-primary font-bold glow-primary-soft disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {accountId === null ? 'Elige la cuenta' : !(cents > 0) ? 'Escribe el monto' : `Guardar ${formatCents(cents)}`}
        </button>
      </div>
    </Modal>
  );
}
