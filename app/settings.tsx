import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { AppButton } from '../src/components/AppButton';
import { Screen } from '../src/components/Screen';
import { Section } from '../src/components/Section';
import { StatusNotice } from '../src/components/StatusNotice';
import { brand } from '../src/constants/branding';
import { colors, spacing } from '../src/constants/theme';
import { signOut } from '../src/features/auth/authService';
import { useAuth } from '../src/hooks/useAuth';
import { isSupabaseConfigured } from '../src/services/supabaseClient';

export default function SettingsScreen() {
  const { user, membership, isAdmin, accessError, refreshAccess } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [refreshingAccess, setRefreshingAccess] = useState(false);
  const [accessFeedback, setAccessFeedback] = useState<string>();

  const roleLabel = membership?.role.replaceAll('_', ' ').toLowerCase() ?? 'no membership';

  async function logout() {
    try {
      setSigningOut(true);
      await signOut();
      router.replace('/auth');
    } catch (error) {
      Alert.alert('Logout', error instanceof Error ? error.message : String(error));
    } finally {
      setSigningOut(false);
    }
  }

  async function refreshRole() {
    if (refreshingAccess) return;
    setRefreshingAccess(true);
    setAccessFeedback(undefined);
    try {
      await refreshAccess();
      setAccessFeedback('Account access was refreshed from Supabase.');
    } finally {
      setRefreshingAccess(false);
    }
  }

  return (
    <Screen title="Settings" subtitle="Manage account, sync, privacy, and school configuration.">
      <Section title="Account">
        <Text style={styles.meta}>Supabase: {isSupabaseConfigured ? 'Configured' : 'Not configured'}</Text>
        <Text style={styles.accountEmail}>{user?.email ?? 'Email unavailable'}</Text>
        <Text style={styles.meta}>Role: {roleLabel}</Text>
        <View style={styles.actions}>
          <AppButton label={signingOut ? 'Signing out...' : 'Sign out'} onPress={() => void logout()} loading={signingOut} variant="secondary" />
        </View>
      </Section>

      <Section title="Team access">
        {isAdmin ? (
          <StatusNotice
            tone="success"
            text="Organization administrator access is active. You can invite email addresses and manage member roles."
          />
        ) : (
          <StatusNotice
            tone="warning"
            text={`Your current role is ${roleLabel}. Invitations require the organization admin role.`}
          />
        )}
        {accessError ? <StatusNotice tone="danger" text={accessError} /> : null}
        {accessFeedback ? <StatusNotice tone="info" text={accessFeedback} /> : null}
        <View style={styles.actions}>
          {isAdmin ? <AppButton label="Invite or manage members" onPress={() => router.push('/team')} /> : null}
          <AppButton
            label={refreshingAccess ? 'Refreshing access...' : 'Refresh account access'}
            onPress={() => void refreshRole()}
            loading={refreshingAccess}
            disabled={refreshingAccess}
            variant="secondary"
          />
        </View>
      </Section>

      <Section title="Configuration">
        <View style={styles.actions}>
          <AppButton label="Schools and classes" onPress={() => router.push('/schools')} variant="secondary" />
          <AppButton label="Student fields" onPress={() => router.push('/fields')} variant="secondary" />
          <AppButton label="Offline sync" onPress={() => router.push('/sync')} variant="secondary" />
        </View>
      </Section>

      <Section title="Privacy">
        <Text style={styles.meta}>
          {brand.name} stores student records locally first, keeps photos private, and does not include analytics or
          third-party tracking SDKs. Supabase access is intended to be protected by Row Level Security.
        </Text>
      </Section>

      <Section title="About">
        <Text style={styles.meta}>App: {brand.name}</Text>
        <Text style={styles.meta}>Package: {brand.androidPackage}</Text>
        <Text style={styles.meta}>Version: 0.1.0</Text>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  accountEmail: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  actions: {
    gap: spacing.sm,
  },
  meta: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 21,
  },
});
