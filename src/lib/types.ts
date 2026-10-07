export type AccountKind = 'CREDIT_CARD' | 'DEBIT' | 'SAVINGS';

export interface Account {
  id: number;
  slug: string;
  name: string;
  kind: AccountKind;
  cutDay: number | null;
  payDaysAfterCut: number;
  creditLimitCents: number | null;
  nextCutDate: string | null;
  nextPaymentDate: string | null;
}

export interface Health {
  status: 'ok';
  /** Today in the server's business timezone (YYYY-MM-DD) */
  today: string;
}
