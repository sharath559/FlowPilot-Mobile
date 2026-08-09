import { StyleSheet, Text, TextInput, type KeyboardTypeOptions } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

type TextFieldProps = {
  label: string;
  value?: string | null;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  error?: string;
  secureTextEntry?: boolean;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  error,
  secureTextEntry,
}: TextFieldProps) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline && styles.multiline, error && styles.errorInput]}
        value={value ?? ''}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  errorInput: {
    borderColor: '#D64545',
  },
  errorText: {
    color: '#B42318',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  input: {
    backgroundColor: '#FBFCFB',
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  multiline: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
});
