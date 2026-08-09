import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../src/components/AppButton';
import { ChoiceList } from '../src/components/ChoiceList';
import { Screen } from '../src/components/Screen';
import { Section } from '../src/components/Section';
import { SyncBadge } from '../src/components/Badge';
import { TextField } from '../src/components/TextField';
import { colors, spacing } from '../src/constants/theme';
import { useAppData } from '../src/hooks/useAppData';

export default function StudentsScreen() {
  const { students, classes, selectedClassId, selectClass, refresh, selectedSchoolId } = useAppData();
  const [search, setSearch] = useState('');
  const [recordDate, setRecordDate] = useState('');

  async function applyFilters() {
    await refresh({
      schoolId: selectedSchoolId,
      classId: selectedClassId,
      search,
      recordDate: recordDate || undefined,
    });
  }

  return (
    <Screen title="Students" subtitle="Browse, search, edit, export, and soft-delete records saved on this device.">
      <Section title="Filters">
        <TextField label="Search" value={search} onChangeText={setSearch} placeholder="Name, admission no., guardian" />
        <TextField label="Record date" value={recordDate} onChangeText={setRecordDate} placeholder="YYYY-MM-DD" />
        <ChoiceList
          choices={classes.map((schoolClass) => ({ id: schoolClass.id, label: schoolClass.name, meta: schoolClass.section }))}
          selectedId={selectedClassId}
          onSelect={(id) => void selectClass(id)}
        />
        <AppButton label="Apply filters" onPress={() => void applyFilters()} />
      </Section>

      <Section title="Student records" meta={`${students.length} shown`}>
        {students.map((student) => (
          <View key={student.id} style={styles.studentCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.name}>
                  {[student.first_name, student.last_name].filter(Boolean).join(' ') || 'Unnamed student'}
                </Text>
                <Text style={styles.meta}>
                  {[student.student_number, student.class_name, student.class_section].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <SyncBadge status={student.sync_status} />
            </View>
            <Text style={styles.detail}>Guardian: {student.guardian_name || 'Not provided'}</Text>
            <Text style={styles.detail}>Captured: {student.record_date}</Text>
            <AppButton
              label="Open record"
              onPress={() => router.push({ pathname: '/student/[id]', params: { id: student.id } })}
              variant="secondary"
            />
          </View>
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  detail: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  studentCard: {
    backgroundColor: '#FBFCFB',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
});
