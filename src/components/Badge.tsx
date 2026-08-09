import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import type { SyncStatus } from '../types/domain';

type BadgeProps = {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[tone]]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function SyncBadge({ status }: { status: SyncStatus }) {
  const labelByStatus: Record<SyncStatus, string> = {
    FAILED: 'Sync failed',
    PENDING: 'Waiting to sync',
    SYNCED: 'Synced',
    SYNCING: 'Syncing',
  };

  const toneByStatus: Record<SyncStatus, BadgeProps['tone']> = {
    FAILED: 'danger',
    PENDING: 'warning',
    SYNCED: 'success',
    SYNCING: 'neutral',
  };

  return <Badge label={labelByStatus[status]} tone={toneByStatus[status]} />;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  danger: {
    backgroundColor: '#FFE8E8',
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  neutral: {
    backgroundColor: colors.border,
  },
  success: {
    backgroundColor: '#DDF7E5',
  },
  warning: {
    backgroundColor: '#FFF2C7',
  },
});
