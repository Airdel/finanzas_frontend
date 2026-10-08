import { useState } from 'react';
import { Check, ChevronDown, GraduationCap, Send, Loader2, PiggyBank, Plus, Receipt, Settings2, Trash2, Wallet } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Field, Segmented, SubmitButton } from '../ui/Field';
import { StatusBadge } from './StatusBadge';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import { confirm, notifyError, toast } from '../../lib/dialogs';
import { formatCents, parseCents, shortDay } from '../../lib/format';
import type { BudgetSettings, PayPeriod, SavingsMode } from '../../lib/types';
import { useFinanceStore } from '../../store/finance';

/** Quincena by quincena: what comes in, what each payroll pays and what is left. */
export function QuincenasView() {
  const { periods, savings, fixed, load } = useFinanceStore();
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<PayPeriod | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dispersing, setDispersing] = useState<PayPeriod | null>(null);

  if (!periods) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  const { settings, today } = periods;
  const expanded = openDate ?? periods.periods[0]?.payDate;

  const addTutoring = async () => {
    setBusy(true);
    try {
      await api.post('/tutorias', {});
      toast.success(`${formatCents(settings.tutoringWeeklyCents)} a OpenBank`, 'Tutoría registrada');
      await load();
    } catch (err) {
      notifyError(err, 'No se registró la tutoría');
    } finally {
      setBusy(false);
    }
  };

  const removeSaving = async (id: number, label: string) => {
    const ok = await confirm({ title: 'Deshacer ahorro', message: label, confirmLabel: 'Deshacer', tone: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/savings/${id}`);
      void load();
    } catch (err) {
      notifyError(err);
    }
  };

  const removeFixed = async (id: number, name: string) => {
    const ok = await confirm({ title: 'Borrar gasto fijo', message: name, confirmLabel: 'Borrar', tone: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/fixed-expenses/${id}`);
      void load();
    } catch (err) {
      notifyError(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Side by side: the 15 vs the 30 */}
      <section className="glass-panel p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-label text-ink/50 text-xs uppercase tracking-wider">Disponible por quincena</p>
          <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-1 text-xs font-bold text-primary">
            <Settings2 className="w-4 h-4" /> Ajustes
          </button>
        </div>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[22rem]">
            <thead>
              <tr className="text-ink/40 text-xs">
                <th className="text-left font-normal px-1 py-1">Nómina</th>
                <th className="text-right font-normal px-1">Ingreso</th>
                <th className="text-right font-normal px-1">Tarjetas</th>
                <th className="text-right font-normal px-1">Ahorro + fijos</th>
                <th className="text-right font-normal px-1">Libre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {periods.periods.map(p => (
                <tr key={p.payDate} onClick={() => setOpenDate(p.payDate)} className="cursor-pointer">
                  <td className="px-1 py-2 font-medium whitespace-nowrap">
                    {shortDay(p.payDate)}
                    <span className="block text-[11px] text-ink/40">{plural(p.cards.filter(c => c.statementCents > 0).length, 'tarjeta')}</span>
                  </td>
                  <td className="px-1 text-right font-mono">{formatCents(p.incomeCents)}</td>
                  <td className="px-1 text-right font-mono">
                    {formatCents(p.cardsCents)}
                    {p.msiCents > 0 && <span className="block text-[11px] text-ink/40">MSI {formatCents(p.msiCents)}</span>}
                  </td>
                  <td className="px-1 text-right font-mono">{formatCents(p.savingsCents + p.fixedCents)}</td>
                  <td className={cn('px-1 text-right font-mono font-bold', p.availableCents < 0 ? 'text-error' : 'text-secondary')}>
                    {formatCents(p.availableCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink/50">
          La nómina del 30 paga Gold, LikeU, DiDi y Mercado Pago; la del 15 solo Nu. Los cortes abiertos siguen sumando lo que captures.
        </p>
      </section>

      <section className="space-y-3">
        {periods.periods.map(p => (
          <PeriodCard
            key={p.payDate}
            period={p}
            today={today}
            expanded={expanded === p.payDate}
            onToggle={() => setOpenDate(expanded === p.payDate ? '' : p.payDate)}
            onEdit={() => setEditing(p)}
            onDisperse={() => setDispersing(p)}
          />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-label text-ink/50 text-xs uppercase tracking-wider flex items-center gap-2"><PiggyBank className="w-4 h-4" /> Ahorro</h2>
        <div className="grid grid-cols-3 gap-2">
          {(savings?.accounts ?? []).map(a => (
            <div key={a.id} className="glass-panel p-3">
              <p className="text-[11px] text-ink/50 truncate">{a.name}</p>
              <p className="font-mono font-bold">{formatCents(a.totalCents)}</p>
            </div>
          ))}
        </div>
        <button
          onClick={addTutoring}
          disabled={busy}
          className="w-full glass-panel p-3 flex items-center justify-center gap-2 text-secondary font-bold disabled:opacity-50"
        >
          <GraduationCap className="w-4 h-4" /> Tutoría {formatCents(settings.tutoringWeeklyCents)} → OpenBank
        </button>
        <p className="text-xs text-ink/50">Las tutorías entran y salen íntegras a OpenBank: no cambian tu disponible.</p>
        {savings && savings.recent.length > 0 && (
          <div className="glass-panel divide-y divide-ink/5">
            {savings.recent.slice(0, 10).map(m => {
              const label = m.flow === 'TUTORIA' ? 'Tutoría' : `Ahorro nómina ${m.payPeriod ? shortDay(m.payPeriod.payDate) : ''}`;
              return (
                <div key={m.id} className="px-4 py-2 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{label}</p>
                    <p className="text-xs text-ink/40">{shortDay(m.date)} · {m.toAccount.name}</p>
                  </div>
                  <span className="font-mono text-secondary">+{formatCents(m.amountCents)}</span>
                  <button onClick={() => removeSaving(m.id, `${label} · ${formatCents(m.amountCents)}`)} className="p-1.5 text-ink/30 hover:text-error" aria-label="Deshacer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-label text-ink/50 text-xs uppercase tracking-wider flex items-center gap-2"><Receipt className="w-4 h-4" /> Fijos pagados desde cuenta</h2>
        <div className="glass-panel divide-y divide-ink/5">
          {(fixed ?? []).length === 0 && <p className="p-4 text-sm text-ink/40 text-center">Sin fijos. Lo que pagas con tarjeta ya cuenta en su corte.</p>}
          {(fixed ?? []).map(f => (
            <div key={f.id} className="px-4 py-2 flex items-center gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <p className="truncate">{f.name}</p>
                <p className="text-xs text-ink/40">Día {f.dayOfMonth}{f.account ? ` · ${f.account.name}` : ''}</p>
              </div>
              <span className="font-mono">{formatCents(f.amountCents)}</span>
              <button onClick={() => removeFixed(f.id, f.name)} className="p-1.5 text-ink/30 hover:text-error" aria-label="Borrar">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <FixedForm />
        </div>
      </section>

      {editing && <PeriodModal period={editing} onClose={() => setEditing(null)} />}
      {dispersing && <DisperseModal period={dispersing} today={today} onClose={() => setDispersing(null)} />}
      {settingsOpen && <SettingsModal settings={settings} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function PeriodCard({ period: p, today, expanded, onToggle, onEdit, onDisperse }: {
  period: PayPeriod;
  today: string;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDisperse: () => void;
}) {
  const current = p.payDate <= today && today < p.endDate;
  const toSave = Math.max(0, p.savingsCents - p.savedCents);
  const dispersed = p.cardsPendingCents === 0 && toSave === 0;
  return (
    <div className={cn('glass-panel', current && 'border-primary/40')}>
      <button onClick={onToggle} className="w-full p-4 flex items-center justify-between gap-3 text-left">
        <div>
          <p className="font-headline font-bold flex items-center gap-2">
            Nómina del {shortDay(p.payDate)}
            {current && <span className="px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary">Actual</span>}
            {p.payDate <= today && dispersed && <span className="px-2 py-0.5 rounded-full text-[11px] bg-secondary/15 text-secondary">Dispersada</span>}
          </p>
          <p className="text-xs text-ink/50">Cubre pagos del {shortDay(p.payDate)} al {shortDay(addDays(p.endDate, -1))}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('font-mono font-bold', p.availableCents < 0 ? 'text-error' : 'text-secondary')}>{formatCents(p.availableCents)}</span>
          <ChevronDown className={cn('w-4 h-4 text-ink/40 transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 text-sm">
          <Line label={p.incomeConfirmed ? 'Nómina' : 'Nómina (estimada, de Ajustes)'} value={formatCents(p.incomeCents)} onEdit={onEdit} />
          <div className="space-y-1">
            {p.cards.length === 0 && <Line label="Sin pagos de tarjeta" value={formatCents(0)} minus />}
            {p.cards.map(c => (
              <div key={`${c.accountId}-${c.cutDate}`} className="flex items-center justify-between gap-2">
                <span className="text-ink/70 min-w-0 truncate flex items-center gap-2">
                  {c.accountName} · paga {shortDay(c.paymentDate)}
                  {c.status !== 'OPEN' && c.status !== 'EMPTY' && <StatusBadge status={c.status} />}
                  {c.status === 'OPEN' && c.paymentsCents > 0 && (
                    <span className="text-[11px] text-secondary font-bold">{c.remainingCents === 0 ? 'pagada' : `pagado ${formatCents(c.paymentsCents)}`}</span>
                  )}
                </span>
                <span className="font-mono whitespace-nowrap">
                  −{formatCents(c.statementCents)}
                  {c.msiCents > 0 && <span className="block text-[11px] text-ink/40 text-right">MSI {formatCents(c.msiCents)}</span>}
                </span>
              </div>
            ))}
          </div>
          <Line label={p.savingsManual ? 'Ahorro (fijado a mano)' : 'Ahorro planeado'} value={`−${formatCents(p.savingsCents)}`} onEdit={onEdit} />
          {p.fixed.map(f => <Line key={`${f.id}-${f.date}`} label={`${f.name} · ${shortDay(f.date)}`} value={`−${formatCents(f.amountCents)}`} />)}
          <div className="flex items-center justify-between pt-2 border-t border-ink/10 font-bold">
            <span className="flex items-center gap-2"><Wallet className="w-4 h-4" /> Disponible</span>
            <span className={cn('font-mono text-lg', p.availableCents < 0 && 'text-error')}>{formatCents(p.availableCents)}</span>
          </div>
          {p.tutoringCount > 0 && (
            <p className="text-xs text-ink/50">Tutorías: {p.tutoringCount} · {formatCents(p.tutoringCents)} directo a OpenBank (no suman al disponible).</p>
          )}
          {p.cardsPendingCents !== p.cardsCents && (
            <p className="text-xs text-ink/50">Ya pagaste {formatCents(p.cardsCents - p.cardsPendingCents)} de tarjetas de esta quincena.</p>
          )}
          {p.savedCents > 0 && <p className="text-xs text-secondary">Ahorro apartado: {formatCents(p.savedCents)}</p>}
          {p.payDate <= today && !dispersed && (
            <button onClick={onDisperse} className="w-full py-2.5 rounded-lg bg-secondary/15 text-secondary font-bold flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> Dispersar quincena · {formatCents(p.cardsPendingCents + toSave)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function Line({ label, value, onEdit, minus }: { label: string; value: string; onEdit?: () => void; minus?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      {onEdit ? (
        <button onClick={onEdit} className="text-ink/70 underline decoration-dotted underline-offset-4 text-left">{label}</button>
      ) : (
        <span className="text-ink/70">{label}</span>
      )}
      <span className="font-mono">{minus ? '−' : ''}{value}</span>
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const centsText = (cents: number) => (cents / 100).toFixed(2);

/** This quincena's real payroll and, optionally, a hand-set savings amount. */
function PeriodModal({ period, onClose }: { period: PayPeriod; onClose: () => void }) {
  const load = useFinanceStore(s => s.load);
  const [income, setIncome] = useState(centsText(period.incomeCents));
  const [manual, setManual] = useState(period.savingsManual);
  const [saving, setSaving] = useState(centsText(period.savingsCents));
  const [busy, setBusy] = useState(false);
  const incomeCents = parseCents(income);
  const savingCents = parseCents(saving);
  const valid = incomeCents >= 0 && (!manual || savingCents >= 0);

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/pay-periods/${period.payDate}`, { incomeCents, plannedSavingsCents: manual ? savingCents : null });
      onClose();
      void load();
    } catch (err) {
      notifyError(err);
      setBusy(false);
    }
  };

  return (
    <Modal title={`Nómina del ${shortDay(period.payDate)}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Nómina neta recibida" inputMode="decimal" value={income} onChange={e => setIncome(e.target.value)} />
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={manual} onChange={e => setManual(e.target.checked)} className="accent-[rgb(var(--c-primary))]" />
          Fijar el ahorro de esta quincena a mano
        </label>
        {manual && <Field label="Ahorro de esta quincena" inputMode="decimal" value={saving} onChange={e => setSaving(e.target.value)} />}
        <SubmitButton onClick={save} disabled={!valid} busy={busy}>Guardar</SubmitButton>
      </div>
    </Modal>
  );
}

function SettingsModal({ settings, onClose }: { settings: BudgetSettings; onClose: () => void }) {
  const load = useFinanceStore(s => s.load);
  const [net, setNet] = useState(centsText(settings.payrollNetCents));
  const [mode, setMode] = useState<SavingsMode>(settings.savingsMode);
  const [pct, setPct] = useState(settings.savingsMode === 'porcentaje' ? String(settings.savingsValue) : '10');
  const [fixedAmount, setFixedAmount] = useState(settings.savingsMode === 'fijo' ? centsText(settings.savingsValue) : '');
  const [tutoring, setTutoring] = useState(centsText(settings.tutoringWeeklyCents));
  const [busy, setBusy] = useState(false);
  const netCents = parseCents(net);
  const value = mode === 'porcentaje' ? Number(pct) : parseCents(fixedAmount);
  const valid = netCents >= 0 && Number.isFinite(value) && value >= 0 && (mode === 'fijo' || value <= 100) && parseCents(tutoring) > 0;
  const preview = mode === 'porcentaje' ? Math.round((netCents * value) / 100) : value;

  const save = async () => {
    setBusy(true);
    try {
      await api.patch('/settings/budget', {
        payrollNetCents: netCents,
        savingsMode: mode,
        savingsValue: value,
        tutoringWeeklyCents: parseCents(tutoring),
      });
      toast.success('Las quincenas sin nómina capturada usan estos valores', 'Ajustes guardados');
      onClose();
      void load();
    } catch (err) {
      notifyError(err);
      setBusy(false);
    }
  };

  return (
    <Modal title="Ajustes de quincena" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Nómina neta por quincena" inputMode="decimal" value={net} onChange={e => setNet(e.target.value)} hint="Se usa en las quincenas donde no capturaste la real." />
        <div className="space-y-2">
          <span className="block text-ink/60 text-xs font-label uppercase tracking-wider">Ahorro de nómina</span>
          <Segmented value={mode} onChange={setMode} options={[{ value: 'porcentaje', label: 'Porcentaje' }, { value: 'fijo', label: 'Monto fijo' }]} />
          {mode === 'porcentaje' ? (
            <Field label="% de la nómina" inputMode="decimal" value={pct} onChange={e => setPct(e.target.value)} />
          ) : (
            <Field label="Monto por quincena" inputMode="decimal" value={fixedAmount} onChange={e => setFixedAmount(e.target.value)} />
          )}
          {valid && <p className="text-xs text-ink/50">≈ {formatCents(preview)} por quincena, mitad a Mercado Pago y mitad a Nu.</p>}
        </div>
        <Field label="Tutoría semanal" inputMode="decimal" value={tutoring} onChange={e => setTutoring(e.target.value)} />
        <SubmitButton onClick={save} disabled={!valid} busy={busy}>Guardar</SubmitButton>
      </div>
    </Modal>
  );
}

function FixedForm() {
  const { accounts, load } = useFinanceStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [busy, setBusy] = useState(false);
  const debit = (accounts ?? []).find(a => a.kind === 'DEBIT');
  const cents = parseCents(amount);
  const d = Number(day);
  const valid = name.trim() && cents > 0 && d >= 1 && d <= 31;

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await api.post('/fixed-expenses', { name: name.trim(), amountCents: cents, dayOfMonth: d, accountId: debit?.id });
      setName('');
      setAmount('');
      setDay('');
      setOpen(false);
      void load();
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full p-3 flex items-center justify-center gap-2 text-primary text-sm font-bold">
        <Plus className="w-4 h-4" /> Agregar fijo
      </button>
    );
  }
  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-[1fr_6rem_4rem] gap-2">
        <Field label="Nombre" value={name} onChange={e => setName(e.target.value)} placeholder="Renta" maxLength={80} />
        <Field label="Monto" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
        <Field label="Día" inputMode="numeric" value={day} onChange={e => setDay(e.target.value.replace(/\D/g, ''))} />
      </div>
      <SubmitButton onClick={save} disabled={!valid} busy={busy}>Guardar fijo{debit ? ` (desde ${debit.name})` : ''}</SubmitButton>
    </div>
  );
}

/**
 * Registers what was already done with this payroll: card payments and the
 * savings transfer. Every line can be unchecked or adjusted to the real amount.
 */
function DisperseModal({ period, today, onClose }: { period: PayPeriod; today: string; onClose: () => void }) {
  const load = useFinanceStore(s => s.load);
  const toSave = Math.max(0, period.savingsCents - period.savedCents);
  const initial = [
    ...period.cards
      .filter(c => c.remainingCents > 0)
      .map(c => ({
        key: `card-${c.accountId}-${c.cutDate}`,
        label: `${c.accountName} · corte ${shortDay(c.cutDate)}`,
        hint: c.status === 'OPEN' ? 'Corte aún abierto: puede seguir sumando' : `Vence ${shortDay(c.paymentDate)}`,
        amount: centsText(c.remainingCents),
        checked: c.status !== 'OPEN',
        card: c,
      })),
    ...(toSave > 0
      ? [{ key: 'savings', label: 'Ahorro a Mercado Pago y Nu (50/50)', hint: 'Lo que moviste a tus cuentas de ahorro', amount: centsText(toSave), checked: true, card: null }]
      : []),
  ];
  const [rows, setRows] = useState(initial);
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const selected = rows.filter(r => r.checked);
  const valid = selected.length > 0 && selected.every(r => parseCents(r.amount) > 0);
  const total = selected.reduce((s, r) => s + (parseCents(r.amount) || 0), 0);

  const update = (key: string, patch: Partial<(typeof rows)[number]>) => setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const save = async () => {
    setBusy(true);
    let done = 0;
    try {
      for (const r of selected) {
        const amountCents = parseCents(r.amount);
        if (r.card) await api.post(`/cards/${r.card.accountId}/payments`, { cutDate: r.card.cutDate, amountCents, date });
        else await api.post(`/pay-periods/${period.payDate}/savings`, { amountCents, date });
        done++;
      }
      toast.success(`${formatCents(total)} registrados`, `Nómina del ${shortDay(period.payDate)} dispersada`);
      onClose();
    } catch (err) {
      notifyError(err, done > 0 ? `Se registraron ${done} de ${selected.length}` : 'No se registró');
      setBusy(false);
    } finally {
      void load();
    }
  };

  return (
    <Modal title={`Dispersar nómina del ${shortDay(period.payDate)}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-ink/60">Marca lo que ya hiciste con esta nómina y ajusta el monto si fue distinto.</p>
        <ul className="space-y-3">
          {rows.map(r => (
            <li key={r.key} className="flex items-center gap-3">
              <button
                onClick={() => update(r.key, { checked: !r.checked })}
                className={cn('w-6 h-6 rounded-md border flex items-center justify-center shrink-0', r.checked ? 'bg-secondary border-secondary text-on-secondary' : 'border-ink/20')}
                aria-label={r.checked ? 'Quitar' : 'Incluir'}
              >
                {r.checked && <Check className="w-4 h-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.label}</p>
                <p className="text-xs text-ink/50 truncate">{r.hint}</p>
              </div>
              <input
                inputMode="decimal"
                value={r.amount}
                onChange={e => update(r.key, { amount: e.target.value, checked: true })}
                className="w-28 bg-ink/5 border border-ink/10 rounded-lg py-1.5 px-2 text-right font-mono text-sm focus:outline-none focus:border-primary/50"
              />
            </li>
          ))}
        </ul>
        <Field label="Fecha en que lo hiciste" type="date" value={date} max={today} onChange={e => setDate(e.target.value)} />
        <SubmitButton onClick={save} disabled={!valid} busy={busy}>Registrar {formatCents(total)}</SubmitButton>
      </div>
    </Modal>
  );
}
