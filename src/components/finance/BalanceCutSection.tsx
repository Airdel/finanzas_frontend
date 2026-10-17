import { useEffect, useState } from 'react';
import { ClipboardCheck, CreditCard, Landmark, PiggyBank } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { SubmitButton } from '../ui/Field';
import { api } from '../../lib/api';
import { notifyError, toast } from '../../lib/dialogs';
import { formatCents, parseCents, shortDay } from '../../lib/format';
import type { BalanceAccount, BalanceCutResult, BalancesOverview } from '../../lib/types';
import { unwrap } from '../../lib/unwrap';
import { useFinanceStore } from '../../store/finance';

const ICON = { CREDIT_CARD: CreditCard, DEBIT: Landmark, SAVINGS: PiggyBank } as const;

/** Corte de saldos: what the bank says each account has, and how far the app is from it. */
export function BalanceCutSection() {
  const overview = useFinanceStore(s => s.overview);
  const [data, setData] = useState<BalancesOverview | null>(null);
  const [cutting, setCutting] = useState(false);

  // Any reload of the store (payments, captures) can move the app balances
  useEffect(() => {
    api.get('/balances').then(res => setData(unwrap<BalancesOverview>(res)), () => setData(null));
  }, [overview]);

  if (!data) return null;
  const off = data.accounts.filter(a => a.last && a.appCents !== null && a.last.date === data.lastDate && a.appCents !== a.last.balanceCents);

  return (
    <section className="space-y-3">
      <h2 className="font-label text-ink/50 text-xs uppercase tracking-wider flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4" /> Corte de saldos
      </h2>
      <div className="glass-panel p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0 text-sm">
          <p className="font-medium">{data.lastDate ? `Último corte: ${shortDay(data.lastDate)}` : 'Aún no haces un corte'}</p>
          <p className="text-xs text-ink/50">
            {data.lastDate
              ? off.length === 0
                ? 'La app cuadra con lo que reportaste, salvo movimientos posteriores.'
                : `${off.length} ${off.length === 1 ? 'cuenta cambió' : 'cuentas cambiaron'} desde entonces.`
              : 'Captura lo que dice cada banco y la app se ajusta.'}
          </p>
        </div>
        <button onClick={() => setCutting(true)} className="px-3 py-2 rounded-lg bg-primary/15 text-primary text-sm font-bold shrink-0">
          Hacer corte
        </button>
      </div>
      {cutting && <BalanceCutModal accounts={data.accounts} today={data.today} onClose={() => setCutting(false)} />}
    </section>
  );
}

function BalanceCutModal({ accounts, today, onClose }: { accounts: BalanceAccount[]; today: string; onClose: () => void }) {
  const load = useFinanceStore(s => s.load);
  const start = (a: BalanceAccount) => ((a.appCents ?? a.last?.balanceCents ?? 0) / 100).toFixed(2);
  const [values, setValues] = useState<Record<number, string>>(() => Object.fromEntries(accounts.map(a => [a.id, start(a)])));
  const [settle, setSettle] = useState<Record<number, boolean>>(() => Object.fromEntries(accounts.map(a => [a.id, true])));
  const [busy, setBusy] = useState(false);
  const cents = (id: number) => parseCents(values[id] ?? '');
  const invalid = accounts.some(a => !(cents(a.id) >= 0));

  const save = async () => {
    setBusy(true);
    try {
      const res = await api.post('/balances', {
        date: today,
        items: accounts.map(a => ({
          accountId: a.id,
          balanceCents: cents(a.id),
          ...(a.kind === 'CREDIT_CARD' && { settleClosed: settle[a.id] }),
        })),
      });
      const { results } = unwrap<BalanceCutResult>(res);
      const adjusted = results.filter(r => r.adjustmentCents !== 0 || r.paidCents > 0).length;
      toast.success(adjusted === 0 ? 'Todo cuadraba, no hubo ajustes' : `${adjusted} ${adjusted === 1 ? 'cuenta ajustada' : 'cuentas ajustadas'}`, `Corte del ${shortDay(today)} guardado`);
      onClose();
      void load();
    } catch (err) {
      notifyError(err, 'No se guardó el corte');
      setBusy(false);
    }
  };

  return (
    <Modal title={`Corte al ${shortDay(today)}`} onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-ink/60">
          Escribe lo que dice cada banco. Tarjetas: deuda sin contar MSI por vencer. La app registra la diferencia como ajuste.
        </p>
        <ul className="space-y-3">
          {accounts.map(a => {
            const Icon = ICON[a.kind];
            const diff = a.appCents === null ? null : cents(a.id) - a.appCents;
            return (
              <li key={a.id} className="space-y-1">
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-ink/40 shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-sm font-medium">{a.name}</span>
                  <input
                    inputMode="decimal"
                    aria-label={`Saldo de ${a.name}`}
                    value={values[a.id]}
                    onChange={e => setValues(v => ({ ...v, [a.id]: e.target.value }))}
                    className="w-32 bg-ink/5 border border-ink/10 rounded-xl py-2 px-3 text-right font-mono text-ink focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="pl-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/50">
                  {a.appCents === null ? (
                    <span>La app no lleva su saldo{a.last ? ` · último ${formatCents(a.last.balanceCents)}` : ''}</span>
                  ) : (
                    <span>
                      En la app {formatCents(a.appCents)}
                      {diff !== null && diff !== 0 && Number.isFinite(diff) && ` · ajuste ${diff > 0 ? '+' : '−'}${formatCents(Math.abs(diff))}`}
                    </span>
                  )}
                  {a.kind === 'CREDIT_CARD' && (
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={settle[a.id]} onChange={e => setSettle(s => ({ ...s, [a.id]: e.target.checked }))} />
                      Cortes anteriores ya pagados
                    </label>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <SubmitButton onClick={save} disabled={invalid} busy={busy}>Guardar corte</SubmitButton>
      </div>
    </Modal>
  );
}
