import { useState } from 'react';
import { ChevronRight, Landmark, PiggyBank, Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Field, Segmented, SubmitButton } from '../ui/Field';
import { api } from '../../lib/api';
import { confirm, notifyError, toast } from '../../lib/dialogs';
import { formatCents } from '../../lib/format';
import type { Account } from '../../lib/types';
import { useFinanceStore } from '../../store/finance';

type Kind = 'DEBIT' | 'SAVINGS';
const KIND_LABEL: Record<Kind, string> = { DEBIT: 'Débito', SAVINGS: 'Ahorro' };

/** Debit and savings accounts: add, rename and deactivate. */
export function AccountsSection() {
  const { accounts, savings } = useFinanceStore();
  const [editing, setEditing] = useState<Account | null>(null);
  const [adding, setAdding] = useState(false);
  const list = (accounts ?? []).filter(a => a.kind !== 'CREDIT_CARD');
  const saved = new Map(savings?.accounts.map(a => [a.id, a.totalCents]) ?? []);

  return (
    <section className="space-y-3">
      <h2 className="font-label text-ink/50 text-xs uppercase tracking-wider flex items-center gap-2">
        <PiggyBank className="w-4 h-4" /> Débito y ahorro
      </h2>
      <div className="glass-panel divide-y divide-ink/5">
        {list.map(a => (
          <button key={a.id} onClick={() => setEditing(a)} className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-left">
            {a.kind === 'DEBIT' ? <Landmark className="w-4 h-4 text-ink/40" /> : <PiggyBank className="w-4 h-4 text-ink/40" />}
            <span className="flex-1 min-w-0 truncate">{a.name}</span>
            {a.kind === 'SAVINGS' && <span className="font-mono text-ink/60">{formatCents(saved.get(a.id) ?? 0)}</span>}
            <span className="text-xs text-ink/40">{KIND_LABEL[a.kind as Kind]}</span>
            <ChevronRight className="w-4 h-4 text-ink/30" />
          </button>
        ))}
        <button onClick={() => setAdding(true)} className="w-full p-3 flex items-center justify-center gap-2 text-primary text-sm font-bold">
          <Plus className="w-4 h-4" /> Agregar cuenta
        </button>
      </div>
      {editing && <AccountModal account={editing} onClose={() => setEditing(null)} />}
      {adding && <AccountModal onClose={() => setAdding(false)} />}
    </section>
  );
}

function AccountModal({ account, onClose }: { account?: Account; onClose: () => void }) {
  const load = useFinanceStore(s => s.load);
  const [name, setName] = useState(account?.name ?? '');
  const [kind, setKind] = useState<Kind>((account?.kind as Kind) ?? 'DEBIT');
  const [busy, setBusy] = useState(false);
  const valid = name.trim().length > 0 && name.trim() !== account?.name;

  const save = async () => {
    setBusy(true);
    try {
      if (account) await api.patch(`/accounts/${account.id}`, { name: name.trim() });
      else await api.post('/accounts', { name: name.trim(), kind });
      toast.success(name.trim(), account ? 'Cuenta actualizada' : 'Cuenta agregada');
      onClose();
      void load();
    } catch (err) {
      notifyError(err);
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!account) return;
    const ok = await confirm({
      title: 'Dar de baja la cuenta',
      message: `${account.name} deja de aparecer en la captura. Sus movimientos se conservan.`,
      confirmLabel: 'Dar de baja',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/accounts/${account.id}`);
      onClose();
      void load();
    } catch (err) {
      notifyError(err, 'No se dio de baja');
    }
  };

  return (
    <Modal title={account ? account.name : 'Nueva cuenta'} onClose={onClose}>
      <div className="space-y-4">
        {!account && (
          <Segmented value={kind} onChange={setKind} options={[{ value: 'DEBIT', label: 'Débito' }, { value: 'SAVINGS', label: 'Ahorro' }]} />
        )}
        <Field label="Nombre" value={name} onChange={e => setName(e.target.value)} placeholder="BBVA Débito" maxLength={60} />
        <SubmitButton onClick={save} disabled={!valid} busy={busy}>{account ? 'Guardar nombre' : 'Agregar cuenta'}</SubmitButton>
        {account && (
          <button onClick={remove} className="w-full py-2.5 rounded-xl text-error font-bold bg-error/10">Dar de baja</button>
        )}
      </div>
    </Modal>
  );
}
