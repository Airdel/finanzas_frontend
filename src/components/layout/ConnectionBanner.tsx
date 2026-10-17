import { CloudOff } from 'lucide-react';
import { useConnectionStore } from '../../store/connection';

/** Says when the office PC can't be reached, so a failed save isn't a mystery. */
export function ConnectionBanner() {
  const online = useConnectionStore(state => state.online);
  if (online) return null;
  return (
    <div role="status" className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm border border-warning/30 bg-warning/10 text-ink/80">
      <CloudOff className="w-4 h-4 text-warning shrink-0" />
      <span><b className="text-warning">Sin conexión con el servidor.</b> La PC de oficina no responde; lo que captures ahora no se guarda hasta que vuelva.</span>
    </div>
  );
}
