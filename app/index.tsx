import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../src/components/AppButton';
import { Badge } from '../src/components/Badge';
import { MetricCard } from '../src/components/MetricCard';
import { Screen } from '../src/components/Screen';
import { Section } from '../src/components/Section';
import { StatusNotice } from '../src/components/StatusNotice';
import { brand } from '../src/constants/branding';
import { colors, spacing } from '../src/constants/theme';
import { useAppData } from '../src/hooks/useAppData';
import { useAuth } from '../src/hooks/useAuth';

export default function DashboardScreen() {
  const { isAdmin } = useAuth();
  const { isReady, isOnline, selectedSchoolId, schools, academicYears, dashboardStats, syncSummary, syncNow } =
    useAppData();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    tone: 'success' | 'warning' | 'danger';
    text: string;
  }>();
  const selectedSchool = schools.find((school) => school.id === selectedSchoolId);
  const activeYear = academicYears.find((year) => year.is_active) ?? academicYears[0];

  async function runSync() {
    if (isSyncing) {
      return;
    }

    setIsSyncing(true);
    setSyncFeedback(undefined);
    try {
      const result = await syncNow();
      setSyncFeedback({
        tone: result.failed ? 'danger' : result.skipped ? 'warning' : 'success',
        text: result.message,
      });
    } catch (error) {
      setSyncFeedback({ tone: 'danger', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsSyncing(false);
    }
  }

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>Preparing offline records</Text>
      </View>
    );
  }

  return (
    <Screen
      title="Today"
      subtitle={`${brand.name} keeps student capture fast, local-first, and ready to sync when the network returns.`}
    >
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
          <Text style={styles.bannerText}>
            {isOnline ? 'Records can sync now.' : 'New records are saved on this device first.'}
          </Text>
        </View>
        <Badge label={`${syncSummary.pending + syncSummary.failed} queued`} tone={syncSummary.failed ? 'danger' : 'neutral'} />
      </View>

      <Section title="Current context" meta={activeYear?.name}>
        <Text style={styles.contextTitle}>{selectedSchool?.name ?? 'No school selected'}</Text>
        <Text style={styles.contextText}>
          {selectedSchool ? `${selectedSchool.city ?? 'City not set'} · ${selectedSchool.country ?? 'Country not set'}` : 'Create or select a school to begin.'}
        </Text>
      </Section>

      <View style={styles.metrics}>
        <MetricCard label="Students today" value={String(dashboardStats.studentsToday)} />
        <MetricCard label="All students" value={String(dashboardStats.totalStudents)} />
      </View>
      <View style={styles.metrics}>
        <MetricCard label="Pending sync" value={String(dashboardStats.pendingSync)} />
        <MetricCard label="Classes" value={String(dashboardStats.classes)} />
      </View>

      <Section title="Quick actions">
        <View style={styles.actions}>
          <AppButton label="Add student" onPress={() => router.push('/student-form')} />
          <AppButton label="View students" onPress={() => router.push('/students')} variant="secondary" />
          <AppButton label="Daily records" onPress={() => router.push('/daily')} variant="secondary" />
          <AppButton label="Schools/classes" onPress={() => router.push('/schools')} variant="secondary" />
          <AppButton label="Custom fields" onPress={() => router.push('/fields')} variant="secondary" />
          {isAdmin ? <AppButton label="Team access" onPress={() => router.push('/team')} variant="secondary" /> : null}
          <AppButton
            label={isSyncing ? 'Syncing...' : 'Sync now'}
            onPress={() => void runSync()}
            variant="secondary"
            loading={isSyncing}
          />
          {syncFeedback ? <StatusNotice tone={syncFeedback.tone} text={syncFeedback.text} /> : null}
          <AppButton label="Settings" onPress={() => router.push('/settings')} variant="ghost" />
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
  banner: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  bannerLabel: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  bannerText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
  },
  contextText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0,
  },
  contextTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  loading: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
