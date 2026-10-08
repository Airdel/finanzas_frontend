import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, CreditCard, Landmark, Loader2, LogOut, Palette, PiggyBank, Plus, Star, Trash2, WifiOff } from 'lucide-react';
import * as motion from 'motion/react-client';
import { CardModal } from '../components/finance/CardModal';
import { PayModal, type PayTarget } from '../components/finance/PayModal';
import { QuickCapture } from '../components/finance/QuickCapture';
import { MsiView } from '../components/finance/MsiView';
import { QuincenasView } from '../components/finance/QuincenasView';
import { Segmented } from '../components/ui/Field';
import { StatusBadge } from '../components/finance/StatusBadge';
import { api } from '../lib/api';
import { logout } from '../lib/auth';
import { cn } from '../lib/cn';
import { confirm, notifyError } from '../lib/dialogs';
import { daysBetween, formatCents, relativeDays, shortDay } from '../lib/format';
import { getApiUrl } from '../lib/server';
import type { CardSummary, PayrollGroup } from '../lib/types';
import { useAuthStore } from '../store/auth';
import { useFinanceStore } from '../store/finance';

type Tab = 'tarjetas' | 'quincenas' | 'msi';
const TAB_KEY = 'finanzas.tab';

function savedTab(): Tab {
  try {
    const value = localStorage.getItem(TAB_KEY);
    return value === 'quincenas' || value === 'msi' ? value : 'tarjetas';
  } catch {
    return 'tarjetas';
  }
}

/** Cards (Fase 1), quincenas with savings and MSI (Fase 2), plus quick capture. */
export function HomePage({ onOpenThemes }: { onOpenThemes: () => void }) {
  const user = useAuthStore(state => state.user);
  const { accounts, overview, recent, error, load } = useFinanceStore();
  const [capturing, setCapturing] = useState(false);
  const [cardId, setCardId] = useState<number | null>(null);
  const [paying, setPaying] = useState<PayTarget | null>(null);
  const [tab, setTabState] = useState<Tab>(savedTab);
  const setTab = (next: Tab) => {
    setTabState(next);
    try {
      localStorage.setItem(TAB_KEY, next);
    } catch {
      // private mode: the tab just isn't remembered
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  const today = overview?.today;
  const selectedCard = overview?.cards.find(c => c.id === cardId) ?? null;
  // Open periods with nothing owed are noise here; the cards section still shows them
  const pending = (overview?.upcoming ?? [])
    .map(g => ({ ...g, items: g.items.filter(i => i.remainingCents > 0) }))
    .filter(g => g.items.length > 0);
  const otherAccounts = (accounts ?? []).filter(a => a.kind !== 'CREDIT_CARD');

  const removeTx = async (id: number, description: string) => {
    const ok = await confirm({ title: 'Borrar movimiento', message: description, confirmLabel: 'Borrar', tone: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/transactions/${id}`);
      void load();
    } catch (err) {
      notifyError(err);
    }
  };

  return (
    <div className="min-h-[100dvh] text-ink p-4 sm:p-8 pt-[calc(1rem+var(--safe-area-inset-top,env(safe-area-inset-top,0px)))] pb-28">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-label text-ink/40 text-xs uppercase tracking-widest">Finanzas Quincenales</p>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold truncate">Hola, {user?.name ?? 'Darien'}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onOpenThemes} className="p-2.5 rounded-full glass-panel text-ink/60 hover:text-primary" aria-label="Temas">
              <Palette className="w-5 h-5" />
            </button>
            <button onClick={logout} className="p-2.5 rounded-full glass-panel text-ink/60 hover:text-error" aria-label="Cerrar sesión">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {error && (
          <div className="glass-panel p-4 flex items-center gap-3 border-error/30">
            <WifiOff className="w-5 h-5 text-error shrink-0" />
            <div className="min-w-0 text-sm">
              <p className="font-bold text-error">{error}</p>
              <p className="text-ink/50 truncate">{getApiUrl()}</p>
            </div>
            <button onClick={() => void load()} className="ml-auto text-sm font-bold text-primary shrink-0">Reintentar</button>
          </div>
        )}

        {overview && (
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'tarjetas', label: 'Tarjetas' },
              { value: 'quincenas', label: 'Quincenas' },
              { value: 'msi', label: 'MSI' },
            ]}
          />
        )}

        {tab === 'quincenas' && overview && <QuincenasView />}
        {tab === 'msi' && overview && <MsiView />}

        {!overview && !error && (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        )}

        {tab === 'tarjetas' && overview && today && (
          <>
            <section className="space-y-3">
              <SectionTitle icon={CalendarClock}>Por pagar · hoy {shortDay(today)}</SectionTitle>
              {pending.length === 0 && (
                <p className="glass-panel p-4 text-sm text-ink/50">Nada pendiente: ninguna tarjeta tiene compras sin pagar.</p>
              )}
              {pending.map(group => (
                <PayrollCard key={group.payroll.actual} group={group} today={today} onPay={setPaying} onOpen={setCardId} />
              ))}
            </section>

            <section className="space-y-3">
              <SectionTitle icon={CreditCard}>Tarjetas</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {overview.cards.map((card, i) => (
                  <CardTile key={card.id} card={card} best={overview.bestCardId === card.id} index={i} onOpen={() => setCardId(card.id)} />
                ))}
              </div>
            </section>
          </>
        )}

        {tab === 'tarjetas' && recent && (
          <section className="space-y-3">
            <SectionTitle icon={Landmark}>Movimientos recientes</SectionTitle>
            <div className="glass-panel divide-y divide-ink/5">
              {recent.length === 0 && <p className="p-4 text-sm text-ink/40 text-center">Aún no hay movimientos. Toca + para capturar el primero.</p>}
              {recent.map(t => (
                <div key={t.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{t.paysCutDate ? `Pago corte ${shortDay(t.paysCutDate)}` : t.description}</p>
                    <p className="text-xs text-ink/40 truncate">{shortDay(t.date)} · {t.account?.name}{t.category === 'msi' && t.note ? ` · ${t.note}` : ''}</p>
                  </div>
                  <span className={cn('font-mono', t.amountCents > 0 && 'text-secondary')}>
                    {t.amountCents > 0 ? '+' : '−'}{formatCents(Math.abs(t.amountCents))}
                  </span>
                  <button onClick={() => removeTx(t.id, t.category === 'msi' ? `${t.description} (también borra su plan MSI)` : t.description)} className="p-1.5 text-ink/30 hover:text-error" aria-label="Borrar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'tarjetas' && otherAccounts.length > 0 && (
          <section className="space-y-3">
            <SectionTitle icon={PiggyBank}>Débito y ahorro</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {otherAccounts.map(a => (
                <span key={a.id} className="glass-panel px-3 py-1.5 text-sm">{a.name}</span>
              ))}
            </div>
          </section>
        )}
      </div>

      {overview && (
        <button
          onClick={() => setCapturing(true)}
          className="fixed right-5 bottom-[calc(1.25rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] w-16 h-16 rounded-full bg-cta text-on-primary glow-primary flex items-center justify-center active:scale-95 transition-transform z-40"
          aria-label="Capturar gasto"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {capturing && <QuickCapture onClose={() => setCapturing(false)} />}
      {selectedCard && <CardModal key={selectedCard.id} card={selectedCard} onClose={() => setCardId(null)} />}
      {paying && <PayModal target={paying} onClose={() => setPaying(null)} />}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof CreditCard; children: React.ReactNode }) {
  return (
    <h2 className="font-label text-ink/50 text-xs uppercase tracking-wider flex items-center gap-2">
      <Icon className="w-4 h-4" /> {children}
    </h2>
  );
}

/** One payroll and the card payments it has to cover. */
function PayrollCard({ group, today, onPay, onOpen }: { group: PayrollGroup; today: string; onPay: (t: PayTarget) => void; onOpen: (id: number) => void }) {
  const received = group.payroll.actual <= today;
  return (
    <div className="glass-panel p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-headline font-bold">Nómina del {shortDay(group.payroll.actual)}</p>
          <p className="text-xs text-ink/50">{received ? 'Ya la recibiste' : `Llega ${relativeDays(daysBetween(today, group.payroll.actual))}`}</p>
        </div>
        <p className="font-mono font-bold text-lg">{formatCents(group.totalCents)}</p>
      </div>
      <ul className="space-y-2">
        {group.items.map(item => {
          const days = daysBetween(today, item.paymentDate);
          const closed = item.status === 'DUE' || item.status === 'OVERDUE';
          return (
            <li key={`${item.accountId}-${item.cutDate}`} className="flex items-center gap-3 text-sm">
              <button onClick={() => onOpen(item.accountId)} className="flex-1 min-w-0 text-left">
                <p className="font-medium truncate flex items-center gap-2">
                  {item.status === 'OVERDUE' && <AlertTriangle className="w-4 h-4 text-error shrink-0" />}
                  {item.accountName}
                  {closed && <StatusBadge status={item.status} />}
                </p>
                <p className={cn('text-xs', days <= 2 ? 'text-warning' : 'text-ink/50')}>
                  Pagas {shortDay(item.paymentDate)} · {relativeDays(days)}{item.status === 'OPEN' && ' · sigue acumulando'}
                </p>
              </button>
              <span className="font-mono">{formatCents(item.remainingCents)}</span>
              {item.remainingCents > 0 && (
                <button
                  onClick={() => onPay({ accountId: item.accountId, accountName: item.accountName, cutDate: item.cutDate, remainingCents: item.remainingCents })}
                  className="px-3 py-1.5 rounded-lg bg-secondary/15 text-secondary text-xs font-bold"
                >
                  Pagar
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CardTile({ card, best, index, onOpen }: { card: CardSummary; best: boolean; index: number; onOpen: () => void }) {
  const [open, ...closed] = card.statements;
  const last = closed[0];
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onOpen}
      className="glass-panel p-4 text-left space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-headline font-bold truncate">{card.name}</p>
        {best && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-accent whitespace-nowrap">
            <Star className="w-3.5 h-3.5 fill-current" /> Mejor hoy
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-xs text-ink/50">
          <p>Corte {shortDay(open.cutDate)} · pagas en {card.purchaseToday.daysToPay} d</p>
          <p>
            {open.chargeCount === 1 ? '1 compra' : `${open.chargeCount} compras`} en el periodo
            {open.paymentsCents > 0 && ` · pagado ${formatCents(open.paymentsCents)}`}
          </p>
        </div>
        <p className="font-mono font-bold text-lg">{formatCents(open.remainingCents)}</p>
      </div>
      {last && last.status !== 'EMPTY' && (
        <div className="flex items-center justify-between text-xs pt-2 border-t border-ink/5">
          <span className="text-ink/50">Corte {shortDay(last.cutDate)}</span>
          <StatusBadge status={last.status} />
        </div>
      )}
    </motion.button>
  );
}
