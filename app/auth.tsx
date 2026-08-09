import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../src/components/AppButton';
import { Screen } from '../src/components/Screen';
import { Section } from '../src/components/Section';
import { TextField } from '../src/components/TextField';
import { colors, spacing } from '../src/constants/theme';
import {
  getCurrentAuthUser,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  type AuthUserSummary,
} from '../src/features/auth/authService';
import { isSupabaseConfigured } from '../src/services/supabaseClient';
import { authEmailOnlySchema, authEmailSchema } from '../src/validation/schemas';

type AuthAction = 'google' | 'signIn' | 'signUp' | 'reset';

type AuthMessage = {
  tone: 'success' | 'error' | 'info';
  text: string;
};

type AuthFieldErrors = {
  email?: string;
  password?: string;
};

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<AuthMessage>();
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [activeAction, setActiveAction] = useState<AuthAction>();
  const [currentUser, setCurrentUser] = useState<AuthUserSummary | null>(null);

  useEffect(() => {
    let mounted = true;

    getCurrentAuthUser()
      .then((user) => {
        if (mounted) {
          setCurrentUser(user);
          if (user) {
            router.replace('/');
          }
        }
      })
      .catch(() => {
        // The user can still use the form and will receive the full error there.
      });

    return () => {
      mounted = false;
    };
  }, []);

  function updateEmail(value: string) {
    setEmail(value);
    setFieldErrors((current) => ({ ...current, email: undefined }));
    setMessage(undefined);
  }

  function updatePassword(value: string) {
    setPassword(value);
    setFieldErrors((current) => ({ ...current, password: undefined }));
    setMessage(undefined);
  }

  async function runAuth(action: AuthAction) {
    if (activeAction) {
      return;
    }

    setMessage(undefined);
    setFieldErrors({});

    try {
      if (!isSupabaseConfigured) {
        setMessage({ tone: 'error', text: 'Add the Supabase project URL and publishable key to .env.' });
        return;
      }

      if (action === 'google') {
        setActiveAction(action);
        const result = await signInWithGoogle();
        if (result) {
          setCurrentUser(result.user);
          router.replace('/');
        }
        return;
      }

      const validation =
        action === 'reset'
          ? authEmailOnlySchema.safeParse({ email })
          : authEmailSchema.safeParse({ email, password });

      if (!validation.success) {
        const errors: AuthFieldErrors = {};
        for (const issue of validation.error.issues) {
          const field = issue.path[0];
          if ((field === 'email' || field === 'password') && !errors[field]) {
            errors[field] = issue.message;
          }
        }
        setFieldErrors(errors);
        setMessage({ tone: 'error', text: validation.error.issues[0]?.message ?? 'Check your account details.' });
        return;
      }

      setActiveAction(action);

      if (action === 'reset') {
        await resetPassword(validation.data.email);
        setMessage({
          tone: 'success',
          text: 'Password reset requested. Check your email for the recovery link.',
        });
        return;
      }

      if (action === 'signIn') {
        const result = await signInWithEmail(validation.data.email, password);
        setCurrentUser(result.user);
        setMessage({ tone: 'success', text: `Signed in as ${result.user.email ?? validation.data.email}.` });
        router.replace('/');
      } else {
        const result = await signUpWithEmail(validation.data.email, password);
        setCurrentUser(result.needsEmailConfirmation ? null : result.user);
        setMessage(
          result.needsEmailConfirmation
            ? {
                tone: 'info',
                text: 'Check your email and confirm the account. Then return here and sign in.',
              }
            : {
                tone: 'success',
                text: `Account created and signed in as ${result.user.email ?? validation.data.email}.`,
              },
        );
        if (!result.needsEmailConfirmation) {
          router.replace('/');
        }
      }
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setActiveAction(undefined);
    }
  }

  return (
    <Screen title="Secure access" subtitle="FlowPilot is invitation-only. Use the exact email your administrator invited.">
      <Section title="Account">
        {currentUser ? (
          <View style={styles.sessionBanner}>
            <Text style={styles.sessionLabel}>Signed in</Text>
            <Text style={styles.sessionText}>{currentUser.email ?? currentUser.id}</Text>
          </View>
        ) : null}
        <AppButton
          label={activeAction === 'google' ? 'Opening Google...' : 'Continue with Google'}
          onPress={() => void runAuth('google')}
          disabled={Boolean(activeAction)}
          loading={activeAction === 'google'}
        />
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or use email</Text>
          <View style={styles.dividerLine} />
        </View>
        <TextField
          label="Email"
          value={email}
          onChangeText={updateEmail}
          keyboardType="email-address"
          error={fieldErrors.email}
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={updatePassword}
          secureTextEntry
          error={fieldErrors.password}
        />
        <View style={styles.actions}>
          <AppButton
            label={activeAction === 'signIn' ? 'Signing in...' : 'Sign in'}
            onPress={() => void runAuth('signIn')}
            disabled={Boolean(activeAction)}
            loading={activeAction === 'signIn'}
          />
          <AppButton
            label={activeAction === 'signUp' ? 'Checking invitation...' : 'Register invited email'}
            onPress={() => void runAuth('signUp')}
            variant="secondary"
            disabled={Boolean(activeAction)}
            loading={activeAction === 'signUp'}
          />
          <AppButton
            label={activeAction === 'reset' ? 'Sending...' : 'Forgot password'}
            onPress={() => void runAuth('reset')}
            variant="ghost"
            disabled={Boolean(activeAction)}
            loading={activeAction === 'reset'}
          />
        </View>
        {message ? (
          <Text
            accessibilityRole={message.tone === 'error' ? 'alert' : undefined}
            style={[styles.message, styles[`${message.tone}Message`]]}
          >
            {message.text}
          </Text>
        ) : null}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dividerLine: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  message: {
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 20,
    padding: spacing.sm,
  },
  errorMessage: {
    backgroundColor: '#FFF0F0',
    color: '#B42318',
  },
  infoMessage: {
    backgroundColor: '#EEF4FF',
    color: '#344C80',
  },
  sessionBanner: {
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  sessionLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  sessionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
  },
  successMessage: {
    backgroundColor: colors.accentSoft,
    color: colors.accent,
  },
});
