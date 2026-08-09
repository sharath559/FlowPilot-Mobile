import type { AppDatabase } from './sqlite';
import { todayDate } from '../utils/dates';

export const DEMO_ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';
export const DEMO_SCHOOL_ID = '00000000-0000-4000-8000-000000000101';
export const DEMO_YEAR_ID = '00000000-0000-4000-8000-000000000201';
export const DEMO_CLASS_5A_ID = '00000000-0000-4000-8000-000000000301';
export const DEMO_CLASS_5B_ID = '00000000-0000-4000-8000-000000000302';

export async function seedDemoData(database: AppDatabase): Promise<void> {
  const now = new Date().toISOString();
  const seedMarker = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    ['demo_seeded_at'],
  );

  if (seedMarker) {
    return;
  }

  const recordDate = todayDate();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT OR IGNORE INTO organizations
        (id, name, country, created_at, updated_at, sync_status, last_synced_at)
       VALUES (?, ?, ?, ?, ?, 'SYNCED', ?)`,
      [DEMO_ORGANIZATION_ID, 'Demo Education Organization', 'India', now, now, now],
    );

    await database.runAsync(
      `INSERT OR IGNORE INTO schools
        (id, organization_id, name, school_type, school_code, city, district, state, country, phone, email, created_at, updated_at, sync_status, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?)`,
      [
        DEMO_SCHOOL_ID,
        DEMO_ORGANIZATION_ID,
        'Government High School',
        'GOVERNMENT',
        'GHS001',
        'Hyderabad',
        'Hyderabad',
        'Telangana',
        'India',
        '+91 98765 43210',
        'office@example.edu',
        now,
        now,
        now,
      ],
    );

    await database.runAsync(
      `INSERT OR IGNORE INTO academic_years
        (id, school_id, name, start_date, end_date, is_active, created_at, updated_at, sync_status, last_synced_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'SYNCED', ?)`,
      [DEMO_YEAR_ID, DEMO_SCHOOL_ID, '2026-2027', '2026-06-01', '2027-04-30', now, now, now],
    );

    await database.runAsync(
      `INSERT OR IGNORE INTO classes
        (id, school_id, academic_year_id, name, section, created_at, updated_at, sync_status, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?)`,
      [DEMO_CLASS_5A_ID, DEMO_SCHOOL_ID, DEMO_YEAR_ID, 'Grade 5', 'A', now, now, now],
    );

    await database.runAsync(
      `INSERT OR IGNORE INTO classes
        (id, school_id, academic_year_id, name, section, created_at, updated_at, sync_status, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?)`,
      [DEMO_CLASS_5B_ID, DEMO_SCHOOL_ID, DEMO_YEAR_ID, 'Grade 5', 'B', now, now, now],
    );

    const fields = [
      ['00000000-0000-4000-8000-000000000401', 'aadhar_number', 'Aadhar Number', 'TEXT', 0, 1, null],
      [
        '00000000-0000-4000-8000-000000000402',
        'blood_group',
        'Blood Group',
        'SELECT',
        0,
        2,
        JSON.stringify(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
      ],
      ['00000000-0000-4000-8000-000000000403', 'bus_route', 'Bus Route', 'TEXT', 0, 3, null],
    ];

    for (const field of fields) {
      await database.runAsync(
        `INSERT OR IGNORE INTO student_field_definitions
          (id, school_id, field_key, label, field_type, is_required, display_order, is_active, options_json, created_at, updated_at, sync_status, last_synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 'SYNCED', ?)`,
        [field[0], DEMO_SCHOOL_ID, field[1], field[2], field[3], field[4], field[5], field[6], now, now, now],
      );
    }

    const students = [
      ['00000000-0000-4000-8000-000000000501', 'SR-001', 'Rahul', 'Kumar', 'M', 'A+', DEMO_CLASS_5A_ID],
      ['00000000-0000-4000-8000-000000000502', 'SR-002', 'Sita', 'Devi', 'F', 'B+', DEMO_CLASS_5A_ID],
      ['00000000-0000-4000-8000-000000000503', 'SR-003', 'Aman', 'Rao', 'M', 'O+', DEMO_CLASS_5A_ID],
      ['00000000-0000-4000-8000-000000000504', 'SR-004', 'Meera', 'Nair', 'F', 'AB+', DEMO_CLASS_5B_ID],
      ['00000000-0000-4000-8000-000000000505', 'SR-005', 'Kabir', 'Singh', 'M', 'O-', DEMO_CLASS_5B_ID],
    ];

    for (const [id, studentNumber, firstName, lastName, gender, bloodGroup, classId] of students) {
      await database.runAsync(
        `INSERT OR IGNORE INTO students
          (id, organization_id, school_id, class_id, academic_year_id, student_number, first_name, last_name, date_of_birth, age, gender, guardian_name, guardian_phone, record_date, created_at, updated_at, sync_status, last_synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?)`,
        [
          id,
          DEMO_ORGANIZATION_ID,
          DEMO_SCHOOL_ID,
          classId,
          DEMO_YEAR_ID,
          studentNumber,
          firstName,
          lastName,
          '2015-06-15',
          11,
          gender,
          `${firstName} Guardian`,
          '+91 90000 00000',
          recordDate,
          now,
          now,
          now,
        ],
      );

      await database.runAsync(
        `INSERT OR IGNORE INTO student_field_values
          (id, student_id, field_definition_id, value_json, created_at, updated_at, sync_status, last_synced_at)
         VALUES (?, ?, ?, ?, ?, ?, 'SYNCED', ?)`,
        [
          `${id}-blood-group`,
          id,
          '00000000-0000-4000-8000-000000000402',
          JSON.stringify(bloodGroup),
          now,
          now,
          now,
        ],
      );
    }

    await database.runAsync('INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)', [
      'demo_seeded_at',
      now,
      now,
    ]);
  });
}
