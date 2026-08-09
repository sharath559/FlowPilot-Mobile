import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../src/components/AppButton';
import { Screen } from '../src/components/Screen';
import { Section } from '../src/components/Section';
import { TextField } from '../src/components/TextField';
import { colors, spacing } from '../src/constants/theme';
import { exportStudentsCsv, exportStudentsPdf } from '../src/features/exports/exportService';
import { useAppData } from '../src/hooks/useAppData';
import { todayDate } from '../src/utils/dates';

export default function DailyRecordsScreen() {
  const { students, fieldDefinitions, refresh, selectedSchoolId } = useAppData();
  const [date, setDate] = useState(todayDate());

  async function loadDailyRecords() {
    await refresh({ schoolId: selectedSchoolId, recordDate: date });
  }

  const countsByClass = students.reduce<Record<string, number>>((counts, student) => {
    const label = [student.class_name, student.class_section].filter(Boolean).join(' - ') || 'No class';
    counts[label] = (counts[label] ?? 0) + 1;
    return counts;
  }, {});

  async function exportDaily(kind: 'pdf' | 'csv') {
    try {
      if (kind === 'pdf') {
        await exportStudentsPdf(`Daily Records ${date}`, students, fieldDefinitions);
      } else {
        await exportStudentsCsv(`daily-records-${date}`, students, fieldDefinitions);
      }
    } catch (error) {
      Alert.alert('Export', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Screen title="Daily records" subtitle="Review and export records captured on a specific date.">
      <Section title="Date">
        <TextField label="Record date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <AppButton label="Load records" onPress={() => void loadDailyRecords()} />
      </Section>

      <Section title="Summary" meta={`${students.length} total`}>
        {Object.entries(countsByClass).map(([label, count]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.count}>{count}</Text>
          </View>
        ))}
      </Section>

      <Section title="Export">
        <AppButton label="Export daily PDF" onPress={() => void exportDaily('pdf')} variant="secondary" />
        <AppButton label="Export daily CSV" onPress={() => void exportDaily('csv')} variant="secondary" />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  count: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
});
