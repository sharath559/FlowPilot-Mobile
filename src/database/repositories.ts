import type {
  AcademicYear,
  DashboardStats,
  EntityName,
  School,
  SchoolClass,
  Student,
  StudentFieldDefinition,
  StudentFieldValue,
  StudentFilters,
  StudentFormInput,
  StudentWithRelations,
  SyncOperation,
  SyncQueueItem,
  SyncStatus,
  SyncSummary,
} from '../types/domain';
import { nowIso, todayDate } from '../utils/dates';
import { createUuid } from '../utils/id';
import { classSchema, fieldDefinitionSchema, schoolSchema, studentSchema } from '../validation/schemas';
import { DEMO_ORGANIZATION_ID, DEMO_YEAR_ID } from './seed';
import { getDatabase, type AppDatabase } from './sqlite';

type Row = Record<string, unknown>;

const SYNCABLE_ENTITIES: EntityName[] = [
  'organizations',
  'schools',
  'academic_years',
  'classes',
  'students',
  'student_field_definitions',
  'student_field_values',
];

function nullable(value: unknown): string | number | null {
  return value === undefined ? null : (value as string | number | null);
}

function toBoolean(value: unknown): boolean {
  return value === true || value === 1;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || value.length === 0) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function mapSchool(row: Row): School {
  return row as School;
}

function mapAcademicYear(row: Row): AcademicYear {
  return { ...(row as AcademicYear), is_active: toBoolean(row.is_active) };
}

function mapClass(row: Row): SchoolClass {
  return row as SchoolClass;
}

function mapFieldDefinition(row: Row): StudentFieldDefinition {
  return {
    ...(row as StudentFieldDefinition),
    is_required: toBoolean(row.is_required),
    is_active: toBoolean(row.is_active),
    options: parseJson<string[] | null>(row.options_json, null),
  };
}

function mapStudent(row: Row): StudentWithRelations {
  return {
    ...(row as Student),
    school_name: (row.school_name as string | null) ?? null,
    class_name: (row.class_name as string | null) ?? null,
    class_section: (row.class_section as string | null) ?? null,
    academic_year_name: (row.academic_year_name as string | null) ?? null,
    custom_values: {},
  };
}

function mapFieldValue(row: Row): StudentFieldValue {
  return {
    ...(row as StudentFieldValue),
    value: parseJson(row.value_json, null),
  };
}

function mapQueueItem(row: Row): SyncQueueItem {
  return {
    id: Number(row.id),
    entity: row.entity as EntityName,
    entity_id: String(row.entity_id),
    operation: row.operation as SyncOperation,
    payload: parseJson<Record<string, unknown>>(row.payload, {}),
    status: row.status as SyncStatus,
    retry_count: Number(row.retry_count ?? 0),
    last_error: (row.last_error as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function cleanForRemote(row: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...row };
  delete copy.sync_status;
  delete copy.last_synced_at;
  delete copy.options_json;
  delete copy.value_json;
  delete copy.school_name;
  delete copy.class_name;
  delete copy.class_section;
  delete copy.academic_year_name;
  delete copy.custom_values;
  return copy;
}

export async function initializeDataStore(): Promise<void> {
  await getDatabase();
}

export async function listSchools(): Promise<School[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Row>(
    `SELECT * FROM schools WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE`,
  );
  return rows.map(mapSchool);
}

export async function listAcademicYears(schoolId?: string): Promise<AcademicYear[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Row>(
    `SELECT * FROM academic_years
     WHERE deleted_at IS NULL AND (? IS NULL OR school_id = ?)
     ORDER BY is_active DESC, name DESC`,
    [schoolId ?? null, schoolId ?? null],
  );
  return rows.map(mapAcademicYear);
}

export async function listClasses(schoolId?: string): Promise<SchoolClass[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Row>(
    `SELECT * FROM classes
     WHERE deleted_at IS NULL AND (? IS NULL OR school_id = ?)
     ORDER BY name COLLATE NOCASE, section COLLATE NOCASE`,
    [schoolId ?? null, schoolId ?? null],
  );
  return rows.map(mapClass);
}

export async function listFieldDefinitions(schoolId?: string, includeInactive = false): Promise<StudentFieldDefinition[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Row>(
    `SELECT * FROM student_field_definitions
     WHERE deleted_at IS NULL
       AND (? IS NULL OR school_id = ?)
       AND (? = 1 OR is_active = 1)
     ORDER BY display_order ASC, label COLLATE NOCASE`,
    [schoolId ?? null, schoolId ?? null, includeInactive ? 1 : 0],
  );
  return rows.map(mapFieldDefinition);
}

export async function upsertSchool(values: unknown): Promise<School> {
  const parsed = schoolSchema.parse(values);
  const database = await getDatabase();
  const now = nowIso();
  const id = typeof (values as { id?: unknown }).id === 'string' ? (values as { id: string }).id : createUuid();
  const existing = await database.getFirstAsync<Row>('SELECT * FROM schools WHERE id = ?', [id]);
  const operation: SyncOperation = existing ? 'UPDATE' : 'CREATE';
  const createdAt = typeof existing?.created_at === 'string' ? existing.created_at : now;

  await database.runAsync(
    `INSERT INTO schools
      (id, organization_id, name, school_type, school_code, address_line_1, address_line_2, city, district, state, postal_code, country, phone, email, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
     ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      school_type = excluded.school_type,
      school_code = excluded.school_code,
      address_line_1 = excluded.address_line_1,
      address_line_2 = excluded.address_line_2,
      city = excluded.city,
      district = excluded.district,
      state = excluded.state,
      postal_code = excluded.postal_code,
      country = excluded.country,
      phone = excluded.phone,
      email = excluded.email,
      updated_at = excluded.updated_at,
      sync_status = 'PENDING'`,
    [
      id,
      DEMO_ORGANIZATION_ID,
      parsed.name,
      parsed.school_type,
      parsed.school_code,
      parsed.address_line_1,
      parsed.address_line_2,
      parsed.city,
      parsed.district,
      parsed.state,
      parsed.postal_code,
      parsed.country,
      parsed.phone,
      parsed.email,
      createdAt,
      now,
    ],
  );

  const school = (await database.getFirstAsync<Row>('SELECT * FROM schools WHERE id = ?', [id]))!;
  await enqueueSync(database, 'schools', id, operation, cleanForRemote(mapSchool(school)));
  return mapSchool(school);
}

export async function upsertClass(values: unknown): Promise<SchoolClass> {
  const parsed = classSchema.parse(values);
  const database = await getDatabase();
  const now = nowIso();
  const id = typeof (values as { id?: unknown }).id === 'string' ? (values as { id: string }).id : createUuid();
  const existing = await database.getFirstAsync<Row>('SELECT * FROM classes WHERE id = ?', [id]);
  const operation: SyncOperation = existing ? 'UPDATE' : 'CREATE';
  const createdAt = typeof existing?.created_at === 'string' ? existing.created_at : now;

  await database.runAsync(
    `INSERT INTO classes
      (id, school_id, academic_year_id, name, section, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
     ON CONFLICT(id) DO UPDATE SET
      school_id = excluded.school_id,
      academic_year_id = excluded.academic_year_id,
      name = excluded.name,
      section = excluded.section,
      updated_at = excluded.updated_at,
      sync_status = 'PENDING'`,
    [id, parsed.school_id, parsed.academic_year_id, parsed.name, parsed.section, createdAt, now],
  );

  const row = (await database.getFirstAsync<Row>('SELECT * FROM classes WHERE id = ?', [id]))!;
  await enqueueSync(database, 'classes', id, operation, cleanForRemote(mapClass(row)));
  return mapClass(row);
}

export async function upsertAcademicYear(input: {
  id?: string;
  school_id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}): Promise<AcademicYear> {
  const database = await getDatabase();
  const now = nowIso();
  const id = input.id ?? createUuid();
  const existing = await database.getFirstAsync<Row>('SELECT * FROM academic_years WHERE id = ?', [id]);
  const operation: SyncOperation = existing ? 'UPDATE' : 'CREATE';
  const createdAt = typeof existing?.created_at === 'string' ? existing.created_at : now;

  await database.runAsync(
    `INSERT INTO academic_years
      (id, school_id, name, start_date, end_date, is_active, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
     ON CONFLICT(id) DO UPDATE SET
      school_id = excluded.school_id,
      name = excluded.name,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      is_active = excluded.is_active,
      updated_at = excluded.updated_at,
      sync_status = 'PENDING'`,
    [
      id,
      input.school_id,
      input.name.trim(),
      input.start_date ?? null,
      input.end_date ?? null,
      input.is_active ? 1 : 0,
      createdAt,
      now,
    ],
  );

  const row = (await database.getFirstAsync<Row>('SELECT * FROM academic_years WHERE id = ?', [id]))!;
  await enqueueSync(database, 'academic_years', id, operation, cleanForRemote(mapAcademicYear(row)));
  return mapAcademicYear(row);
}

export async function upsertFieldDefinition(values: unknown): Promise<StudentFieldDefinition> {
  const parsed = fieldDefinitionSchema.parse(values);
  const database = await getDatabase();
  const now = nowIso();
  const id = typeof (values as { id?: unknown }).id === 'string' ? (values as { id: string }).id : createUuid();
  const existing = await database.getFirstAsync<Row>('SELECT * FROM student_field_definitions WHERE id = ?', [id]);
  const operation: SyncOperation = existing ? 'UPDATE' : 'CREATE';
  const createdAt = typeof existing?.created_at === 'string' ? existing.created_at : now;

  await database.runAsync(
    `INSERT INTO student_field_definitions
      (id, school_id, field_key, label, field_type, is_required, display_order, is_active, placeholder, help_text, options_json, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
     ON CONFLICT(id) DO UPDATE SET
      school_id = excluded.school_id,
      field_key = excluded.field_key,
      label = excluded.label,
      field_type = excluded.field_type,
      is_required = excluded.is_required,
      display_order = excluded.display_order,
      is_active = excluded.is_active,
      placeholder = excluded.placeholder,
      help_text = excluded.help_text,
      options_json = excluded.options_json,
      updated_at = excluded.updated_at,
      sync_status = 'PENDING'`,
    [
      id,
      parsed.school_id,
      parsed.field_key,
      parsed.label,
      parsed.field_type,
      parsed.is_required ? 1 : 0,
      parsed.display_order,
      parsed.is_active ? 1 : 0,
      parsed.placeholder,
      parsed.help_text,
      stringifyJson(parsed.options ?? null),
      createdAt,
      now,
    ],
  );

  const row = (await database.getFirstAsync<Row>('SELECT * FROM student_field_definitions WHERE id = ?', [id]))!;
  const field = mapFieldDefinition(row);
  await enqueueSync(database, 'student_field_definitions', id, operation, {
    ...cleanForRemote(field as unknown as Record<string, unknown>),
    options: field.options,
  });
  return field;
}

export async function saveStudent(input: StudentFormInput): Promise<StudentWithRelations> {
  const parsed = studentSchema.parse(input);
  const database = await getDatabase();
  const now = nowIso();
  const id = parsed.id ?? createUuid();
  const existing = await database.getFirstAsync<Row>('SELECT * FROM students WHERE id = ?', [id]);
  const operation: SyncOperation = existing ? 'UPDATE' : 'CREATE';
  const createdAt = typeof existing?.created_at === 'string' ? existing.created_at : now;
  const organizationId = parsed.organization_id ?? DEMO_ORGANIZATION_ID;
  const recordDate = parsed.record_date || todayDate();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO students
        (id, organization_id, school_id, class_id, academic_year_id, student_number, first_name, middle_name, last_name, preferred_name, date_of_birth, age, gender, email, phone, guardian_name, guardian_phone, address, photo_local_path, record_date, notes, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
       ON CONFLICT(id) DO UPDATE SET
        organization_id = excluded.organization_id,
        school_id = excluded.school_id,
        class_id = excluded.class_id,
        academic_year_id = excluded.academic_year_id,
        student_number = excluded.student_number,
        first_name = excluded.first_name,
        middle_name = excluded.middle_name,
        last_name = excluded.last_name,
        preferred_name = excluded.preferred_name,
        date_of_birth = excluded.date_of_birth,
        age = excluded.age,
        gender = excluded.gender,
        email = excluded.email,
        phone = excluded.phone,
        guardian_name = excluded.guardian_name,
        guardian_phone = excluded.guardian_phone,
        address = excluded.address,
        photo_local_path = excluded.photo_local_path,
        record_date = excluded.record_date,
        notes = excluded.notes,
        updated_at = excluded.updated_at,
        deleted_at = NULL,
        sync_status = 'PENDING'`,
      [
        id,
        organizationId,
        parsed.school_id,
        parsed.class_id ?? null,
        parsed.academic_year_id ?? DEMO_YEAR_ID,
        parsed.student_number,
        parsed.first_name,
        parsed.middle_name,
        parsed.last_name,
        parsed.preferred_name,
        parsed.date_of_birth,
        nullable(parsed.age),
        parsed.gender,
        parsed.email,
        parsed.phone,
        parsed.guardian_name,
        parsed.guardian_phone,
        parsed.address,
        parsed.photo_local_path,
        recordDate,
        parsed.notes,
        createdAt,
        now,
      ],
    );

    const fieldDefinitions = await listFieldDefinitions(parsed.school_id, true);
    for (const definition of fieldDefinitions) {
      const customValue = parsed.custom_values?.[definition.field_key];
      const valueExists = await database.getFirstAsync<Row>(
        'SELECT id, created_at FROM student_field_values WHERE student_id = ? AND field_definition_id = ?',
        [id, definition.id],
      );
      const valueId = typeof valueExists?.id === 'string' ? valueExists.id : createUuid();
      const valueCreatedAt = typeof valueExists?.created_at === 'string' ? valueExists.created_at : now;
      await database.runAsync(
        `INSERT INTO student_field_values
          (id, student_id, field_definition_id, value_json, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
         ON CONFLICT(id) DO UPDATE SET
          value_json = excluded.value_json,
          updated_at = excluded.updated_at,
          deleted_at = NULL,
          sync_status = 'PENDING'`,
        [valueId, id, definition.id, stringifyJson(customValue ?? null), valueCreatedAt, now],
      );
    }
  });

  const student = (await getStudentById(id))!;
  await enqueueSync(database, 'students', id, operation, cleanForRemote(student as unknown as Record<string, unknown>));

  const customValues = await listFieldValues(id);
  for (const fieldValue of customValues) {
    await enqueueSync(database, 'student_field_values', fieldValue.id, operation, {
      id: fieldValue.id,
      student_id: fieldValue.student_id,
      field_definition_id: fieldValue.field_definition_id,
      value: fieldValue.value,
      created_at: fieldValue.created_at,
      updated_at: fieldValue.updated_at,
      deleted_at: fieldValue.deleted_at ?? null,
    });
  }

  return student;
}

export async function listStudents(filters: StudentFilters = {}): Promise<StudentWithRelations[]> {
  const database = await getDatabase();
  const searchTerm = filters.search ? `%${filters.search.trim()}%` : null;
  const rows = await database.getAllAsync<Row>(
    `SELECT students.*,
      schools.name AS school_name,
      classes.name AS class_name,
      classes.section AS class_section,
      academic_years.name AS academic_year_name
     FROM students
     LEFT JOIN schools ON schools.id = students.school_id
     LEFT JOIN classes ON classes.id = students.class_id
     LEFT JOIN academic_years ON academic_years.id = students.academic_year_id
     WHERE students.deleted_at IS NULL
       AND (? IS NULL OR students.school_id = ?)
       AND (? IS NULL OR students.academic_year_id = ?)
       AND (? IS NULL OR students.class_id = ?)
       AND (? IS NULL OR students.record_date = ?)
       AND (
        ? IS NULL
        OR students.first_name LIKE ?
        OR students.last_name LIKE ?
        OR students.student_number LIKE ?
        OR students.guardian_name LIKE ?
       )
     ORDER BY students.updated_at DESC`,
    [
      filters.schoolId ?? null,
      filters.schoolId ?? null,
      filters.academicYearId ?? null,
      filters.academicYearId ?? null,
      filters.classId ?? null,
      filters.classId ?? null,
      filters.recordDate ?? null,
      filters.recordDate ?? null,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
    ],
  );

  const students = rows.map(mapStudent);
  for (const student of students) {
    student.custom_values = await getStudentCustomValues(student.id);
  }
  return students;
}

export async function getStudentById(id: string): Promise<StudentWithRelations | null> {
  const students = await listStudents({});
  return students.find((student) => student.id === id) ?? null;
}

export async function deleteStudent(id: string): Promise<void> {
  const database = await getDatabase();
  const now = nowIso();
  await database.runAsync(
    `UPDATE students
     SET deleted_at = ?, updated_at = ?, sync_status = 'PENDING'
     WHERE id = ?`,
    [now, now, id],
  );
  await enqueueSync(database, 'students', id, 'DELETE', { id, deleted_at: now, updated_at: now });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const database = await getDatabase();
  const date = todayDate();
  const row = await database.getFirstAsync<{
    studentsToday: number;
    totalStudents: number;
    pendingSync: number;
    failedSync: number;
    classes: number;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM students WHERE deleted_at IS NULL AND record_date = ?) AS studentsToday,
      (SELECT COUNT(*) FROM students WHERE deleted_at IS NULL) AS totalStudents,
      (SELECT COUNT(*) FROM sync_queue WHERE status IN ('PENDING','SYNCING')) AS pendingSync,
      (SELECT COUNT(*) FROM sync_queue WHERE status = 'FAILED') AS failedSync,
      (SELECT COUNT(*) FROM classes WHERE deleted_at IS NULL) AS classes`,
    [date],
  );

  return {
    studentsToday: Number(row?.studentsToday ?? 0),
    totalStudents: Number(row?.totalStudents ?? 0),
    pendingSync: Number(row?.pendingSync ?? 0),
    failedSync: Number(row?.failedSync ?? 0),
    classes: Number(row?.classes ?? 0),
  };
}

export async function listFieldValues(studentId: string): Promise<StudentFieldValue[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Row>(
    'SELECT * FROM student_field_values WHERE student_id = ? AND deleted_at IS NULL',
    [studentId],
  );
  return rows.map(mapFieldValue);
}

export async function getStudentCustomValues(studentId: string): Promise<Record<string, unknown>> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Row>(
    `SELECT student_field_definitions.field_key, student_field_values.value_json
     FROM student_field_values
     JOIN student_field_definitions ON student_field_definitions.id = student_field_values.field_definition_id
     WHERE student_field_values.student_id = ?
       AND student_field_values.deleted_at IS NULL`,
    [studentId],
  );

  return rows.reduce<Record<string, unknown>>((values, row) => {
    values[String(row.field_key)] = parseJson(row.value_json, null);
    return values;
  }, {});
}

export async function enqueueSync(
  database: AppDatabase,
  entity: EntityName,
  entityId: string,
  operation: SyncOperation,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!SYNCABLE_ENTITIES.includes(entity)) {
    return;
  }

  const now = nowIso();
  const existing = await database.getFirstAsync<{ id: number; operation: SyncOperation }>(
    `SELECT id, operation
     FROM sync_queue
     WHERE entity = ? AND entity_id = ? AND status IN ('PENDING', 'FAILED')
     ORDER BY id ASC
     LIMIT 1`,
    [entity, entityId],
  );

  if (existing) {
    const nextOperation = existing.operation === 'CREATE' && operation === 'UPDATE' ? 'CREATE' : operation;
    await database.runAsync(
      `UPDATE sync_queue
       SET operation = ?, payload = ?, status = 'PENDING', retry_count = 0, last_error = NULL, updated_at = ?
       WHERE id = ?`,
      [nextOperation, JSON.stringify(payload), now, existing.id],
    );
    await database.runAsync(
      `DELETE FROM sync_queue
       WHERE entity = ? AND entity_id = ? AND status IN ('PENDING', 'FAILED') AND id <> ?`,
      [entity, entityId, existing.id],
    );
    return;
  }

  await database.runAsync(
    `INSERT INTO sync_queue (entity, entity_id, operation, payload, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'PENDING', ?, ?)`,
    [entity, entityId, operation, JSON.stringify(payload), now, now],
  );
}

export async function listSyncQueue(statuses: SyncStatus[] = ['PENDING', 'FAILED']): Promise<SyncQueueItem[]> {
  const database = await getDatabase();
  const placeholders = statuses.map(() => '?').join(',');
  const rows = await database.getAllAsync<Row>(
    `SELECT * FROM sync_queue WHERE status IN (${placeholders}) ORDER BY created_at ASC`,
    statuses,
  );
  return rows.map(mapQueueItem);
}

export async function listRecentSyncQueue(limit = 20): Promise<SyncQueueItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<Row>(
    `SELECT * FROM sync_queue ORDER BY created_at DESC LIMIT ?`,
    [limit],
  );
  return rows.map(mapQueueItem);
}

export async function updateQueueItemStatus(
  queueItemId: number,
  status: SyncStatus,
  error?: string | null,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE sync_queue
     SET status = ?, last_error = ?, retry_count = retry_count + CASE WHEN ? = 'FAILED' THEN 1 ELSE 0 END, updated_at = ?
     WHERE id = ?`,
    [status, error ?? null, status, nowIso(), queueItemId],
  );
}

export async function markQueueItemSynced(queueItemId: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE sync_queue
     SET status = 'SYNCED', last_error = NULL, updated_at = ?
     WHERE id = ?`,
    [nowIso(), queueItemId],
  );
}

export async function markEntitySynced(entity: EntityName, entityId: string): Promise<void> {
  if (!SYNCABLE_ENTITIES.includes(entity)) {
    return;
  }

  const database = await getDatabase();
  const now = nowIso();
  await database.runAsync(
    `UPDATE ${entity}
     SET sync_status = 'SYNCED', last_synced_at = ?, updated_at = updated_at
     WHERE id = ?`,
    [now, entityId],
  );
}

export async function retryFailedQueue(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE sync_queue SET status = 'PENDING', retry_count = 0, last_error = NULL, updated_at = ?
     WHERE status = 'FAILED'`,
    [nowIso()],
  );
}

export async function getSyncSummary(): Promise<SyncSummary> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ status: SyncStatus; count: number }>(
    'SELECT status, COUNT(*) AS count FROM sync_queue GROUP BY status',
  );
  const lastRow = await database.getFirstAsync<{ last_synced_at: string | null }>(
    `SELECT MAX(last_synced_at) AS last_synced_at
     FROM (
      SELECT last_synced_at FROM schools
      UNION ALL SELECT last_synced_at FROM academic_years
      UNION ALL SELECT last_synced_at FROM classes
      UNION ALL SELECT last_synced_at FROM students
      UNION ALL SELECT last_synced_at FROM student_field_definitions
      UNION ALL SELECT last_synced_at FROM student_field_values
     )`,
  );
  const summary: SyncSummary = { pending: 0, syncing: 0, synced: 0, failed: 0, lastSyncedAt: lastRow?.last_synced_at };

  rows.forEach((row) => {
    if (row.status === 'PENDING') summary.pending = Number(row.count);
    if (row.status === 'SYNCING') summary.syncing = Number(row.count);
    if (row.status === 'SYNCED') summary.synced = Number(row.count);
    if (row.status === 'FAILED') summary.failed = Number(row.count);
  });

  return summary;
}

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, nowIso()],
  );
}
