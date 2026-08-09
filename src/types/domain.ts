export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'SCHOOL_ADMIN' | 'STAFF';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export type FieldType =
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'BOOLEAN'
  | 'PHONE'
  | 'EMAIL';

export type EntityName =
  | 'organizations'
  | 'schools'
  | 'academic_years'
  | 'classes'
  | 'students'
  | 'student_field_definitions'
  | 'student_field_values';

export type BaseEntity = {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  sync_status: SyncStatus;
  last_synced_at?: string | null;
};

export type Organization = BaseEntity & {
  name: string;
  country?: string | null;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  email?: string | null;
  display_name?: string | null;
  created_at: string;
  updated_at?: string;
};

export type OrganizationInvitation = {
  id: string;
  organization_id: string;
  email: string;
  role: Exclude<UserRole, 'SUPER_ADMIN'>;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  invited_by?: string | null;
  accepted_by?: string | null;
  expires_at: string;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
};

export type School = BaseEntity & {
  organization_id: string;
  name: string;
  school_type?: string | null;
  school_code?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type AcademicYear = BaseEntity & {
  school_id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
};

export type SchoolClass = BaseEntity & {
  school_id: string;
  academic_year_id: string;
  name: string;
  section?: string | null;
};

export type StudentFieldDefinition = BaseEntity & {
  school_id: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  placeholder?: string | null;
  help_text?: string | null;
  options?: string[] | null;
};

export type Student = BaseEntity & {
  organization_id: string;
  school_id: string;
  class_id?: string | null;
  academic_year_id?: string | null;
  student_number?: string | null;
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  address?: string | null;
  photo_url?: string | null;
  photo_local_path?: string | null;
  record_date: string;
  notes?: string | null;
  created_by?: string | null;
};

export type StudentFieldValue = BaseEntity & {
  student_id: string;
  field_definition_id: string;
  value: unknown;
};

export type StudentWithRelations = Student & {
  school_name?: string | null;
  class_name?: string | null;
  class_section?: string | null;
  academic_year_name?: string | null;
  custom_values: Record<string, unknown>;
};

export type StudentFilters = {
  schoolId?: string;
  academicYearId?: string;
  classId?: string;
  recordDate?: string;
  search?: string;
};

export type SyncQueueItem = {
  id: number;
  entity: EntityName;
  entity_id: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  status: SyncStatus;
  retry_count: number;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
};

export type SyncSummary = {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  lastSyncedAt?: string | null;
};

export type DashboardStats = {
  studentsToday: number;
  totalStudents: number;
  pendingSync: number;
  failedSync: number;
  classes: number;
};

export type StudentFormInput = {
  id?: string;
  organization_id?: string;
  school_id: string;
  academic_year_id?: string | null;
  class_id?: string | null;
  student_number?: string | null;
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  address?: string | null;
  photo_local_path?: string | null;
  record_date?: string;
  notes?: string | null;
  custom_values?: Record<string, unknown>;
};
