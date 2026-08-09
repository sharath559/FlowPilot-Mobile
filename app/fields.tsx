import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../src/components/AppButton';
import { ChoiceList } from '../src/components/ChoiceList';
import { Screen } from '../src/components/Screen';
import { Section } from '../src/components/Section';
import { TextField } from '../src/components/TextField';
import { colors, spacing } from '../src/constants/theme';
import { useAppData } from '../src/hooks/useAppData';
import type { FieldType } from '../src/types/domain';

const fieldTypes: FieldType[] = ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'PHONE', 'EMAIL'];

function toFieldKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([0-9])/, 'field_$1');
}

export default function FieldsScreen() {
  const { schools, selectedSchoolId, selectSchool, fieldDefinitions, createFieldDefinition, refresh } = useAppData();
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('TEXT');
  const [options, setOptions] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === selectedSchoolId),
    [schools, selectedSchoolId],
  );

  async function addField() {
    if (!selectedSchoolId) {
      return;
    }

    try {
      await createFieldDefinition({
        school_id: selectedSchoolId,
        field_key: toFieldKey(label),
        label,
        field_type: fieldType,
        is_required: isRequired,
        display_order: fieldDefinitions.length + 1,
        is_active: true,
        options: options
          .split(',')
          .map((option) => option.trim())
          .filter(Boolean),
      });
      setLabel('');
      setOptions('');
      setIsRequired(false);
      await refresh({ schoolId: selectedSchoolId });
    } catch (error) {
      Alert.alert('Custom field', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Screen title="Student fields" subtitle="Dynamic fields appear automatically on student forms, PDFs, and CSV exports.">
      <Section title="School" meta={selectedSchool?.name}>
        <ChoiceList
          choices={schools.map((school) => ({ id: school.id, label: school.name, meta: school.city }))}
          selectedId={selectedSchoolId}
          onSelect={(id) => void selectSchool(id)}
        />
      </Section>

      <Section title="Active fields" meta={`${fieldDefinitions.length} fields`}>
        {fieldDefinitions.map((field) => (
          <View key={field.id} style={styles.fieldRow}>
            <View>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <Text style={styles.fieldMeta}>
                {field.field_key} · {field.field_type} {field.is_required ? '· required' : ''}
              </Text>
            </View>
          </View>
        ))}
      </Section>

      <Section title="Add field">
        <TextField label="Label" value={label} onChangeText={setLabel} placeholder="Blood Group" />
        <View style={styles.typeGrid}>
          {fieldTypes.map((type) => (
            <Pressable
              key={type}
              accessibilityRole="button"
              onPress={() => setFieldType(type)}
              style={[styles.typeChip, type === fieldType && styles.typeChipSelected]}
            >
              <Text style={styles.typeText}>{type}</Text>
            </Pressable>
          ))}
        </View>
        {fieldType === 'SELECT' || fieldType === 'MULTI_SELECT' ? (
          <TextField label="Options" value={options} onChangeText={setOptions} placeholder="A+, B+, O+" />
        ) : null}
        <AppButton
          label={isRequired ? 'Required field' : 'Optional field'}
          onPress={() => setIsRequired((value) => !value)}
          variant="secondary"
        />
        <AppButton label="Save field" onPress={() => void addField()} disabled={!label.trim() || !selectedSchoolId} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  fieldMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  fieldRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: spacing.sm,
  },
  typeChip: {
    backgroundColor: '#FBFCFB',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  typeChipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
