import { isAxiosError } from 'axios';
import { api } from './api';
import { unwrap } from './unwrap';
import { getErrorMessage } from './errors';
import { useAuthStore } from '../store/auth';
import { setServerOnline, useConnectionStore } from '../store/connection';
import { newOpKey, useOfflineOps } from '../store/offlineOps';

/** How long to wait for the PC before treating it as off (a dead Tailscale peer never answers). */
export const QUICK_TIMEOUT_MS = 8000;
const PING_EVERY_MS = 15000;

/**
 * The server could not be reached: no answer, a timeout, or Tailscale saying
 * the API behind it is down. Anything else is a real answer.
 */
export function isOfflineError(err: unknown): boolean {
  if (!isAxiosError(err)) return false;
  if (!err.response) return true;
  return [502, 503, 504].includes(err.response.status);
}

const cacheKey = (url: string, params?: object) => `finanzas.cache:${url}${params ? JSON.stringify(params) : ''}`;

/**
 * GET that remembers its last answer on the device, so the cards, quincenas
 * and MSI still show (as of the last time) when the PC is off. `fromCache`
 * says the answer is that old copy.
 */
export async function cachedGet<T>(url: string, params?: object): Promise<{ data: T; fromCache: boolean }> {
  try {
    const data = unwrap<T>(await api.get(url, { params, timeout: QUICK_TIMEOUT_MS }));
    try {
      localStorage.setItem(cacheKey(url, params), JSON.stringify(data));
    } catch {
      // Storage full: the screen still works online
    }
    return { data, fromCache: false };
  } catch (err) {
    if (isOfflineError(err)) {
      try {
        const saved = localStorage.getItem(cacheKey(url, params));
        if (saved) return { data: JSON.parse(saved) as T, fromCache: true };
      } catch {
        // Fall through to the original error
      }
    }
    throw err;
  }
}

/** Told to Darien when something was kept on the device instead of sent. */
export const QUEUED_MESSAGE = 'Sin conexión: quedó guardado en este dispositivo y se enviará solo cuando vuelva la PC.';

export type SendResult<T> = { queued: false; data: T } | { queued: true };

/**
 * Write that works with the PC off: sent right away when it answers, and
 * otherwise kept on the device and sent later. The same Idempotency-Key goes
 * with every try, so a request that did arrive but whose answer was lost is
 * not recorded twice. Bodies carry their own date, so a late send keeps it.
 */
export async function sendOrQueue<T = unknown>(
  url: string,
  body: unknown,
  label: string,
  method: 'POST' | 'PATCH' | 'DELETE' = 'POST'
): Promise<SendResult<T>> {
  const key = newOpKey();
  try {
    const res = await api.request({ url, method, data: body, timeout: QUICK_TIMEOUT_MS, headers: { 'Idempotency-Key': key } });
    return { queued: false, data: unwrap<T>(res) };
  } catch (err) {
    if (!isOfflineError(err)) throw err;
    useOfflineOps.getState().add({ key, url, method, body, label, createdAt: new Date().toISOString() });
    return { queued: true };
  }
}

/**
 * The server is still recording an earlier copy of the same request: try
 * again later. Other 409s are real refusals.
 */
const isStillRecording = (err: unknown) =>
  isAxiosError(err) && err.response?.status === 409 && getErrorMessage(err).includes('todavía se está registrando');

let syncing = false;

/**
 * Sends what was registered offline, oldest first. Stops at the first one
 * that can't reach the server; one the server refuses is kept with its reason.
 * Returns whether anything was sent, so screens can reload.
 */
export async function syncOfflineOps(): Promise<boolean> {
  if (syncing || !useAuthStore.getState().accessToken) return false;
  syncing = true;
  let sent = false;
  try {
    for (const { key } of useOfflineOps.getState().ops) {
      const op = useOfflineOps.getState().ops.find(o => o.key === key);
      if (!op || op.error) continue;
      try {
        await api.request({
          url: op.url,
          method: op.method,
          data: op.body,
          timeout: QUICK_TIMEOUT_MS * 2,
          headers: { 'Idempotency-Key': op.key },
        });
        useOfflineOps.getState().remove(key);
        sent = true;
      } catch (err) {
        if (isOfflineError(err) || isStillRecording(err)) break;
        // Logged out (session expired): it is sent after the next login
        if (!useAuthStore.getState().accessToken) break;
        useOfflineOps.getState().update(key, o => ({ ...o, error: getErrorMessage(err) }));
      }
    }
  } finally {
    syncing = false;
  }
  return sent;
}

/** Tries again something the server refused. */
export function retryOfflineOp(key: string, onSent?: () => void) {
  useOfflineOps.getState().update(key, op => ({ ...op, error: undefined }));
  void syncOfflineOps().then(sent => sent && onSent?.());
}

async function ping() {
  try {
    await api.get('/health', { timeout: QUICK_TIMEOUT_MS });
  } catch (err) {
    // A real answer (even an error) means the PC is up
    setServerOnline(!isOfflineError(err));
  }
}

/**
 * While logged in: checks every few seconds whether the PC came back (only
 * when it is off or something is waiting) and sends the queue. `refresh`
 * runs when the PC is back or something was sent, so the screen reloads.
 */
export function startOfflineSync(refresh: () => void): () => void {
  const flush = async () => {
    if (await syncOfflineOps()) refresh();
  };
  const tick = async () => {
    const pending = useOfflineOps.getState().ops.some(o => !o.error);
    if (!useConnectionStore.getState().online) await ping();
    if (!useConnectionStore.getState().online) return;
    if (pending) await flush();
  };
  const timer = setInterval(tick, PING_EVERY_MS);
  const onBack = () => void tick();
  window.addEventListener('online', onBack);
  // The server answering anything means it is back: send right away
  const unsubscribe = useConnectionStore.subscribe((state, prev) => {
    if (state.online && !prev.online) void syncOfflineOps().then(refresh);
  });
  void tick();
  return () => {
    clearInterval(timer);
    window.removeEventListener('online', onBack);
    unsubscribe();
  };
}
