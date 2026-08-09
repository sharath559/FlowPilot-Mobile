import { isSupabaseConfigured, supabase } from '../../services/supabaseClient';
import type { EntityName, SyncQueueItem } from '../../types/domain';
import { listSyncQueue, markEntitySynced, markQueueItemSynced, updateQueueItemStatus } from '../../database/repositories';
import { shouldRetryQueueItem } from './retryPolicy';
import { sanitizeRemotePayload } from './remotePayload';

export type SyncRunResult = {
  processed: number;
  succeeded: number;
  failed: number;
  deferred: number;
  skipped: boolean;
  errors: string[];
  message: string;
};

const ENTITY_PRIORITY: Record<EntityName, number> = {
  organizations: 0,
  schools: 1,
  academic_years: 2,
  classes: 3,
  student_field_definitions: 4,
  students: 5,
  student_field_values: 6,
};

function remoteTableFor(entity: EntityName): string {
  return entity;
}

async function pushQueueItem(item: SyncQueueItem): Promise<void> {
  const table = remoteTableFor(item.entity);

  if (item.operation === 'DELETE') {
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: item.payload.deleted_at, updated_at: item.payload.updated_at })
      .eq('id', item.entity_id);
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
    return;
  }

  const payload = sanitizeRemotePayload(item.entity, item.payload);
  const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

export async function processSyncQueue(): Promise<SyncRunResult> {
  if (!isSupabaseConfigured) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      deferred: 0,
      skipped: true,
      errors: [],
      message: 'Supabase is not configured. Local records are safely queued on this device.',
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      deferred: 0,
      skipped: true,
      errors: [sessionError.message],
      message: `Supabase session error: ${sessionError.message}`,
    };
  }

  if (!sessionData.session) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      deferred: 0,
      skipped: true,
      errors: [],
      message: 'Sign in to FlowPilot before syncing records to Supabase.',
    };
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', sessionData.session.user.id)
    .limit(1);
  if (membershipError) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      deferred: 0,
      skipped: true,
      errors: [membershipError.message],
      message: `Could not verify your school access: ${membershipError.message}`,
    };
  }

  if (!memberships?.length) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      deferred: 0,
      skipped: true,
      errors: [],
      message: 'Your account is signed in but is not assigned to an organization. Add its organization membership in Supabase.',
    };
  }

  const queuedItems = await listSyncQueue(['PENDING', 'FAILED']);
  const blockedStudentIds = new Set(
    queuedItems
      .filter((item) => item.entity === 'students' && !shouldRetryQueueItem(item))
      .map((item) => item.entity_id),
  );
  const items = queuedItems
    .filter(shouldRetryQueueItem)
    .sort((left, right) => ENTITY_PRIORITY[left.entity] - ENTITY_PRIORITY[right.entity] || left.id - right.id);
  const result: SyncRunResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    deferred: 0,
    skipped: false,
    errors: [],
    message: '',
  };

  for (const item of items) {
    const parentStudentId =
      item.entity === 'student_field_values' && typeof item.payload.student_id === 'string'
        ? item.payload.student_id
        : null;
    if (parentStudentId && blockedStudentIds.has(parentStudentId)) {
      result.deferred += 1;
      continue;
    }

    result.processed += 1;
    await updateQueueItemStatus(item.id, 'SYNCING');

    try {
      await pushQueueItem(item);
      await markQueueItemSynced(item.id);
      await markEntitySynced(item.entity, item.entity_id);
      result.succeeded += 1;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.failed += 1;
      result.errors.push(errorMessage);
      if (item.entity === 'students') {
        blockedStudentIds.add(item.entity_id);
      }
      await updateQueueItemStatus(item.id, 'FAILED', errorMessage);
    }
  }

  if (!queuedItems.length) {
    result.message = 'Everything is up to date.';
  } else if (!items.length) {
    result.message = 'Queued rows reached the retry limit. Tap Retry failed, then Sync now.';
  } else if (result.failed) {
    const deferredMessage = result.deferred ? ` ${result.deferred} dependent rows were deferred.` : '';
    result.message = `${result.succeeded} synced, ${result.failed} failed.${deferredMessage} ${result.errors[0]}`;
  } else {
    const deferredMessage = result.deferred ? ` ${result.deferred} rows remain deferred.` : '';
    result.message = `${result.succeeded} ${result.succeeded === 1 ? 'row' : 'rows'} synced successfully.${deferredMessage}`;
  }

  return result;
}
