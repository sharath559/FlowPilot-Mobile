import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

type MetricCardProps = {
  label: string;
  value: string;
};

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minHeight: 92,
    padding: spacing.md,
  },
  value: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 18,
  },
});
