import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function AppButton({ label, onPress, variant = 'primary', disabled, loading = false, style }: AppButtonProps) {
  const unavailable = Boolean(disabled || loading);
  const foregroundColor = variant === 'primary' ? colors.onAccent : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: unavailable }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        unavailable && styles.disabled,
        pressed && !unavailable && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={foregroundColor} size="small" /> : null}
        <Text style={[styles.label, variant !== 'primary' && styles.darkLabel]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 20,
  },
  danger: {
    backgroundColor: '#FFF0F0',
    borderColor: '#F3B4B4',
  },
  darkLabel: {
    color: colors.text,
  },
  disabled: {
    opacity: 0.45,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  label: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.82,
  },
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
});
