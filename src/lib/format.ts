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

/** "1,234.5" / "1234.50" → 123450 cents; NaN when it is not a number. */
export function parseCents(text: string): number {
  const clean = text.replace(/[,\s$]/g, '');
  if (!/^\d*(\.\d{0,2})?$/.test(clean) || clean === '' || clean === '.') return NaN;
  const [whole, fraction = ''] = clean.split('.');
  return Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'));
}

/** "hoy", "mañana", "en 5 días", "hace 2 días". */
export function relativeDays(days: number): string {
  if (days === 0) return 'hoy';
  if (days === 1) return 'mañana';
  if (days === -1) return 'ayer';
  return days > 0 ? `en ${days} días` : `hace ${-days} días`;
}

export const shortDay = (value: string) => formatDay(value, { day: 'numeric', month: 'short' });
