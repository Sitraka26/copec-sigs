import { useEffect, useState } from 'react';

export default function IndicateurReseau() {
  const [enLigne, setEnLigne] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setEnLigne(true);
    }
    function handleOffline() {
      setEnLigne(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg transition-all ${
        enLigne
          ? 'bg-emerald-600 text-white'
          : 'bg-red-600 text-white'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          enLigne ? 'bg-emerald-300' : 'bg-red-300'
        }`}
      />
      {enLigne ? 'En ligne' : 'Hors ligne'}
    </div>
  );
}