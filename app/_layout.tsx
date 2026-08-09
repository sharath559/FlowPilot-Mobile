import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../src/constants/theme';
import { AppDataProvider } from '../src/hooks/useAppData';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
});

function AppNavigator() {
  const { isLoading, session, isAuthorized, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>Checking secure access</Text>
      </View>
    );
  }

  const navigator = (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Protected guard={!session}>
        <Stack.Screen name="auth" options={{ title: 'Secure access' }} />
      </Stack.Protected>

      <Stack.Screen name="accept-invite" options={{ title: 'Finish account setup', headerShown: false }} />

      <Stack.Protected guard={Boolean(session && !isAuthorized)}>
        <Stack.Screen name="access-denied" options={{ title: 'Access pending' }} />
      </Stack.Protected>

      <Stack.Protected guard={isAuthorized}>
        <Stack.Screen name="index" options={{ title: 'FlowPilot' }} />
        <Stack.Screen name="schools" options={{ title: 'Schools' }} />
        <Stack.Screen name="students" options={{ title: 'Students' }} />
        <Stack.Screen name="student-form" options={{ title: 'Student record' }} />
        <Stack.Screen name="student/[id]" options={{ title: 'Student detail' }} />
        <Stack.Screen name="daily" options={{ title: 'Daily records' }} />
        <Stack.Screen name="fields" options={{ title: 'Student fields' }} />
        <Stack.Screen name="sync" options={{ title: 'Offline sync' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Protected guard={isAdmin}>
          <Stack.Screen name="team" options={{ title: 'Team access' }} />
        </Stack.Protected>
      </Stack.Protected>
    </Stack>
  );

  return isAuthorized ? <AppDataProvider>{navigator}</AppDataProvider> : navigator;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: '800',
    letterSpacing: 0,
  },
});
