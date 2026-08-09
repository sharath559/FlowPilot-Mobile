import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../src/components/AppButton';
import { Screen } from '../../src/components/Screen';
import { Section } from '../../src/components/Section';
import { SyncBadge } from '../../src/components/Badge';
import { colors, spacing } from '../../src/constants/theme';
import { exportStudentPdf } from '../../src/features/exports/exportService';
import { useAppData } from '../../src/hooks/useAppData';
import type { StudentWithRelations } from '../../src/types/domain';

export default function StudentDetailScreen() {
  const { id, saved } = useLocalSearchParams<{ id: string; saved?: string }>();
  const { getStudent, fieldDefinitions, deleteStudentRecord } = useAppData();
  const [student, setStudent] = useState<StudentWithRelations | null>(null);

  useEffect(() => {
    if (id) {
      getStudent(id).then(setStudent);
    }
  }, [getStudent, id]);

  if (!student) {
    return (
      <Screen title="Student" subtitle="Record not found.">
        <Text style={styles.detail}>This record may have been deleted.</Text>
      </Screen>
    );
  }

  const fullName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ');
  const studentId = student.id;

  function confirmDelete() {
    Alert.alert('Delete record', 'This will soft-delete the record and queue the change for sync.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteStudentRecord(studentId);
          router.replace('/students');
        },
      },
    ]);
  }

  return (
    <Screen title={fullName || 'Student'} subtitle={[student.school_name, student.class_name, student.class_section].filter(Boolean).join(' · ')}>
      <Section title="Record status">
        {saved ? (
          <View style={styles.successMessage}>
            <Text style={styles.successText}>Saved locally and added to the sync queue.</Text>
          </View>
        ) : null}
        <SyncBadge status={student.sync_status} />
        {student.photo_local_path ? <Image source={{ uri: student.photo_local_path }} style={styles.photo} /> : null}
      </Section>

      <Section title="Details">
        <Detail label="Admission no." value={student.student_number} />
        <Detail label="Date of birth" value={student.date_of_birth} />
        <Detail label="Age" value={student.age} />
        <Detail label="Gender" value={student.gender} />
        <Detail label="Email" value={student.email} />
        <Detail label="Phone" value={student.phone} />
        <Detail label="Guardian" value={student.guardian_name} />
        <Detail label="Guardian phone" value={student.guardian_phone} />
        <Detail label="Address" value={student.address} />
        <Detail label="Notes" value={student.notes} />
      </Section>

      <Section title="Custom fields">
        {fieldDefinitions.map((field) => (
          <Detail key={field.id} label={field.label} value={student.custom_values[field.field_key]} />
        ))}
      </Section>

      <View style={styles.actions}>
        <AppButton label="Edit" onPress={() => router.push({ pathname: '/student-form', params: { id: student.id } })} />
        <AppButton
          label="Generate PDF"
          onPress={() => void exportStudentPdf(student, fieldDefinitions)}
          variant="secondary"
        />
        <AppButton label="Delete" onPress={confirmDelete} variant="danger" />
      </View>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: unknown }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.detail}>{String(value ?? 'Not provided')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
  detail: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 20,
  },
  detailRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    width: 124,
  },
  photo: {
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 180,
    width: 136,
  },
  successMessage: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
  },
  successText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 20,
  },
});
