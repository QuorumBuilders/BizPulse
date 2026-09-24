'use client';

import { useSyncStatus } from '@/state/useSyncStatus';

const STATUS_LABELS: Record<string, string> = {
  idle: 'Synced',
  syncing: 'Syncing…',
  success: 'Synced',
  error: 'Sync failed',
  offline: 'Offline',
};

export default function SyncIndicator() {
  const status = useSyncStatus();
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Sync status: ${STATUS_LABELS[status]}`}
      title={STATUS_LABELS[status]}
    >
      <span className={`sync-dot sync-dot--${status}`} />
      <span className="text-xs text-muted">{STATUS_LABELS[status]}</span>
    </div>
  );
}
