CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'SCHOOL_ADMIN', 'STAFF')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  school_type text,
  school_code text,
  address_line_1 text,
  address_line_2 text,
  city text,
  district text,
  state text,
  postal_code text,
  country text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date,
  end_date date,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name text NOT NULL,
  section text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  student_number text,
  first_name text NOT NULL,
  middle_name text,
  last_name text,
  preferred_name text,
  date_of_birth date,
  age integer,
  gender text,
  email text,
  phone text,
  guardian_name text,
  guardian_phone text,
  address text,
  photo_url text,
  photo_local_path text,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.student_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'PHONE', 'EMAIL')),
  is_required boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  placeholder text,
  help_text text,
  options jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (school_id, field_key)
);

CREATE TABLE IF NOT EXISTS public.student_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  field_definition_id uuid NOT NULL REFERENCES public.student_field_definitions(id) ON DELETE CASCADE,
  value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (student_id, field_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_schools_organization ON public.schools(organization_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_school ON public.academic_years(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_year ON public.classes(school_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_students_organization ON public.students(organization_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_record_date ON public.students(record_date);
CREATE INDEX IF NOT EXISTS idx_student_field_definitions_school ON public.student_field_definitions(school_id);
CREATE INDEX IF NOT EXISTS idx_student_field_values_student ON public.student_field_values(student_id);

DROP TRIGGER IF EXISTS organizations_set_updated_at ON public.organizations;
CREATE TRIGGER organizations_set_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS schools_set_updated_at ON public.schools;
CREATE TRIGGER schools_set_updated_at
BEFORE UPDATE ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS academic_years_set_updated_at ON public.academic_years;
CREATE TRIGGER academic_years_set_updated_at
BEFORE UPDATE ON public.academic_years
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS classes_set_updated_at ON public.classes;
CREATE TRIGGER classes_set_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS students_set_updated_at ON public.students;
CREATE TRIGGER students_set_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS student_field_definitions_set_updated_at ON public.student_field_definitions;
CREATE TRIGGER student_field_definitions_set_updated_at
BEFORE UPDATE ON public.student_field_definitions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS student_field_values_set_updated_at ON public.student_field_values;
CREATE TRIGGER student_field_values_set_updated_at
BEFORE UPDATE ON public.student_field_values
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_field_values ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(target_organization_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = target_organization_id
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE POLICY "Organizations are visible to members"
  ON public.organizations
  FOR SELECT
  USING (public.is_org_member(id));

CREATE POLICY "Members can read their memberships"
  ON public.organization_members
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_org_member(organization_id));

CREATE POLICY "Schools are scoped to organization members"
  ON public.schools
  FOR ALL
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Academic years are scoped to school organizations"
  ON public.academic_years
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = academic_years.school_id
        AND public.is_org_member(schools.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = academic_years.school_id
        AND public.is_org_member(schools.organization_id)
    )
  );

CREATE POLICY "Classes are scoped to school organizations"
  ON public.classes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = classes.school_id
        AND public.is_org_member(schools.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = classes.school_id
        AND public.is_org_member(schools.organization_id)
    )
  );

CREATE POLICY "Students are scoped to organization members"
  ON public.students
  FOR ALL
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Student field definitions are scoped to school organizations"
  ON public.student_field_definitions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = student_field_definitions.school_id
        AND public.is_org_member(schools.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = student_field_definitions.school_id
        AND public.is_org_member(schools.organization_id)
    )
  );

CREATE POLICY "Student field values are scoped to student organizations"
  ON public.student_field_values
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = student_field_values.student_id
        AND public.is_org_member(students.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = student_field_values.student_id
        AND public.is_org_member(students.organization_id)
    )
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY "Student photos are visible to organization members"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'student-photos'
    AND split_part(name, '/', 1) = 'organizations'
    AND public.is_org_member(split_part(name, '/', 2)::uuid)
  );

CREATE POLICY "Student photos are writable by organization members"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'student-photos'
    AND split_part(name, '/', 1) = 'organizations'
    AND public.is_org_member(split_part(name, '/', 2)::uuid)
  );

CREATE POLICY "Student photos are updatable by organization members"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'student-photos'
    AND split_part(name, '/', 1) = 'organizations'
    AND public.is_org_member(split_part(name, '/', 2)::uuid)
  )
  WITH CHECK (
    bucket_id = 'student-photos'
    AND split_part(name, '/', 1) = 'organizations'
    AND public.is_org_member(split_part(name, '/', 2)::uuid)
  );
