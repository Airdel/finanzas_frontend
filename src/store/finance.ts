import { create } from 'zustand';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import type { Account, CardsOverview, Transaction } from '../lib/types';
import { unwrap } from '../lib/unwrap';

interface FinanceState {
  accounts: Account[] | null;
  overview: CardsOverview | null;
  recent: Transaction[] | null;
  error: string;
  /** Reloads accounts, card statements and recent movements together. */
  load: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>(set => ({
  accounts: null,
  overview: null,
  recent: null,
  error: '',
  load: async () => {
    try {
      const [accounts, overview, recent] = await Promise.all([
        api.get('/accounts'),
        api.get('/cards/overview'),
        api.get('/transactions', { params: { limit: 15 } }),
      ]);
      set({
        accounts: unwrap<Account[]>(accounts),
        overview: unwrap<CardsOverview>(overview),
        recent: unwrap<Transaction[]>(recent),
        error: '',
      });
    } catch (err) {
      set({ error: getErrorMessage(err, 'No se pudieron cargar los datos') });
    }
  },
}));
