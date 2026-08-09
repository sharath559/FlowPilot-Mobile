import type { StudentFieldDefinition, StudentWithRelations } from '../types/domain';

export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const rawValue = Array.isArray(value) ? value.join('; ') : String(value);
  if (/[",\n\r]/.test(rawValue)) {
    return `"${rawValue.replace(/"/g, '""')}"`;
  }

  return rawValue;
}

export function buildStudentsCsv(
  students: StudentWithRelations[],
  fieldDefinitions: StudentFieldDefinition[],
): string {
  const baseHeaders = [
    'Student Number',
    'First Name',
    'Middle Name',
    'Last Name',
    'Preferred Name',
    'Date of Birth',
    'Age',
    'Gender',
    'Email',
    'Phone',
    'Guardian Name',
    'Guardian Phone',
    'School',
    'Class',
    'Section',
    'Academic Year',
    'Record Date',
    'Notes',
    'Sync Status',
  ];
  const customHeaders = fieldDefinitions.map((field) => field.label);
  const rows = [baseHeaders.concat(customHeaders).map(escapeCsvValue).join(',')];

  students.forEach((student) => {
    const baseValues: unknown[] = [
      student.student_number,
      student.first_name,
      student.middle_name,
      student.last_name,
      student.preferred_name,
      student.date_of_birth,
      student.age,
      student.gender,
      student.email,
      student.phone,
      student.guardian_name,
      student.guardian_phone,
      student.school_name,
      student.class_name,
      student.class_section,
      student.academic_year_name,
      student.record_date,
      student.notes,
      student.sync_status,
    ];
    const customValues = fieldDefinitions.map((field) => student.custom_values[field.field_key]);
    rows.push([...baseValues, ...customValues].map(escapeCsvValue).join(','));
  });

  return rows.join('\n');
}
