INSERT INTO public.organizations (id, name, country)
VALUES ('00000000-0000-4000-8000-000000000001', 'Demo Education Organization', 'India')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.schools (
  id,
  organization_id,
  name,
  school_type,
  school_code,
  city,
  district,
  state,
  country,
  phone,
  email
)
VALUES (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'Government High School',
  'GOVERNMENT',
  'GHS001',
  'Hyderabad',
  'Hyderabad',
  'Telangana',
  'India',
  '+91 98765 43210',
  'office@example.edu'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.academic_years (id, school_id, name, start_date, end_date, is_active)
VALUES
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', '2026-2027', '2026-06-01', '2027-04-30', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.classes (id, school_id, academic_year_id, name, section)
VALUES
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'Grade 5', 'A'),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'Grade 5', 'B'),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'Grade 6', 'A')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.student_field_definitions (id, school_id, field_key, label, field_type, is_required, display_order, options)
VALUES
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000101', 'aadhar_number', 'Aadhar Number', 'TEXT', false, 1, null),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000101', 'blood_group', 'Blood Group', 'SELECT', false, 2, '["A+","A-","B+","B-","AB+","AB-","O+","O-"]'::jsonb),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000101', 'bus_route', 'Bus Route', 'TEXT', false, 3, null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (
  id,
  organization_id,
  school_id,
  class_id,
  academic_year_id,
  student_number,
  first_name,
  last_name,
  date_of_birth,
  age,
  gender,
  guardian_name,
  guardian_phone,
  record_date
)
VALUES
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000201', 'SR-001', 'Rahul', 'Kumar', '2015-06-15', 11, 'M', 'Rahul Guardian', '+91 90000 00000', current_date),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000201', 'SR-002', 'Sita', 'Devi', '2015-06-15', 11, 'F', 'Sita Guardian', '+91 90000 00000', current_date),
  ('00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000201', 'SR-003', 'Aman', 'Rao', '2015-06-15', 11, 'M', 'Aman Guardian', '+91 90000 00000', current_date)
ON CONFLICT (id) DO NOTHING;

-- Create users in Supabase Auth first, then attach them to the demo organization:
-- INSERT INTO public.organization_members (organization_id, user_id, role)
-- VALUES ('00000000-0000-4000-8000-000000000001', '<auth-user-id>', 'SCHOOL_ADMIN');
