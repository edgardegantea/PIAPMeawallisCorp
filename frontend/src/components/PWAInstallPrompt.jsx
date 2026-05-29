import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

/**
 * Shows a bottom banner prompting the user to install the PWA.
 * Listens for the browser's `beforeinstallprompt` event.
 * Dismissed state is stored in localStorage for 7 days.
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed && Date.now() - Number(dismissed) < 7 * 86_400_000) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm
      bg-slate-900 dark:bg-slate-700 text-white rounded-2xl shadow-2xl px-4 py-3
      flex items-center gap-3 animate-in slide-in-from-bottom-4">
      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
        <Download size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Instalar la app</p>
        <p className="text-xs text-slate-400">Accede sin conexión desde tu dispositivo</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleInstall}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
