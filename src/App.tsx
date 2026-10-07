import { useState } from 'react';
import { ThemePicker } from './components/ui/ThemePicker';
import { DialogHost } from './components/ui/DialogHost';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { useAuthStore } from './store/auth';

function App() {
  const accessToken = useAuthStore(state => state.accessToken);
  const [showThemes, setShowThemes] = useState(false);
  const openThemes = () => setShowThemes(true);

  return (
    <>
      {accessToken ? <HomePage onOpenThemes={openThemes} /> : <LoginPage onOpenThemes={openThemes} />}
      {showThemes && <ThemePicker onClose={() => setShowThemes(false)} />}
      <DialogHost />
    </>
  );
}

export default App;
