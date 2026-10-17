import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ThemePicker } from './components/ui/ThemePicker';
import { DialogHost } from './components/ui/DialogHost';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { useAuthStore } from './store/auth';
import { openSession } from './lib/auth';
import { startOfflineSync } from './lib/offline';
import { useFinanceStore } from './store/finance';

function App() {
  const accessToken = useAuthStore(state => state.accessToken);
  const [showThemes, setShowThemes] = useState(false);
  const openThemes = () => setShowThemes(true);
  // Without a session, first try to enter without a password; the login
  // screen only shows if the server asks for one or can't be reached
  const [opening, setOpening] = useState(!accessToken);

  // Sends captures made while the PC was off as soon as it answers again
  useEffect(() => (accessToken ? startOfflineSync(() => void useFinanceStore.getState().load()) : undefined), [accessToken]);

  useEffect(() => {
    if (accessToken) return;
    let active = true;
    openSession()
      .catch(() => false)
      .finally(() => active && setOpening(false));
    return () => {
      active = false;
    };
  }, [accessToken]);

  return (
    <>
      {accessToken ? (
        <HomePage onOpenThemes={openThemes} />
      ) : opening ? (
        <div className="min-h-[100dvh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <LoginPage onOpenThemes={openThemes} />
      )}
      {showThemes && <ThemePicker onClose={() => setShowThemes(false)} />}
      <DialogHost />
    </>
  );
}

export default App;
