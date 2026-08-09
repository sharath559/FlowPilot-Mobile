import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

type SectionProps = {
  title?: string;
  meta?: string;
  children: ReactNode;
};

export function Section({ title, meta, children }: SectionProps) {
  return (
    <View style={styles.wrap}>
      {title || meta ? (
        <View style={styles.header}>
          {title ? <Text style={styles.title}>{title}</Text> : <View />}
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  wrap: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
});
