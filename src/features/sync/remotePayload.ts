import type { EntityName } from '../../types/domain';

const LOCAL_ONLY_FIELDS = new Set([
  'sync_status',
  'last_synced_at',
  'options_json',
  'value_json',
  'school_name',
  'class_name',
  'class_section',
  'academic_year_name',
  'custom_values',
]);

export function sanitizeRemotePayload(
  _entity: EntityName,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !LOCAL_ONLY_FIELDS.has(key)));
}
