import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field, Segmented, SelectField, SubmitButton } from '../ui/Field';
import { api } from '../../lib/api';
import { notifyError, toast } from '../../lib/dialogs';
import { formatCents, parseCents, shortDay } from '../../lib/format';
import type { CreatedTransaction, Transaction } from '../../lib/types';
import { unwrap } from '../../lib/unwrap';
import { useFinanceStore } from '../../store/finance';

/**
 * Fixes a capture (amount, date, account, description…) instead of deleting
 * it and capturing it again. A card payment keeps its card and stays positive.
 */
export function EditTransactionModal({ transaction, onClose, onSaved }: {
  transaction: Transaction;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { accounts, load } = useFinanceStore();
  const isPayment = transaction.paysCutDate !== null;
  const [kind, setKind] = useState<'gasto' | 'ingreso'>(transaction.amountCents < 0 ? 'gasto' : 'ingreso');
  const [amount, setAmount] = useState((Math.abs(transaction.amountCents) / 100).toFixed(2));
  const [date, setDate] = useState(transaction.date);
  const [accountId, setAccountId] = useState(String(transaction.accountId));
  const [description, setDescription] = useState(transaction.description);
  const [category, setCategory] = useState(transaction.category ?? '');
  const [note, setNote] = useState(transaction.note ?? '');
  const [saving, setSaving] = useState(false);
  const cents = parseCents(amount);

  const choices = (accounts ?? []).filter(a => a.kind !== 'SAVINGS' || a.id === transaction.accountId);

  const save = async () => {
    if (!(cents > 0)) return;
    setSaving(true);
    try {
      const res = await api.patch(`/transactions/${transaction.id}`, {
        amountCents: kind === 'gasto' && !isPayment ? -cents : cents,
        date,
        ...(!isPayment && { accountId: Number(accountId) }),
        description: description.trim(),
        category: category.trim(),
        note: note.trim(),
      });
      const updated = unwrap<CreatedTransaction>(res);
      toast.success(
        updated.statement ? `Queda en el corte del ${shortDay(updated.statement.cutDate)}` : updated.account?.name ?? '',
        `${formatCents(cents)} corregido`,
      );
      onSaved?.();
      onClose();
      void load();
    } catch (err) {
      notifyError(err, 'No se guardó el cambio');
      setSaving(false);
    }
  };

  return (
    <Modal title={isPayment ? 'Corregir pago' : 'Corregir movimiento'} onClose={onClose}>
      <div className="space-y-4">
        {!isPayment && (
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { value: 'gasto', label: 'Gasto' },
              { value: 'ingreso', label: 'Ingreso' },
            ]}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
          <Field label="Fecha" type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} />
        </div>
        {isPayment ? (
          <p className="text-sm text-ink/60">
            {transaction.account?.name} · paga el corte del {shortDay(transaction.paysCutDate!)}
          </p>
        ) : (
          <SelectField
            label="Cuenta"
            value={accountId}
            onChange={setAccountId}
            options={choices.map(a => ({ value: String(a.id), label: a.name }))}
          />
        )}
        <Field label="Descripción" value={description} maxLength={120} onChange={e => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría" value={category} maxLength={40} onChange={e => setCategory(e.target.value)} />
          <Field label="Nota" value={note} maxLength={300} onChange={e => setNote(e.target.value)} />
        </div>
        <SubmitButton onClick={save} disabled={!(cents > 0)} busy={saving}>
          Guardar cambios
        </SubmitButton>
      </div>
    </Modal>
  );
}
