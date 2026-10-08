import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Loader2, Plus, Scale, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Field, Segmented, SelectField, SubmitButton } from '../ui/Field';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import { confirm, notifyError, toast } from '../../lib/dialogs';
import { formatCents, parseCents, shortDay } from '../../lib/format';
import type { CardSummary, MsiPlan, PrepayAnalysis } from '../../lib/types';
import { unwrap } from '../../lib/unwrap';
import { useFinanceStore } from '../../store/finance';

/** MSI plans: progress, what is left and the "liquidate early?" comparison. */
export function MsiView() {
  const { msi, overview, load } = useFinanceStore();
  const [adding, setAdding] = useState(false);
  const [analyzing, setAnalyzing] = useState<MsiPlan | null>(null);
  const active = (msi ?? []).filter(p => !p.finished);
  const finished = (msi ?? []).filter(p => p.finished);
  const remaining = active.reduce((s, p) => s + p.remainingCents, 0);
  const monthly = active.reduce((s, p) => s + (p.next?.amountCents ?? 0), 0);

  const remove = async (plan: MsiPlan) => {
    const ok = await confirm({
      title: 'Borrar plan MSI',
      message: `${plan.description}: se quitan sus cuotas de los cortes y la compra de los movimientos.`,
      confirmLabel: 'Borrar',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/msi/${plan.id}`);
      void load();
    } catch (err) {
      notifyError(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-ink/50">Por cobrar en MSI</p>
          <p className="font-mono font-bold text-lg">{formatCents(remaining)}</p>
        </div>
        <div>
          <p className="text-xs text-ink/50">Siguientes cuotas</p>
          <p className="font-mono font-bold text-lg">{formatCents(monthly)}</p>
        </div>
        <p className="col-span-2 text-xs text-ink/50">Las cuotas ya van dentro del pago de cada tarjeta; la compra completa no se suma al corte.</p>
      </div>

      {msi && msi.length === 0 && (
        <p className="glass-panel p-4 text-sm text-ink/60">
          Aún no hay MSI. Si tu Tab S10+ sigue a meses, agrégala como <b>ya en curso</b> con su cuota real y el corte donde cae la que falta.
        </p>
      )}

      {active.map(plan => <PlanCard key={plan.id} plan={plan} onAnalyze={() => setAnalyzing(plan)} onRemove={() => remove(plan)} />)}

      <button onClick={() => setAdding(true)} className="w-full glass-panel p-3 flex items-center justify-center gap-2 text-primary font-bold">
        <Plus className="w-4 h-4" /> Agregar MSI
      </button>

      {finished.length > 0 && (
        <div className="space-y-2">
          <p className="font-label text-ink/40 text-xs uppercase tracking-wider">Terminados</p>
          {finished.map(plan => <PlanCard key={plan.id} plan={plan} onRemove={() => remove(plan)} />)}
        </div>
      )}

      {adding && overview && <MsiForm cards={overview.cards} today={overview.today} onClose={() => setAdding(false)} />}
      {analyzing && <PrepayModal plan={analyzing} onClose={() => setAnalyzing(null)} />}
    </div>
  );
}

function PlanCard({ plan, onAnalyze, onRemove }: { plan: MsiPlan; onAnalyze?: () => void; onRemove: () => void }) {
  const pct = Math.round((plan.billedCount / plan.months) * 100);
  return (
    <div className={cn('glass-panel p-4 space-y-3', plan.finished && 'opacity-60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-headline font-bold truncate">{plan.description}</p>
          <p className="text-xs text-ink/50">
            {plan.accountName} · {formatCents(plan.totalCents)} a {plan.months} meses · {formatCents(plan.monthlyCents)}/mes
          </p>
        </div>
        <button onClick={onRemove} className="p-1.5 text-ink/30 hover:text-error shrink-0" aria-label="Borrar">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div>
        <div className="flex justify-between text-xs text-ink/60 mb-1">
          <span>{plan.billedCount} de {plan.months} cuotas cobradas</span>
          <span className="font-mono">Faltan {formatCents(plan.remainingCents)}</span>
        </div>
        <div className="h-2 rounded-full bg-ink/10 overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {plan.next && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2 text-ink/70">
            <CalendarRange className="w-4 h-4" />
            {plan.next.settlement
              ? `Liquidación en el corte del ${shortDay(plan.next.cutDate)}`
              : `Cuota ${plan.next.number} en el corte del ${shortDay(plan.next.cutDate)}`}
          </span>
          <span className="font-mono font-bold">{formatCents(plan.next.amountCents)}</span>
        </div>
      )}
      {onAnalyze && (
        <button onClick={onAnalyze} className="w-full py-2 rounded-lg bg-accent/10 text-accent text-sm font-bold flex items-center justify-center gap-2">
          <Scale className="w-4 h-4" /> {plan.settledCutDate ? 'Liquidado · ver o deshacer' : '¿Liquidar antes?'}
        </button>
      )}
    </div>
  );
}

/** Cut dates of a card around today: last closed, open and the next two. */
function cutOptions(card: CardSummary): string[] {
  const [open, closed] = card.statements;
  const next = (cut: string, n: number) => {
    const [y, m] = cut.split('-').map(Number);
    const index = y * 12 + (m - 1) + n;
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(card.cutDay, last)).padStart(2, '0')}`;
  };
  return [closed?.cutDate, open.cutDate, next(open.cutDate, 1), next(open.cutDate, 2)].filter((c): c is string => Boolean(c));
}

function MsiForm({ cards, today, onClose }: { cards: CardSummary[]; today: string; onClose: () => void }) {
  const load = useFinanceStore(s => s.load);
  const [mode, setMode] = useState<'nuevo' | 'curso'>('nuevo');
  const [cardId, setCardId] = useState(String(cards[0]?.id ?? ''));
  const [description, setDescription] = useState('');
  const [months, setMonths] = useState('12');
  const [total, setTotal] = useState('');
  const [monthly, setMonthly] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(today);
  const card = cards.find(c => String(c.id) === cardId);
  const cuts = useMemo(() => (card ? cutOptions(card) : []), [card]);
  const [pickedCut, setNextCut] = useState('');
  const [remaining, setRemaining] = useState('1');
  const [saving, setSaving] = useState(false);
  // Defaults to the open statement; changing the card resets it
  const nextCut = cuts.includes(pickedCut) ? pickedCut : (card?.statements[0].cutDate ?? '');

  const n = Number(months);
  // A running plan is usually known by its installment, not its total
  const totalCents = mode === 'curso' ? parseCents(monthly) * n : parseCents(total);
  const left = Number(remaining);
  const valid =
    card && description.trim() && n >= 2 && n <= 48 && totalCents > 0 && (mode === 'nuevo' || (nextCut && left >= 1 && left <= n));

  const save = async () => {
    if (!valid || !card) return;
    setSaving(true);
    try {
      const body =
        mode === 'nuevo'
          ? { accountId: card.id, description: description.trim(), totalCents, months: n, purchaseDate }
          : { accountId: card.id, description: description.trim(), totalCents, months: n, nextCutDate: nextCut, remainingInstallments: left };
      const plan = unwrap<MsiPlan>(await api.post('/msi', body));
      toast.success(
        plan.next ? `Siguiente cuota: ${formatCents(plan.next.amountCents)} en el corte del ${shortDay(plan.next.cutDate)}` : 'Plan registrado',
        `${plan.description} a ${plan.months} MSI`,
      );
      onClose();
      void load();
    } catch (err) {
      notifyError(err, 'No se guardó el plan');
      setSaving(false);
    }
  };

  return (
    <Modal title="Agregar MSI" onClose={onClose}>
      <div className="space-y-4">
        <Segmented value={mode} onChange={setMode} options={[{ value: 'nuevo', label: 'Compra nueva' }, { value: 'curso', label: 'Ya en curso' }]} />
        <SelectField label="Tarjeta" value={cardId} onChange={setCardId} options={cards.map(c => ({ value: String(c.id), label: c.name }))} />
        <Field label="Qué compraste" value={description} onChange={e => setDescription(e.target.value)} placeholder="Tab S10+" maxLength={120} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Meses" inputMode="numeric" value={months} onChange={e => setMonths(e.target.value.replace(/\D/g, ''))} />
          {mode === 'nuevo' ? (
            <Field label="Total" inputMode="decimal" value={total} onChange={e => setTotal(e.target.value)} placeholder="0.00" />
          ) : (
            <Field label="Cuota mensual" inputMode="decimal" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="1150.00" />
          )}
        </div>
        {mode === 'nuevo' ? (
          <Field label="Fecha de compra" type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} hint="La primera cuota cae en el corte de esa compra." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Corte de la próxima cuota" value={nextCut} onChange={setNextCut} options={cuts.map(c => ({ value: c, label: shortDay(c) }))} />
            <Field label="Cuotas que faltan" inputMode="numeric" value={remaining} onChange={e => setRemaining(e.target.value.replace(/\D/g, ''))} hint="Contando esa." />
          </div>
        )}
        {totalCents > 0 && n >= 2 && (
          <p className="text-sm text-ink/60">
            {mode === 'curso'
              ? `Total ${formatCents(totalCents)}; la app cobra desde el corte del ${nextCut ? shortDay(nextCut) : '…'} (${formatCents(parseCents(monthly) * (left || 0))}).`
              : `${n} cuotas de ${formatCents(Math.floor(totalCents / n))}.`}
          </p>
        )}
        <SubmitButton onClick={save} disabled={!valid} busy={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar plan
        </SubmitButton>
      </div>
    </Modal>
  );
}

/** Liquidate now vs keep paying 0 %: the decision stays with Darien. */
function PrepayModal({ plan, onClose }: { plan: MsiPlan; onClose: () => void }) {
  const load = useFinanceStore(s => s.load);
  const [rate, setRate] = useState('10');
  const [inflation, setInflation] = useState('4');
  const [result, setResult] = useState<PrepayAnalysis | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const r = Number(rate);
    const i = Number(inflation);
    if (!Number.isFinite(r) || !Number.isFinite(i) || rate === '' || inflation === '') return;
    const id = setTimeout(() => {
      api
        .get(`/msi/${plan.id}/prepay`, { params: { annualRatePct: r, inflationPct: i } })
        .then(res => setResult(unwrap<PrepayAnalysis>(res)))
        .catch(err => notifyError(err));
    }, 250);
    return () => clearTimeout(id);
  }, [plan.id, rate, inflation]);

  const settle = async () => {
    if (!result) return;
    setBusy(true);
    try {
      await api.post(`/msi/${plan.id}/settle`, { cutDate: result.openCutDate });
      toast.success(`El resto (${formatCents(result.remainingCents)}) entra al corte del ${shortDay(result.openCutDate)}`, 'Plan liquidado');
      onClose();
      void load();
    } catch (err) {
      notifyError(err);
      setBusy(false);
    }
  };

  const unsettle = async () => {
    setBusy(true);
    try {
      await api.delete(`/msi/${plan.id}/settle`);
      onClose();
      void load();
    } catch (err) {
      notifyError(err);
      setBusy(false);
    }
  };

  return (
    <Modal title={`¿Liquidar ${plan.description}?`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rendimiento anual %" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} hint="Donde esperaría el dinero." />
          <Field label="Inflación anual %" inputMode="decimal" value={inflation} onChange={e => setInflation(e.target.value)} />
        </div>
        {!result ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : (
          <>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-ink/5">
                <Row label={`Liquidar hoy (${result.pendingInstallments} ${result.pendingInstallments === 1 ? 'cuota' : 'cuotas'})`} value={formatCents(result.remainingCents)} />
                <Row label={`Ganas si no liquidas · nominal ${result.annualRatePct}%`} value={formatCents(result.nominalGainCents)} />
                <Row label={`Ganas si no liquidas · real ${result.realRatePct}%`} value={formatCents(result.realGainCents)} />
                <Row label="Lo que la deuda pierde por inflación" value={formatCents(result.inflationErosionCents)} />
              </tbody>
            </table>
            <p className="text-xs text-ink/60">
              Al 0 % de interés, pagar a meses nunca cuesta más que liquidar: mientras el dinero rinda algo, esperar gana {formatCents(result.nominalGainCents)}.
              Liquidar solo compra tranquilidad o libera línea de crédito. La decisión es tuya.
            </p>
          </>
        )}
        {plan.settledCutDate ? (
          <SubmitButton onClick={unsettle} busy={busy}>Volver a pagar a meses</SubmitButton>
        ) : (
          result && result.pendingInstallments > 0 && (
            <SubmitButton onClick={settle} busy={busy}>
              Liquidar {formatCents(result.remainingCents)} en el corte del {shortDay(result.openCutDate)}
            </SubmitButton>
          )
        )}
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-2 text-ink/70">{label}</td>
      <td className="py-2 text-right font-mono font-bold whitespace-nowrap">{value}</td>
    </tr>
  );
}
