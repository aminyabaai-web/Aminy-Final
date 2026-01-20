import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-3"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2 max-w-4xl mx-auto">
        <WifiOff className="w-5 h-5 text-amber-600" />
        <p className="text-sm font-medium text-amber-900">
          You're offline. Some features may be unavailable.
        </p>
      </div>
    </div>
  );
}
