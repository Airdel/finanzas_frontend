export type AccountKind = 'CREDIT_CARD' | 'DEBIT' | 'SAVINGS';

export interface Account {
  id: number;
  slug: string;
  name: string;
  kind: AccountKind;
  cutDay: number | null;
  payDaysAfterCut: number;
  cutDayPurchasesNext: boolean;
  creditLimitCents: number | null;
  nextCutDate: string | null;
  nextPaymentDate: string | null;
}

export interface Health {
  status: 'ok';
  /** Today in the server's business timezone (YYYY-MM-DD) */
  today: string;
}

export type StatementStatus = 'OPEN' | 'DUE' | 'OVERDUE' | 'PAID' | 'EMPTY';

export interface Statement {
  cutDate: string;
  paymentDate: string;
  periodStart: string;
  periodEnd: string;
  chargesCents: number;
  creditsCents: number;
  statementCents: number;
  paymentsCents: number;
  remainingCents: number;
  chargeCount: number;
  status: StatementStatus;
}

export interface CardSummary {
  id: number;
  slug: string;
  name: string;
  cutDay: number;
  payDaysAfterCut: number;
  cutDayPurchasesNext: boolean;
  creditLimitCents: number | null;
  /** Where a purchase made today lands */
  purchaseToday: { cutDate: string; paymentDate: string; daysToPay: number };
  /** Open statement first, then the last closed ones */
  statements: Statement[];
}

export interface PayrollGroup {
  payroll: { nominal: string; actual: string };
  items: {
    accountId: number;
    accountName: string;
    cutDate: string;
    paymentDate: string;
    status: StatementStatus;
    remainingCents: number;
  }[];
  totalCents: number;
}

export interface CardsOverview {
  today: string;
  bestCardId: number | null;
  cards: CardSummary[];
  upcoming: PayrollGroup[];
}

export interface Transaction {
  id: number;
  accountId: number;
  date: string;
  description: string;
  amountCents: number;
  category: string | null;
  note: string | null;
  paysCutDate: string | null;
  account?: { id: number; slug: string; name: string; kind: AccountKind };
}

export interface CreatedTransaction extends Transaction {
  statement: { cutDate: string; paymentDate: string } | null;
}

export interface StatementDetail extends Statement {
  accountId: number;
  accountName: string;
  transactions: Transaction[];
}
