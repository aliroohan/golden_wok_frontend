'use client';
import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getPendingCount } from '@/lib/sync';

export default function SyncBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const update = async () => {
      setOnline(navigator.onLine);
      setPending(await getPendingCount());
    };
    update();
    const interval = setInterval(update, 5000);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div id="sync-banner" style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      background: online ? '#0a2e0a' : '#2e0a0a',
      border: `1px solid ${online ? '#1a5e1a' : '#5e1a1a'}`,
      borderRadius: 8, padding: '0.4rem 0.8rem', fontSize: '0.8rem',
      color: online ? '#2ecc71' : '#e74c3c',
    }}>
      {online ? <Wifi size={14} /> : <WifiOff size={14} />}
      {online
        ? `Syncing ${pending} order${pending !== 1 ? 's' : ''}…`
        : `Offline${pending > 0 ? ` — ${pending} order${pending !== 1 ? 's' : ''} pending sync` : ''}`}
    </div>
  );
}
