import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

type StatusNoticeProps = {
  text: string;
  tone?: 'success' | 'warning' | 'danger' | 'info';
};

export function StatusNotice({ text, tone = 'info' }: StatusNoticeProps) {
  return (
    <View accessibilityRole={tone === 'danger' ? 'alert' : undefined} style={[styles.notice, styles[tone]]}>
      <Text style={[styles.text, styles[`${tone}Text`]]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#F3B4B4',
  },
  dangerText: {
    color: colors.danger,
  },
  info: {
    backgroundColor: colors.infoSoft,
    borderColor: '#C8D6F0',
  },
  infoText: {
    color: colors.info,
  },
  notice: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  success: {
    backgroundColor: colors.accentSoft,
    borderColor: '#A8D8C9',
  },
  successText: {
    color: colors.accent,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 20,
  },
  warning: {
    backgroundColor: colors.warningSoft,
    borderColor: '#E8CD8A',
  },
  warningText: {
    color: colors.warning,
  },
});
