import { create } from 'zustand';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import type { Account, CardsOverview, FixedExpense, MsiPlan, PayPeriods, SavingsOverview, Transaction } from '../lib/types';
import { unwrap } from '../lib/unwrap';

interface FinanceState {
  accounts: Account[] | null;
  overview: CardsOverview | null;
  recent: Transaction[] | null;
  periods: PayPeriods | null;
  msi: MsiPlan[] | null;
  savings: SavingsOverview | null;
  fixed: FixedExpense[] | null;
  error: string;
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
  load: async () => {
    try {
      const [accounts, overview, recent, periods, msi, savings, fixed] = await Promise.all([
        api.get('/accounts'),
        api.get('/cards/overview'),
        api.get('/transactions', { params: { limit: 15 } }),
        api.get('/pay-periods', { params: { count: 4 } }),
        api.get('/msi'),
        api.get('/savings'),
        api.get('/fixed-expenses'),
      ]);
      set({
        accounts: unwrap<Account[]>(accounts),
        overview: unwrap<CardsOverview>(overview),
        recent: unwrap<Transaction[]>(recent),
        periods: unwrap<PayPeriods>(periods),
        msi: unwrap<MsiPlan[]>(msi),
        savings: unwrap<SavingsOverview>(savings),
        fixed: unwrap<FixedExpense[]>(fixed),
        error: '',
      });
    } catch (err) {
      set({ error: getErrorMessage(err, 'No se pudieron cargar los datos') });
    }
  },
}));
