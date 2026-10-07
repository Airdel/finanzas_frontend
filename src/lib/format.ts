const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function formatMoney(value: number | string): string {
  return currency.format(Number(value) || 0);
}

/** Today as YYYY-MM-DD in the device's local timezone. */
export function todayISO(): string {
  return new Date().toLocaleDateString('en-CA');
}

/**
 * Formats a business day. Accepts 'YYYY-MM-DD' or a Prisma @db.Date ISO string
 * ('YYYY-MM-DDT00:00:00.000Z'); only the date part is used so the timezone
 * never shifts the day.
 */
export function formatDay(value: string, options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }): string {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  const text = new Date(y, m - 1, d).toLocaleDateString('es-MX', options);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Money is stored as integer cents (MXN). */
export function formatCents(cents: number): string {
  return currency.format(cents / 100);
}

/** Whole days from `from` to `to` (both 'YYYY-MM-DD'). */
export function daysBetween(from: string, to: string): number {
  const toUtc = (value: string) => {
    const [y, m, d] = value.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}
