import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { notifyError, toast } from '../../lib/dialogs';
import { formatCents, parseCents, shortDay } from '../../lib/format';
import { useFinanceStore } from '../../store/finance';

export interface PayTarget {
  accountId: number;
  accountName: string;
  cutDate: string;
  remainingCents: number;
}

/** Marks a statement as paid. The amount defaults to what is still owed. */
export function PayModal({ target, onClose, onPaid }: { target: PayTarget; onClose: () => void; onPaid?: () => void }) {
  const load = useFinanceStore(s => s.load);
  const [amount, setAmount] = useState((target.remainingCents / 100).toFixed(2));
  const [saving, setSaving] = useState(false);
  const cents = parseCents(amount);

  const pay = async () => {
    if (!(cents > 0)) return;
    setSaving(true);
    try {
      await api.post(`/cards/${target.accountId}/payments`, { cutDate: target.cutDate, amountCents: cents });
      toast.success(`${target.accountName} · corte del ${shortDay(target.cutDate)}`, `Pago de ${formatCents(cents)} registrado`);
      onPaid?.();
      onClose();
      void load();
    } catch (err) {
      notifyError(err, 'No se registró el pago');
      setSaving(false);
    }
  };

  return (
    <Modal title={`Pagar ${target.accountName}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-ink/60">
          Corte del {shortDay(target.cutDate)} · pendiente {formatCents(target.remainingCents)}
        </p>
        <label className="block">
          <span className="block text-ink/60 text-xs font-label uppercase tracking-wider mb-2">Monto pagado</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-ink/5 border border-ink/10 rounded-xl py-3 px-4 text-2xl font-headline font-bold text-ink focus:outline-none focus:border-primary/50"
          />
        </label>
        <button
          onClick={pay}
          disabled={!(cents > 0) || saving}
          className="w-full py-3.5 rounded-xl bg-cta-alt text-on-secondary font-bold glow-secondary disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Registrar pago {cents > 0 && formatCents(cents)}
        </button>
      </div>
    </Modal>
  );
}
