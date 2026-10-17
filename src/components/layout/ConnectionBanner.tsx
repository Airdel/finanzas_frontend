import { useEffect, useState } from 'react';
import { AlertTriangle, CloudOff, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { useConnectionStore } from '../../store/connection';
import { useFinanceStore } from '../../store/finance';
import { useOfflineOps, type QueuedOp } from '../../store/offlineOps';
import { retryOfflineOp } from '../../lib/offline';
import { confirm } from '../../lib/dialogs';
import { Modal } from '../ui/Modal';

const opsText = (n: number) => `${n} ${n === 1 ? 'movimiento' : 'movimientos'}`;
const when = (iso: string) => new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Says when the office PC can't be reached, how much is waiting on this
 * device, and lets Darien retry or discard what the server refused.
 */
export function ConnectionBanner() {
  const online = useConnectionStore(state => state.online);
  const ops = useOfflineOps(state => state.ops);
  const stale = useFinanceStore(state => state.stale);
  const [showFailed, setShowFailed] = useState(false);
  const failed = ops.filter(o => o.error);
  const pending = ops.length - failed.length;

  if (online && !stale && ops.length === 0) return null;

  return (
    <>
      <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl px-4 py-3 text-sm border border-warning/30 bg-warning/10 text-ink/80">
        {!online || stale ? (
          <span className="flex items-center gap-2">
            <CloudOff className="w-4 h-4 text-warning shrink-0" />
            <span>
              <b className="text-warning">Sin conexión con el servidor.</b> Ves lo último guardado en este dispositivo; capturas y pagos se envían solos cuando vuelva la PC
              {pending > 0 && <> ({opsText(pending)} en espera)</>}.
            </span>
          </span>
        ) : pending > 0 && (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            Enviando {opsText(pending)} hechos sin conexión…
          </span>
        )}
        {failed.length > 0 && (
          <button onClick={() => setShowFailed(true)} className="flex items-center gap-1.5 text-error font-semibold underline underline-offset-2">
            <AlertTriangle className="w-4 h-4" /> {opsText(failed.length)} sin enviar
          </button>
        )}
      </div>
      {showFailed && <FailedOps ops={failed} onClose={() => setShowFailed(false)} />}
    </>
  );
}

function FailedOps({ ops, onClose }: { ops: QueuedOp[]; onClose: () => void }) {
  const remove = useOfflineOps(state => state.remove);
  const load = useFinanceStore(state => state.load);

  const discard = async (op: QueuedOp) => {
    const ok = await confirm({ title: 'Descartar', message: op.label, confirmLabel: 'Descartar', tone: 'danger' });
    if (ok) remove(op.key);
  };

  // Everything was sent or discarded: nothing left to show
  useEffect(() => {
    if (ops.length === 0) onClose();
  }, [ops.length, onClose]);

  return (
    <Modal title="No se pudieron enviar" onClose={onClose}>
      <p className="text-sm text-ink/60 mb-3">El servidor rechazó estos movimientos hechos sin conexión. Reintenta si ya corregiste la causa, o descártalos y captúralos de nuevo.</p>
      <ul className="divide-y divide-ink/10">
        {ops.map(op => (
          <li key={op.key} className="py-2.5 flex items-center gap-3 text-sm">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{op.label}</p>
              <p className="text-xs text-ink/40">{when(op.createdAt)}</p>
              <p className="text-xs text-error">{op.error}</p>
            </div>
            <button onClick={() => retryOfflineOp(op.key, () => void load())} className="p-1.5 text-ink/40 hover:text-primary" aria-label="Reintentar">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => void discard(op)} className="p-1.5 text-ink/40 hover:text-error" aria-label="Descartar">
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
