import { z } from 'zod';

import { calculateAge, isValidDateString, todayDate } from '../utils/dates';

function blankTextToUndefined(value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return undefined;
  }

  return value;
}

const optionalText = z
  .preprocess(blankTextToUndefined, z.string().trim().optional())
  .transform((value) => value ?? null);

const dateTextSchema = z
  .string()
  .trim()
  .refine(isValidDateString, 'Enter a real date in YYYY-MM-DD format');

const optionalDate = z
  .preprocess(blankTextToUndefined, dateTextSchema.optional())
  .transform((value) => value ?? null);

export const emailSchema = z
  .preprocess(blankTextToUndefined, z.string().trim().email('Enter a valid email').optional())
  .transform((value) => value ?? null);

export const schoolSchema = z.object({
  name: z.string().trim().min(2, 'School name is required'),
  school_type: optionalText,
  school_code: optionalText,
  address_line_1: optionalText,
  address_line_2: optionalText,
  city: optionalText,
  district: optionalText,
  state: optionalText,
  postal_code: optionalText,
  country: optionalText.default('India'),
  phone: optionalText,
  email: emailSchema,
});

export const classSchema = z.object({
  school_id: z.string().min(1, 'Select a school'),
  academic_year_id: z.string().min(1, 'Select an academic year'),
  name: z.string().trim().min(1, 'Class name is required'),
  section: optionalText,
});

export const fieldDefinitionSchema = z.object({
  school_id: z.string().min(1, 'Select a school'),
  field_key: z
    .string()
    .trim()
    .min(2, 'Key is required')
    .regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, numbers, and underscores'),
  label: z.string().trim().min(2, 'Label is required'),
  field_type: z.enum(['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'PHONE', 'EMAIL']),
  is_required: z.boolean().default(false),
  display_order: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  placeholder: optionalText,
  help_text: optionalText,
  options: z.array(z.string().trim().min(1)).nullable().optional(),
});

export const studentSchema = z
  .object({
    id: z.string().optional(),
    organization_id: z.string().optional(),
    school_id: z.string().min(1, 'Select a school'),
    academic_year_id: z.string().nullable().optional(),
    class_id: z.string().nullable().optional(),
    student_number: optionalText,
    first_name: z.string().trim().min(1, 'First name is required'),
    middle_name: optionalText,
    last_name: optionalText,
    preferred_name: optionalText,
    date_of_birth: optionalDate,
    age: z.coerce.number().int().min(0).max(130).nullable().optional(),
    gender: optionalText,
    email: emailSchema,
    phone: optionalText,
    guardian_name: optionalText,
    guardian_phone: optionalText,
    address: optionalText,
    photo_local_path: optionalText,
    record_date: dateTextSchema.default(todayDate),
    notes: optionalText,
    custom_values: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, context) => {
    if (value.date_of_birth && value.date_of_birth > todayDate()) {
      context.addIssue({
        code: 'custom',
        message: 'Date of birth cannot be in the future',
        path: ['date_of_birth'],
      });
    }
  })
  .transform((value) => ({
    ...value,
    age: value.age ?? calculateAge(value.date_of_birth),
  }));

export const authEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const authEmailOnlySchema = authEmailSchema.pick({ email: true });

export const inviteAcceptanceSchema = z
  .object({
    displayName: z.string().trim().min(2, 'Enter your name'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SchoolFormValues = z.input<typeof schoolSchema>;
export type ClassFormValues = z.input<typeof classSchema>;
export type FieldDefinitionFormValues = z.input<typeof fieldDefinitionSchema>;
export type StudentFormValues = z.infer<typeof studentSchema>;
