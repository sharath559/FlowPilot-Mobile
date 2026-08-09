export const localSchemaSql = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'PENDING',
  last_synced_at TEXT
);

CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  school_type TEXT,
  school_code TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  district TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'PENDING',
  last_synced_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'PENDING',
  last_synced_at TEXT,
  FOREIGN KEY (school_id) REFERENCES schools(id)
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  name TEXT NOT NULL,
  section TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'PENDING',
  last_synced_at TEXT,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
);

CREATE TABLE IF NOT EXISTS student_field_definitions (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  is_required INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  placeholder TEXT,
  help_text TEXT,
  options_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'PENDING',
  last_synced_at TEXT,
  UNIQUE (school_id, field_key),
  FOREIGN KEY (school_id) REFERENCES schools(id)
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  class_id TEXT,
  academic_year_id TEXT,
  student_number TEXT,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT,
  preferred_name TEXT,
  date_of_birth TEXT,
  age INTEGER,
  gender TEXT,
  email TEXT,
  phone TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  address TEXT,
  photo_url TEXT,
  photo_local_path TEXT,
  record_date TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'PENDING',
  last_synced_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
);

CREATE TABLE IF NOT EXISTS student_field_values (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  field_definition_id TEXT NOT NULL,
  value_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'PENDING',
  last_synced_at TEXT,
  UNIQUE (student_id, field_definition_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (field_definition_id) REFERENCES student_field_definitions(id)
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_schools_org ON schools (organization_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_school ON academic_years (school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_year ON classes (school_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students (school_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students (class_id);
CREATE INDEX IF NOT EXISTS idx_students_record_date ON students (record_date);
CREATE INDEX IF NOT EXISTS idx_students_search ON students (first_name, last_name, student_number, guardian_name);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue (status, created_at);
`;
