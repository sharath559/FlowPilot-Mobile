import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../src/components/AppButton';
import { ChoiceList } from '../src/components/ChoiceList';
import { Screen } from '../src/components/Screen';
import { Section } from '../src/components/Section';
import { TextField } from '../src/components/TextField';
import { colors, spacing } from '../src/constants/theme';
import { useAppData } from '../src/hooks/useAppData';

export default function SchoolsScreen() {
  const {
    schools,
    academicYears,
    classes,
    selectedSchoolId,
    selectSchool,
    createSchool,
    createAcademicYear,
    createClass,
    refresh,
  } = useAppData();
  const [schoolName, setSchoolName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [yearName, setYearName] = useState('2026-2027');
  const [className, setClassName] = useState('Grade 5');
  const [section, setSection] = useState('A');

  async function addSchool() {
    try {
      const school = await createSchool({ name: schoolName, city, state, country: 'India' });
      setSchoolName('');
      setCity('');
      setState('');
      await selectSchool(school.id);
      await refresh({ schoolId: school.id });
    } catch (error) {
      Alert.alert('School', error instanceof Error ? error.message : String(error));
    }
  }

  async function addYear() {
    if (!selectedSchoolId) {
      return;
    }

    await createAcademicYear({
      school_id: selectedSchoolId,
      name: yearName,
      start_date: `${yearName.slice(0, 4)}-06-01`,
      end_date: `${yearName.slice(-4)}-04-30`,
      is_active: true,
    });
    await refresh({ schoolId: selectedSchoolId });
  }

  async function addClass() {
    if (!selectedSchoolId) {
      return;
    }

    const activeYear = academicYears.find((year) => year.is_active) ?? academicYears[0];
    if (!activeYear) {
      Alert.alert('Class', 'Create an academic year first.');
      return;
    }

    await createClass({ school_id: selectedSchoolId, academic_year_id: activeYear.id, name: className, section });
    await refresh({ schoolId: selectedSchoolId });
  }

  return (
    <Screen title="Schools" subtitle="Create schools, academic years, classes, and sections for fast daily capture.">
      <Section title="Select school" meta={`${schools.length} schools`}>
        <ChoiceList
          choices={schools.map((school) => ({
            id: school.id,
            label: school.name,
            meta: [school.city, school.state, school.country].filter(Boolean).join(', '),
          }))}
          selectedId={selectedSchoolId}
          onSelect={(id) => void selectSchool(id)}
        />
      </Section>

      <Section title="Add school">
        <TextField label="School name" value={schoolName} onChangeText={setSchoolName} />
        <TextField label="City" value={city} onChangeText={setCity} />
        <TextField label="State" value={state} onChangeText={setState} />
        <AppButton label="Save school" onPress={() => void addSchool()} disabled={!schoolName.trim()} />
      </Section>

      <Section title="Academic years" meta={`${academicYears.length} saved`}>
        {academicYears.map((year) => (
          <Text key={year.id} style={styles.rowText}>
            {year.name} {year.is_active ? '(active)' : ''}
          </Text>
        ))}
        <TextField label="Academic year" value={yearName} onChangeText={setYearName} />
        <AppButton label="Add academic year" onPress={() => void addYear()} variant="secondary" />
      </Section>

      <Section title="Classes" meta={`${classes.length} saved`}>
        {classes.map((schoolClass) => (
          <View key={schoolClass.id} style={styles.classRow}>
            <Text style={styles.rowText}>{schoolClass.name}</Text>
            <Text style={styles.muted}>{schoolClass.section || 'No section'}</Text>
          </View>
        ))}
        <TextField label="Class/grade" value={className} onChangeText={setClassName} />
        <TextField label="Section" value={section} onChangeText={setSection} />
        <AppButton label="Add class" onPress={() => void addClass()} variant="secondary" />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  classRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  rowText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
});
