import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../src/components/AppButton';
import { Screen } from '../src/components/Screen';
import { Section } from '../src/components/Section';
import { StatusNotice } from '../src/components/StatusNotice';
import { TextField } from '../src/components/TextField';
import { colors, spacing } from '../src/constants/theme';
import { setInvitedUserPassword } from '../src/features/auth/authService';
import { useAuth } from '../src/hooks/useAuth';
import { inviteAcceptanceSchema } from '../src/validation/schemas';

type Errors = { displayName?: string; password?: string; confirmPassword?: string };

export default function AcceptInviteScreen() {
  const { session, membership, pendingAccountSetup, accessError, completeAccountSetup, refreshAccess } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  const setupCompleted = session?.user.user_metadata.flowpilot_setup_completed === true;

  async function finishSetup() {
    setErrors({});
    setMessage(undefined);
    const parsed = inviteAcceptanceSchema.safeParse({ displayName, password, confirmPassword });
    if (!parsed.success) {
      const nextErrors: Errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof Errors;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      setMessage(parsed.error.issues[0]?.message ?? 'Check the account details.');
      return;
    }

    setSaving(true);
    try {
      await setInvitedUserPassword(parsed.data.password, parsed.data.displayName);
      completeAccountSetup();
      await refreshAccess();
      router.replace('/');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  if (session && membership && (!pendingAccountSetup || setupCompleted)) {
    return <Redirect href="/" />;
  }

  if (!session) {
    return (
      <Screen title="Finish account setup" subtitle="Open the newest FlowPilot invitation link from your email.">
        <Section title="Invitation required">
          <StatusNotice
            tone="warning"
            text={accessError
              ? `FlowPilot could not open this invitation: ${accessError}`
              : 'The invitation session is missing or expired. Ask your administrator to send a new invitation.'}
          />
          <AppButton label="Go to sign in" onPress={() => router.replace('/auth')} variant="secondary" />
        </Section>
      </Screen>
    );
  }

  return (
    <Screen title="Finish account setup" subtitle={`Secure access for ${session.user.email ?? 'your invited email'}.`}>
      <Section title="Your profile">
        <TextField label="Name" value={displayName} onChangeText={setDisplayName} error={errors.displayName} />
        <TextField label="Create password" value={password} onChangeText={setPassword} secureTextEntry error={errors.password} />
        <TextField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry error={errors.confirmPassword} />
        <View style={styles.actions}>
          <AppButton label={saving ? 'Finishing setup...' : 'Finish setup'} onPress={() => void finishSetup()} loading={saving} />
          {membership ? (
            <AppButton
              label="Already finished? Continue to FlowPilot"
              onPress={() => {
                completeAccountSetup();
                router.replace('/');
              }}
              variant="ghost"
            />
          ) : null}
        </View>
        {message ? <StatusNotice tone="danger" text={message} /> : null}
      </Section>

      <Text style={styles.meta}>Your invitation is tied to this exact email. Passwords are handled by Supabase Auth and are never stored in FlowPilot.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 20,
  },
});
