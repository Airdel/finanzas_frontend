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
  /** MSI installments billed on this cut */
  msiCents: number;
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
  installments: CardInstallment[];
  transactions: Transaction[];
}

export interface Installment {
  number: number;
  cutDate: string;
  amountCents: number;
  /** The single charge that liquidates the rest of the plan */
  settlement: boolean;
}

export interface CardInstallment extends Installment {
  planId: number;
  description: string;
  months: number;
}

export interface MsiPlan {
  id: number;
  accountId: number;
  accountName: string;
  description: string;
  totalCents: number;
  months: number;
  monthlyCents: number;
  purchaseDate: string;
  firstCutDate: string;
  settledCutDate: string | null;
  trackedFromCutDate: string | null;
  billedCount: number;
  remainingCents: number;
  next: (Installment & { paymentDate: string }) | null;
  finished: boolean;
  schedule: Installment[];
}

export interface PrepayAnalysis {
  planId: number;
  description: string;
  openCutDate: string;
  annualRatePct: number;
  inflationPct: number;
  pendingInstallments: number;
  remainingCents: number;
  nominalGainCents: number;
  realGainCents: number;
  realRatePct: number;
  inflationErosionCents: number;
}

export type SavingsMode = 'porcentaje' | 'fijo';

export interface BudgetSettings {
  payrollNetCents: number;
  savingsMode: SavingsMode;
  /** % of income (porcentaje) or cents per quincena (fijo) */
  savingsValue: number;
  savingsSplit: Record<string, number>;
  tutoringWeeklyCents: number;
}

export interface PeriodCard {
  accountId: number;
  accountName: string;
  cutDate: string;
  paymentDate: string;
  status: StatementStatus;
  overdue: boolean;
  statementCents: number;
  msiCents: number;
  paymentsCents: number;
  remainingCents: number;
}

export interface PayPeriod {
  payDate: string;
  nominalDate: string;
  endDate: string;
  incomeCents: number;
  incomeConfirmed: boolean;
  savingsManual: boolean;
  note: string | null;
  cards: PeriodCard[];
  cardsCents: number;
  msiCents: number;
  cardsPendingCents: number;
  savingsCents: number;
  savedCents: number;
  fixed: { id: number; name: string; date: string; amountCents: number }[];
  fixedCents: number;
  tutoringCents: number;
  tutoringCount: number;
  availableCents: number;
}

export interface PayPeriods {
  today: string;
  settings: BudgetSettings;
  periods: PayPeriod[];
}

export interface SavingsMovement {
  id: number;
  date: string;
  flow: 'NOMINA' | 'TUTORIA';
  amountCents: number;
  toAccount: { id: number; name: string; slug: string };
  payPeriod: { payDate: string } | null;
}

export interface SavingsOverview {
  accounts: { id: number; slug: string; name: string; totalCents: number }[];
  byFlow: { nominaCents: number; tutoriaCents: number };
  recent: SavingsMovement[];
}

export interface FixedExpense {
  id: number;
  name: string;
  amountCents: number;
  dayOfMonth: number;
  accountId: number | null;
  account: { id: number; name: string } | null;
}
