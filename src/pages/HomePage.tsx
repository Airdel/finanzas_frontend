import { useEffect, useState } from 'react';
import { CalendarClock, CreditCard, Loader2, LogOut, Palette, PiggyBank, Landmark, Wifi } from 'lucide-react';
import * as motion from 'motion/react-client';
import { api } from '../lib/api';
import { logout } from '../lib/auth';
import { getErrorMessage } from '../lib/errors';
import { daysBetween, formatDay } from '../lib/format';
import { getApiUrl } from '../lib/server';
import type { Account, AccountKind, Health } from '../lib/types';
import { unwrap } from '../lib/unwrap';
import { useAuthStore } from '../store/auth';

const KIND_LABELS: Record<AccountKind, string> = {
  CREDIT_CARD: 'Tarjetas de crédito',
  DEBIT: 'Débito',
  SAVINGS: 'Ahorro',
};

const KIND_ICONS = { CREDIT_CARD: CreditCard, DEBIT: Landmark, SAVINGS: PiggyBank };

/** Fase 0: confirms the session works end to end and shows the card calendar. */
export function HomePage({ onOpenThemes }: { onOpenThemes: () => void }) {
  const user = useAuthStore(state => state.user);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/health'), api.get('/accounts')])
      .then(([health, list]) => {
        setToday(unwrap<Health>(health).today);
        setAccounts(unwrap<Account[]>(list));
      })
      .catch(err => setError(getErrorMessage(err, 'No se pudieron cargar las cuentas')));
  }, []);

  const groups = (['CREDIT_CARD', 'DEBIT', 'SAVINGS'] as const)
    .map(kind => ({ kind, items: (accounts ?? []).filter(a => a.kind === kind) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="min-h-[100dvh] text-ink p-4 sm:p-8 pt-[calc(1rem+var(--safe-area-inset-top,env(safe-area-inset-top,0px)))]">
      <div className="max-w-2xl mx-auto space-y-6">
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

        <div className="glass-panel p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
            <Wifi className="w-5 h-5 text-secondary" />
          </div>
          <div className="min-w-0 text-sm">
            <p className="font-bold">{error ? 'Sin conexión con la API' : 'Conectado a la API'}</p>
            <p className="text-ink/50 truncate">{getApiUrl()}{today && ` · hoy ${formatDay(today)}`}</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">{error}</div>
        )}

        {!accounts && !error && (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        )}

        {groups.map(({ kind, items }) => {
          const Icon = KIND_ICONS[kind];
          return (
            <section key={kind} className="space-y-3">
              <h2 className="font-label text-ink/50 text-xs uppercase tracking-wider flex items-center gap-2">
                <Icon className="w-4 h-4" /> {KIND_LABELS[kind]}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((account, i) => (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass-panel p-4"
                  >
                    <p className="font-headline font-bold">{account.name}</p>
                    {account.nextCutDate && today ? (
                      <CutInfo cut={account.nextCutDate} payment={account.nextPaymentDate!} today={today} />
                    ) : (
                      <p className="text-ink/40 text-sm mt-1">Sin corte</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CutInfo({ cut, payment, today }: { cut: string; payment: string; today: string }) {
  const days = daysBetween(today, cut);
  const when = days === 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`;
  return (
    <div className="mt-2 text-sm space-y-1">
      <p className="flex items-center gap-2">
        <CalendarClock className={`w-4 h-4 ${days <= 3 ? 'text-warning' : 'text-primary'}`} />
        Corte {formatDay(cut, { day: 'numeric', month: 'short' })} · <span className="text-ink/60">{when}</span>
      </p>
      <p className="text-ink/50 pl-6">
        Pago {payment === cut ? 'el mismo día' : formatDay(payment, { day: 'numeric', month: 'short' })}
      </p>
    </div>
  );
}
