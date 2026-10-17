import { CloudOff, RefreshCw } from 'lucide-react';
import { getApiUrl } from '../lib/server';

/** The office PC didn't answer: retry, or go to the login to change the server. */
export function UnreachableScreen({ onRetry, onLogin }: { onRetry: () => void; onLogin: () => void }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4">
      <div className="glass-panel p-6 sm:p-8 w-full max-w-md text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-warning/10 border border-warning/30 flex items-center justify-center">
          <CloudOff className="w-8 h-8 text-warning" />
        </div>
        <div className="space-y-2">
          <h1 className="font-headline text-2xl font-bold">No llego a tu PC</h1>
          <p className="text-sm text-ink/60">Revisa que Tailscale esté encendido en este dispositivo y que la PC de oficina esté prendida.</p>
          <p className="text-xs text-ink/40 break-all">{getApiUrl()}</p>
        </div>
        <button onClick={onRetry} className="w-full py-3.5 rounded-xl bg-cta text-on-primary font-bold glow-primary flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
        <button onClick={onLogin} className="text-sm text-ink/50 hover:text-primary">
          Cambiar servidor o entrar con contraseña
        </button>
      </div>
    </div>
  );
}
