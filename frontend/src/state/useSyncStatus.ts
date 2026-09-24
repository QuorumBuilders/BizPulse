/**
 * BizPulse — useSyncStatus hook
 *
 * Subscribes to the sync engine's event bus and exposes sync status
 * to the UI (e.g., for the sync indicator in the header).
 */

'use client';

import { useEffect, useState } from 'react';
import { subscribeSyncStatus } from '../data/sync';
import type { SyncStatus } from '../domain/types';

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>('idle');

  useEffect(() => {
    // Set initial status based on network
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('offline');
    }

    const unsubscribe = subscribeSyncStatus((s) => setStatus(s));

    const onOffline = () => setStatus('offline');
    const onOnline = () => setStatus('idle');
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    return () => {
      unsubscribe();
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return status;
}
