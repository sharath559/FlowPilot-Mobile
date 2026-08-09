import { useLocalSearchParams, router } from 'expo-router';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Image, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../src/components/AppButton';
import { ChoiceList } from '../src/components/ChoiceList';
import { Screen } from '../src/components/Screen';
import { Section } from '../src/components/Section';
import { TextField } from '../src/components/TextField';
import { colors, spacing } from '../src/constants/theme';
import { chooseStudentPhoto, compressStudentPhoto } from '../src/features/media/photoService';
import { useAppData } from '../src/hooks/useAppData';
import type { StudentFieldDefinition } from '../src/types/domain';
import { emailSchema, studentSchema, type StudentFormValues } from '../src/validation/schemas';
import { isValidDateString, todayDate } from '../src/utils/dates';

type CustomFieldName = `custom_values.${string}`;
type FormMessage = {
  tone: 'success' | 'warning' | 'danger';
  text: string;
};
type FieldErrorMap = Record<string, string>;
type ValidationDetails = {
  fieldErrors: FieldErrorMap;
  message: string;
};

const FIELD_LABELS: Record<string, string> = {
  school_id: 'School',
  academic_year_id: 'Academic year',
  class_id: 'Class',
  student_number: 'Admission no.',
  first_name: 'First name',
  middle_name: 'Middle name',
  last_name: 'Last name',
  preferred_name: 'Preferred name',
  date_of_birth: 'Date of birth',
  age: 'Age',
  gender: 'Gender',
  email: 'Email',
  phone: 'Phone',
  guardian_name: 'Guardian name',
  guardian_phone: 'Guardian phone',
  address: 'Address',
  photo_local_path: 'Photo',
  record_date: 'Record date',
  notes: 'Notes',
};

const defaultValues: StudentFormValues = {
  school_id: '',
  academic_year_id: null,
  class_id: null,
  student_number: null,
  first_name: '',
  middle_name: null,
  last_name: null,
  preferred_name: null,
  date_of_birth: null,
  age: null,
  gender: null,
  email: null,
  phone: null,
  guardian_name: null,
  guardian_phone: null,
  address: null,
  photo_local_path: null,
  record_date: todayDate(),
  notes: null,
  custom_values: {},
};

export default function StudentFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const {
    selectedSchoolId,
    selectedClassId,
    schools,
    academicYears,
    classes,
    fieldDefinitions,
    saveStudentRecord,
    getStudent,
  } = useAppData();
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>(Platform.OS === 'web' ? 'front' : 'back');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { control, handleSubmit, reset, setValue } = useForm<StudentFormValues>({
    defaultValues: {
      ...defaultValues,
      school_id: selectedSchoolId ?? '',
      class_id: selectedClassId ?? null,
      academic_year_id: academicYears.find((year) => year.is_active)?.id ?? academicYears[0]?.id ?? null,
    },
  });

  const watchedSchoolId = useWatch({ control, name: 'school_id' });
  const schoolId = watchedSchoolId || selectedSchoolId;
  const visibleClasses = useMemo(
    () => classes.filter((schoolClass) => schoolClass.school_id === schoolId),
    [classes, schoolId],
  );
  const visibleFields = useMemo(
    () => fieldDefinitions.filter((field) => field.school_id === schoolId && field.is_active),
    [fieldDefinitions, schoolId],
  );

  useEffect(() => {
    if (!params.id) {
      reset({
        ...defaultValues,
        school_id: selectedSchoolId ?? '',
        class_id: selectedClassId ?? null,
        academic_year_id: academicYears.find((year) => year.is_active)?.id ?? academicYears[0]?.id ?? null,
      });
      Promise.resolve().then(() => {
        setFormMessage(null);
        setFieldErrors({});
        setPhotoUri(null);
      });
      return;
    }

    getStudent(params.id).then((student) => {
      if (!student) {
        return;
      }

      setFormMessage(null);
      setFieldErrors({});
      setPhotoUri(student.photo_local_path ?? null);
      reset({
        ...student,
        custom_values: student.custom_values,
      });
    });
  }, [academicYears, getStudent, params.id, reset, selectedClassId, selectedSchoolId]);

  function clearFieldFeedback(fieldName: string) {
    setFormMessage(null);
    setFieldErrors((currentErrors) => {
      if (!currentErrors[fieldName]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[fieldName];
      return nextErrors;
    });
  }

  function updateField<T>(fieldName: string, onChange: (value: T) => void, value: T) {
    clearFieldFeedback(fieldName);
    onChange(value);
  }

  async function openCamera() {
    try {
      const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('Camera', 'Camera permission is required to take a student photo.');
        return;
      }
      setCameraReady(false);
      setCameraVisible(true);
    } catch (error) {
      Alert.alert('Camera', error instanceof Error ? error.message : String(error));
    }
  }

  async function capturePhoto() {
    try {
      if (!cameraRef.current || !cameraReady) {
        return;
      }

      const picture = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      const photo = await compressStudentPhoto(picture.uri);
      setPhotoUri(photo.uri);
      clearFieldFeedback('photo_local_path');
      setValue('photo_local_path', photo.uri);
      setCameraVisible(false);
    } catch (error) {
      Alert.alert('Camera', error instanceof Error ? error.message : String(error));
    }
  }

  async function setPhoto(source: 'library') {
    try {
      const photo = await chooseStudentPhoto();
      if (photo) {
        setPhotoUri(photo.uri);
        clearFieldFeedback('photo_local_path');
        setValue('photo_local_path', photo.uri);
      }
    } catch (error) {
      Alert.alert('Photo', error instanceof Error ? error.message : String(error));
    }
  }

  if (cameraVisible) {
    return (
      <SafeAreaView style={styles.cameraScreen}>
        <CameraView
          ref={cameraRef}
          active
          facing={cameraFacing}
          mode="picture"
          onCameraReady={() => setCameraReady(true)}
          onMountError={(event) => Alert.alert('Camera', event.message)}
          style={styles.camera}
        />
        <View style={styles.cameraControls}>
          <AppButton label="Cancel" onPress={() => setCameraVisible(false)} variant="secondary" />
          <AppButton label={cameraReady ? 'Capture' : 'Loading camera'} onPress={() => void capturePhoto()} disabled={!cameraReady} />
          <AppButton
            label="Flip"
            onPress={() => setCameraFacing((facing) => (facing === 'front' ? 'back' : 'front'))}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    );
  }

  async function submit(values: StudentFormValues, addAnother = false) {
    setFormMessage(null);
    setFieldErrors({});

    const validationDetails = validateStudentForm(values, visibleFields);
    if (validationDetails) {
      setFieldErrors(validationDetails.fieldErrors);
      setFormMessage({ tone: 'warning', text: validationDetails.message });
      return;
    }

    try {
      setSaving(true);
      const saved = await saveStudentRecord(values);
      if (addAnother) {
        reset({
          ...defaultValues,
          school_id: values.school_id,
          class_id: values.class_id,
          academic_year_id: values.academic_year_id,
          record_date: todayDate(),
          custom_values: {},
        });
        setPhotoUri(null);
        setFieldErrors({});
        setFormMessage({ tone: 'success', text: 'Saved locally and added to the sync queue.' });
      } else {
        router.replace({ pathname: '/student/[id]', params: { id: saved.id, saved: '1' } });
      }
    } catch (error) {
      const saveError = getSaveErrorDetails(error, visibleFields);
      setFieldErrors(saveError.fieldErrors);
      setFormMessage({ tone: 'danger', text: saveError.message });
      Alert.alert('Student', saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title={params.id ? 'Edit student' : 'Add student'} subtitle="Records save locally first and sync later.">
      <Section title="School and class">
        <Controller
          control={control}
          name="school_id"
          render={({ field }) => (
            <ChoiceList
              choices={schools.map((school) => ({ id: school.id, label: school.name, meta: school.city }))}
              selectedId={field.value}
              onSelect={(value) => updateField('school_id', field.onChange, value)}
            />
          )}
        />
        <FieldError message={fieldErrors.school_id} />
        <Controller
          control={control}
          name="academic_year_id"
          render={({ field }) => (
            <ChoiceList
              choices={academicYears.map((year) => ({ id: year.id, label: year.name, meta: year.is_active ? 'Active' : null }))}
              selectedId={field.value}
              onSelect={(value) => updateField('academic_year_id', field.onChange, value)}
            />
          )}
        />
        <FieldError message={fieldErrors.academic_year_id} />
        <Controller
          control={control}
          name="class_id"
          render={({ field }) => (
            <ChoiceList
              choices={visibleClasses.map((schoolClass) => ({
                id: schoolClass.id,
                label: schoolClass.name,
                meta: schoolClass.section,
              }))}
              selectedId={field.value}
              onSelect={(value) => updateField('class_id', field.onChange, value)}
            />
          )}
        />
        <FieldError message={fieldErrors.class_id} />
      </Section>

      <Section title="Photo">
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : <View style={styles.photoPlaceholder} />}
        <View style={styles.actions}>
          <AppButton label="Take photo" onPress={() => void openCamera()} variant="secondary" />
          <AppButton label="Choose photo" onPress={() => void setPhoto('library')} variant="secondary" />
        </View>
      </Section>

      <Section title="Student details">
        <Controller
          control={control}
          name="student_number"
          render={({ field }) => (
            <TextField
              label="Admission no."
              value={field.value}
              onChangeText={(value) => updateField('student_number', field.onChange, value)}
              error={fieldErrors.student_number}
            />
          )}
        />
        <Controller
          control={control}
          name="first_name"
          render={({ field }) => (
            <TextField
              label="First name"
              value={field.value}
              onChangeText={(value) => updateField('first_name', field.onChange, value)}
              error={fieldErrors.first_name}
            />
          )}
        />
        <Controller
          control={control}
          name="preferred_name"
          render={({ field }) => (
            <TextField
              label="Preferred name"
              value={field.value}
              onChangeText={(value) => updateField('preferred_name', field.onChange, value)}
              error={fieldErrors.preferred_name}
            />
          )}
        />
        <Controller
          control={control}
          name="middle_name"
          render={({ field }) => (
            <TextField
              label="Middle name"
              value={field.value}
              onChangeText={(value) => updateField('middle_name', field.onChange, value)}
              error={fieldErrors.middle_name}
            />
          )}
        />
        <Controller
          control={control}
          name="last_name"
          render={({ field }) => (
            <TextField
              label="Last name"
              value={field.value}
              onChangeText={(value) => updateField('last_name', field.onChange, value)}
              error={fieldErrors.last_name}
            />
          )}
        />
        <Controller
          control={control}
          name="date_of_birth"
          render={({ field }) => (
            <TextField
              label="Date of birth"
              value={field.value}
              onChangeText={(value) => updateField('date_of_birth', field.onChange, value)}
              placeholder="YYYY-MM-DD"
              error={fieldErrors.date_of_birth}
            />
          )}
        />
        <Controller
          control={control}
          name="age"
          render={({ field }) => (
            <TextField
              label="Age"
              value={field.value ? String(field.value) : ''}
              onChangeText={(value) => updateField('age', field.onChange, value ? Number(value) : null)}
              keyboardType="number-pad"
              error={fieldErrors.age}
            />
          )}
        />
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <TextField
              label="Gender"
              value={field.value}
              onChangeText={(value) => updateField('gender', field.onChange, value)}
              error={fieldErrors.gender}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label="Email"
              value={field.value}
              onChangeText={(value) => updateField('email', field.onChange, value)}
              keyboardType="email-address"
              error={fieldErrors.email}
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <TextField
              label="Phone"
              value={field.value}
              onChangeText={(value) => updateField('phone', field.onChange, value)}
              keyboardType="phone-pad"
              error={fieldErrors.phone}
            />
          )}
        />
        <Controller
          control={control}
          name="guardian_name"
          render={({ field }) => (
            <TextField
              label="Guardian name"
              value={field.value}
              onChangeText={(value) => updateField('guardian_name', field.onChange, value)}
              error={fieldErrors.guardian_name}
            />
          )}
        />
        <Controller
          control={control}
          name="guardian_phone"
          render={({ field }) => (
            <TextField
              label="Guardian phone"
              value={field.value}
              onChangeText={(value) => updateField('guardian_phone', field.onChange, value)}
              keyboardType="phone-pad"
              error={fieldErrors.guardian_phone}
            />
          )}
        />
        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <TextField
              label="Address"
              value={field.value}
              onChangeText={(value) => updateField('address', field.onChange, value)}
              multiline
              error={fieldErrors.address}
            />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <TextField
              label="Notes"
              value={field.value}
              onChangeText={(value) => updateField('notes', field.onChange, value)}
              multiline
              error={fieldErrors.notes}
            />
          )}
        />
      </Section>

      {visibleFields.length ? (
        <Section title="Custom fields">
          {visibleFields.map((fieldDefinition) => (
            <Controller
              key={fieldDefinition.id}
              control={control}
              name={`custom_values.${fieldDefinition.field_key}` as CustomFieldName}
              render={({ field }) =>
                fieldDefinition.field_type === 'SELECT' && fieldDefinition.options?.length ? (
                  <View style={styles.customWrap}>
                    <Text style={styles.customLabel}>{fieldDefinition.label}</Text>
                    <ChoiceList
                      choices={fieldDefinition.options.map((option) => ({ id: option, label: option }))}
                      selectedId={String(field.value ?? '')}
                      onSelect={(value) => updateField(`custom_values.${fieldDefinition.field_key}`, field.onChange, value)}
                    />
                    <FieldError message={fieldErrors[`custom_values.${fieldDefinition.field_key}`]} />
                  </View>
                ) : fieldDefinition.field_type === 'BOOLEAN' ? (
                  <View style={styles.customWrap}>
                    <Text style={styles.customLabel}>{fieldDefinition.label}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        updateField(`custom_values.${fieldDefinition.field_key}`, field.onChange, !field.value)
                      }
                      style={[styles.booleanButton, Boolean(field.value) && styles.booleanButtonActive]}
                    >
                      <Text style={styles.booleanText}>{field.value ? 'Yes' : 'No'}</Text>
                    </Pressable>
                    <FieldError message={fieldErrors[`custom_values.${fieldDefinition.field_key}`]} />
                  </View>
                ) : (
                  <TextField
                    label={fieldDefinition.label}
                    value={field.value ? String(field.value) : ''}
                    onChangeText={(value) =>
                      updateField(`custom_values.${fieldDefinition.field_key}`, field.onChange, value)
                    }
                    keyboardType={fieldDefinition.field_type === 'NUMBER' ? 'number-pad' : 'default'}
                    placeholder={fieldDefinition.placeholder ?? undefined}
                    error={fieldErrors[`custom_values.${fieldDefinition.field_key}`]}
                  />
                )
              }
            />
          ))}
        </Section>
      ) : null}

      <View style={styles.actions}>
        {formMessage ? (
          <View style={[styles.message, messageToneStyle(formMessage.tone)]}>
            <Text style={styles.messageText}>{formMessage.text}</Text>
          </View>
        ) : null}
        <AppButton
          label={saving ? 'Saving...' : 'Save student'}
          onPress={handleSubmit((values) => void submit(values))}
          disabled={saving}
          loading={saving}
        />
        <AppButton
          label="Save and add another"
          onPress={handleSubmit((values) => void submit(values, true))}
          disabled={saving}
          variant="secondary"
        />
      </View>
    </Screen>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <Text style={styles.fieldError}>{message}</Text> : null;
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim().length === 0;
}

function fieldNameFromIssuePath(path: (string | number)[]): string {
  if (path[0] === 'custom_values' && typeof path[1] === 'string') {
    return `custom_values.${path[1]}`;
  }

  return typeof path[0] === 'string' ? path[0] : 'form';
}

function fieldLabel(fieldName: string, fieldDefinitions: StudentFieldDefinition[]): string {
  if (fieldName.startsWith('custom_values.')) {
    const fieldKey = fieldName.replace('custom_values.', '');
    return fieldDefinitions.find((definition) => definition.field_key === fieldKey)?.label ?? fieldKey;
  }

  return FIELD_LABELS[fieldName] ?? fieldName;
}

function normalizeFieldMessage(fieldName: string, message: string): string {
  if (fieldName === 'age') {
    return 'Age must be a number from 0 to 130.';
  }

  if (fieldName === 'email') {
    return 'Email must be a valid email address.';
  }

  if (fieldName === 'date_of_birth' || fieldName === 'record_date') {
    return 'Enter a real date in YYYY-MM-DD format.';
  }

  return message;
}

function buildValidationDetails(
  fieldErrors: FieldErrorMap,
  fieldDefinitions: StudentFieldDefinition[],
): ValidationDetails | null {
  const entries = Object.entries(fieldErrors);
  if (!entries.length) {
    return null;
  }

  const [firstFieldName, firstMessage] = entries[0];
  const firstLabel = fieldLabel(firstFieldName, fieldDefinitions);
  const message =
    entries.length === 1
      ? `${firstLabel}: ${firstMessage}`
      : `Fix ${entries.length} fields. First: ${firstLabel}: ${firstMessage}`;

  return { fieldErrors, message };
}

function validateStudentForm(
  values: StudentFormValues,
  fieldDefinitions: StudentFieldDefinition[],
): ValidationDetails | null {
  const fieldErrors: FieldErrorMap = {};
  const parsed = studentSchema.safeParse(values);

  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => {
      const fieldName = fieldNameFromIssuePath(issue.path);
      fieldErrors[fieldName] ??= normalizeFieldMessage(fieldName, issue.message);
    });
  }

  if (isBlank(values.school_id)) {
    fieldErrors.school_id = 'Select a school before saving.';
  }

  if (isBlank(values.first_name)) {
    fieldErrors.first_name = 'First name is required.';
  }

  fieldDefinitions.forEach((fieldDefinition) => {
    const fieldName = `custom_values.${fieldDefinition.field_key}`;
    const value = values.custom_values?.[fieldDefinition.field_key];
    if (fieldDefinition.is_required && isBlank(value)) {
      fieldErrors[fieldName] = `${fieldDefinition.label} is required.`;
      return;
    }

    if (isBlank(value)) {
      return;
    }

    if (fieldDefinition.field_type === 'DATE' && !isValidDateString(String(value))) {
      fieldErrors[fieldName] = 'Enter a real date in YYYY-MM-DD format.';
    }

    if (fieldDefinition.field_type === 'NUMBER' && !Number.isFinite(Number(value))) {
      fieldErrors[fieldName] = 'Enter a valid number.';
    }

    if (fieldDefinition.field_type === 'EMAIL' && !emailSchema.safeParse(value).success) {
      fieldErrors[fieldName] = 'Enter a valid email address.';
    }

    if (
      fieldDefinition.field_type === 'SELECT' &&
      fieldDefinition.options?.length &&
      !fieldDefinition.options.includes(String(value))
    ) {
      fieldErrors[fieldName] = 'Select one of the available options.';
    }
  });

  return buildValidationDetails(fieldErrors, fieldDefinitions);
}

function getSaveErrorDetails(error: unknown, fieldDefinitions: StudentFieldDefinition[]): ValidationDetails {
  if (typeof error === 'object' && error !== null && 'issues' in error) {
    const fieldErrors: FieldErrorMap = {};
    const issues = (error as { issues?: { path?: (string | number)[]; message?: string }[] }).issues ?? [];

    issues.forEach((issue) => {
      const fieldName = fieldNameFromIssuePath(issue.path ?? []);
      if (issue.message) {
        fieldErrors[fieldName] ??= normalizeFieldMessage(fieldName, issue.message);
      }
    });

    const validationDetails = buildValidationDetails(fieldErrors, fieldDefinitions);
    if (validationDetails) {
      return validationDetails;
    }
  }

  return {
    fieldErrors: {},
    message: error instanceof Error ? error.message : String(error),
  };
}

function messageToneStyle(tone: FormMessage['tone']) {
  if (tone === 'success') return styles.successMessage;
  if (tone === 'warning') return styles.warningMessage;
  return styles.dangerMessage;
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
  booleanButton: {
    alignItems: 'center',
    backgroundColor: '#FBFCFB',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  booleanButtonActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  booleanText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cameraScreen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  customLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  customWrap: {
    gap: spacing.sm,
  },
  dangerMessage: {
    backgroundColor: '#FFF0F0',
    borderColor: '#F3B4B4',
  },
  fieldError: {
    color: '#B42318',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 18,
  },
  message: {
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
  },
  messageText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 20,
  },
  photo: {
    alignSelf: 'flex-start',
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 180,
    width: 136,
  },
  photoPlaceholder: {
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 120,
  },
  successMessage: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  warningMessage: {
    backgroundColor: '#FFF7E6',
    borderColor: '#E8B55B',
  },
});
