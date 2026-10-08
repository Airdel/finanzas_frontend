import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { StatusBadge } from './StatusBadge';
import { PayModal, type PayTarget } from './PayModal';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import { confirm, notifyError } from '../../lib/dialogs';
import { formatCents, shortDay } from '../../lib/format';
import type { CardSummary, StatementDetail } from '../../lib/types';
import { unwrap } from '../../lib/unwrap';
import { useFinanceStore } from '../../store/finance';

/** A card's statements (open and recent) with their movements and the cut-day rule. */
export function CardModal({ card, onClose }: { card: CardSummary; onClose: () => void }) {
  const load = useFinanceStore(s => s.load);
  const [index, setIndex] = useState(0);
  const [detail, setDetail] = useState<StatementDetail | null>(null);
  const [paying, setPaying] = useState<PayTarget | null>(null);
  const [cutDayNext, setCutDayNext] = useState(card.cutDayPurchasesNext);
  const cutDate = card.statements[index].cutDate;

  const fetchDetail = useCallback(() => {
    api
      .get(`/cards/${card.id}/statements/${cutDate}`)
      .then(res => setDetail(unwrap<StatementDetail>(res)))
      .catch(err => notifyError(err, 'No se cargó el estado de cuenta'));
  }, [card.id, cutDate]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const remove = async (id: number, description: string) => {
    const ok = await confirm({ title: 'Borrar movimiento', message: description, confirmLabel: 'Borrar', tone: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchDetail();
      void load();
    } catch (err) {
      notifyError(err);
    }
  };

  const toggleRule = async () => {
    const next = !cutDayNext;
    setCutDayNext(next);
    try {
      await api.patch(`/accounts/${card.id}`, { cutDayPurchasesNext: next });
      await load();
      fetchDetail();
    } catch (err) {
      setCutDayNext(!next);
      notifyError(err);
    }
  };

  const s = detail?.cutDate === cutDate ? detail : null;

  return (
    <>
      <Modal title={card.name} onClose={onClose}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setIndex(i => Math.min(i + 1, card.statements.length - 1))}
              disabled={index === card.statements.length - 1}
              className="p-2 rounded-full bg-ink/5 disabled:opacity-30"
              aria-label="Corte anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <p className="font-headline font-bold">Corte {shortDay(cutDate)}</p>
              {s && <p className="text-xs text-ink/50">Compras del {shortDay(s.periodStart)} al {shortDay(s.periodEnd)}</p>}
            </div>
            <button
              onClick={() => setIndex(i => Math.max(i - 1, 0))}
              disabled={index === 0}
              className="p-2 rounded-full bg-ink/5 disabled:opacity-30"
              aria-label="Corte siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!s ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="glass-panel p-4 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink/60">Compras ({s.chargeCount})</span>
                  <span className="font-mono">{formatCents(s.chargesCents)}</span>
                </div>
                {s.creditsCents > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-ink/60">Devoluciones</span>
                    <span className="font-mono">−{formatCents(s.creditsCents)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-ink/60">Pagado</span>
                  <span className="font-mono">{s.paymentsCents > 0 && '−'}{formatCents(s.paymentsCents)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-ink/10">
                  <span className="font-bold flex items-center gap-2">Pendiente <StatusBadge status={s.status} /></span>
                  <span className="font-mono font-bold text-lg">{formatCents(s.remainingCents)}</span>
                </div>
                <p className="text-xs text-ink/50">Fecha de pago: {shortDay(s.paymentDate)}</p>
              </div>

              {s.remainingCents > 0 && (
                <button
                  onClick={() => setPaying({ accountId: card.id, accountName: card.name, cutDate, remainingCents: s.remainingCents })}
                  className="w-full py-3 rounded-xl bg-cta-alt text-on-secondary font-bold glow-secondary"
                >
                  Marcar pagado
                </button>
              )}

              <ul className="divide-y divide-ink/5">
                {s.transactions.length === 0 && <li className="py-4 text-center text-sm text-ink/40">Sin movimientos en este corte</li>}
                {s.transactions.map(t => (
                  <li key={t.id} className="py-2 flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{t.paysCutDate ? 'Pago a tarjeta' : t.description}</p>
                      <p className="text-xs text-ink/40">{shortDay(t.date)}{t.category && !t.paysCutDate ? ` · ${t.category}` : ''}</p>
                    </div>
                    <span className={cn('font-mono', t.amountCents > 0 && 'text-secondary')}>
                      {t.amountCents > 0 ? '+' : '−'}{formatCents(Math.abs(t.amountCents))}
                    </span>
                    <button onClick={() => remove(t.id, t.description)} className="p-1.5 text-ink/30 hover:text-error" aria-label="Borrar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <label className="flex items-start gap-3 text-sm pt-2 border-t border-ink/10 cursor-pointer">
            <input type="checkbox" checked={cutDayNext} onChange={toggleRule} className="mt-1 accent-[rgb(var(--c-primary))]" />
            <span>
              Compras del día de corte ({card.cutDay}) entran al siguiente corte
              <span className="block text-xs text-ink/50">Desmárcalo si este banco las incluye en el corte de ese día.</span>
            </span>
          </label>
        </div>
      </Modal>
      {paying && <PayModal target={paying} onClose={() => setPaying(null)} onPaid={fetchDetail} />}
    </>
  );
}
