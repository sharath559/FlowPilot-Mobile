import type { SyncQueueItem } from '../../types/domain';

export const MAX_SYNC_RETRY_COUNT = 3;

export function shouldRetryQueueItem(item: Pick<SyncQueueItem, 'status' | 'retry_count'>): boolean {
  return (item.status === 'PENDING' || item.status === 'FAILED') && item.retry_count < MAX_SYNC_RETRY_COUNT;
}
