import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../src/components/AppButton';
import { Screen } from '../src/components/Screen';
import { Section } from '../src/components/Section';
import { StatusNotice } from '../src/components/StatusNotice';
import { colors, spacing } from '../src/constants/theme';
import { signOut } from '../src/features/auth/authService';
import { useAuth } from '../src/hooks/useAuth';

export default function AccessDeniedScreen() {
  const { user, accessError, refreshAccess } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string>();

  async function checkAgain() {
    setRefreshing(true);
    setMessage(undefined);
    try {
      await refreshAccess();
      setMessage('Access was checked again. Ask an administrator if this screen remains visible.');
    } finally {
      setRefreshing(false);
    }
  }

  async function logout() {
    await signOut();
    router.replace('/auth');
  }

  return (
    <Screen title="Access pending" subtitle="This signed-in identity is not assigned to a FlowPilot organization.">
      <Section title="Signed-in email">
        <Text style={styles.email}>{user?.email ?? 'Email unavailable'}</Text>
        <Text style={styles.meta}>An organization owner must invite this exact email address.</Text>
      </Section>

      <Section title="Actions">
        <View style={styles.actions}>
          <AppButton label={refreshing ? 'Checking access...' : 'Check access again'} onPress={() => void checkAgain()} loading={refreshing} />
          <AppButton label="Use another account" onPress={() => void logout()} variant="secondary" />
          {accessError ? <StatusNotice tone="danger" text={accessError} /> : null}
          {message ? <StatusNotice tone="info" text={message} /> : null}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  email: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 21,
  },
});
