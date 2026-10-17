import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * A capture or payment made while the office PC was unreachable, kept on the
 * device until it is sent.
 */
export interface QueuedOp {
  /** Sent as Idempotency-Key, so the server records it once even if it arrives twice. */
  key: string;
  url: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body: unknown;
  /** When it was made on the device. */
  createdAt: string;
  /** What it was, for people ("Gasto $50.00 · Nu"). */
  label: string;
  /** The server refused it; it waits for Darien to retry or discard it. */
  error?: string;
}

interface OfflineOpsState {
  ops: QueuedOp[];
  add: (op: QueuedOp) => void;
  update: (key: string, change: (op: QueuedOp) => QueuedOp) => void;
  remove: (key: string) => void;
}

export const useOfflineOps = create<OfflineOpsState>()(
  persist(
    set => ({
      ops: [],
      add: op => set(s => ({ ops: [...s.ops, op] })),
      update: (key, change) => set(s => ({ ops: s.ops.map(o => (o.key === key ? change(o) : o)) })),
      remove: key => set(s => ({ ops: s.ops.filter(o => o.key !== key) })),
    }),
    { name: 'finanzas.offline-ops' }
  )
);

/** Random id for Idempotency-Key (8-64 chars of [A-Za-z0-9_-]). */
export function newOpKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
