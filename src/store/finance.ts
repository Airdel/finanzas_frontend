import { create } from 'zustand';
import { getErrorMessage } from '../lib/errors';
import type { Account, CardsOverview, FixedExpense, MsiPlan, PayPeriods, SavingsOverview, Transaction } from '../lib/types';
import { cachedGet } from '../lib/offline';

interface FinanceState {
  accounts: Account[] | null;
  overview: CardsOverview | null;
  recent: Transaction[] | null;
  periods: PayPeriods | null;
  msi: MsiPlan[] | null;
  savings: SavingsOverview | null;
  fixed: FixedExpense[] | null;
  error: string;
  /** Showing the copy saved on this device because the PC didn't answer. */
  stale: boolean;
  /** Reloads everything together: any change can move cuts, quincenas and savings. */
  load: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>(set => ({
  accounts: null,
  overview: null,
  recent: null,
  periods: null,
  msi: null,
  savings: null,
  fixed: null,
  error: '',
  stale: false,
  load: async () => {
    try {
      const results = await Promise.all([
        cachedGet<Account[]>('/accounts'),
        cachedGet<CardsOverview>('/cards/overview'),
        cachedGet<Transaction[]>('/transactions', { limit: 15 }),
        cachedGet<PayPeriods>('/pay-periods', { count: 4 }),
        cachedGet<MsiPlan[]>('/msi'),
        cachedGet<SavingsOverview>('/savings'),
        cachedGet<FixedExpense[]>('/fixed-expenses'),
      ]);
      const [accounts, overview, recent, periods, msi, savings, fixed] = results;
      set({
        accounts: accounts.data,
        overview: overview.data,
        recent: recent.data,
        periods: periods.data,
        msi: msi.data,
        savings: savings.data,
        fixed: fixed.data,
        error: '',
        stale: results.some(r => r.fromCache),
      });
    } catch (err) {
      set({ error: getErrorMessage(err, 'No se pudieron cargar los datos') });
    }
  },
}));
