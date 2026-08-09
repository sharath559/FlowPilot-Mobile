import type { ReactNode } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../constants/theme';

type ScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Screen({ title, subtitle, children, footer }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  footer: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 22,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
