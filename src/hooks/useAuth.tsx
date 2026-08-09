import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import {
  getAuthCallbackFlow,
  hasAuthCallbackPayload,
  parseAuthCallbackUrl,
  takeInitialBrowserAuthUrl,
} from '../features/auth/authCallback';
import { completeAuthSessionFromUrl } from '../features/auth/authService';
import { supabase } from '../services/supabaseClient';
import type { OrganizationMember } from '../types/domain';

type AuthContextValue = {
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  membership: OrganizationMember | null;
  isAuthorized: boolean;
  isAdmin: boolean;
  pendingAccountSetup: boolean;
  accessError?: string;
  refreshAccess: () => Promise<void>;
  completeAccountSetup: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const accessLeaseDurationMs = 24 * 60 * 60 * 1000;
const accessRefreshIntervalMs = 5 * 60 * 1000;

type CachedAccess = {
  membership: OrganizationMember;
  verifiedAt: number;
};

function accessCacheKey(userId: string): string {
  return `flowpilot-access-${userId}`;
}

async function readCachedAccess(userId: string): Promise<CachedAccess | null> {
  try {
    const value = Platform.OS === 'web'
      ? await AsyncStorage.getItem(accessCacheKey(userId))
      : await SecureStore.getItemAsync(accessCacheKey(userId));
    if (!value) return null;
    const cached = JSON.parse(value) as CachedAccess;
    return Date.now() - cached.verifiedAt <= accessLeaseDurationMs ? cached : null;
  } catch {
    return null;
  }
}

async function writeCachedAccess(userId: string, membership: OrganizationMember | null): Promise<void> {
  try {
    const key = accessCacheKey(userId);
    if (!membership) {
      if (Platform.OS === 'web') await AsyncStorage.removeItem(key);
      else await SecureStore.deleteItemAsync(key);
      return;
    }

    const value = JSON.stringify({ membership, verifiedAt: Date.now() } satisfies CachedAccess);
    if (Platform.OS === 'web') await AsyncStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // A remote membership remains authoritative even if local lease storage fails.
  }
}

async function getMembership(userId: string): Promise<OrganizationMember | null> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('id, organization_id, user_id, role, email, display_name, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as OrganizationMember | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [accessError, setAccessError] = useState<string>();
  const [pendingAccountSetup, setPendingAccountSetup] = useState(false);

  const applySession = useCallback(async (nextSession: Session | null, preserveCurrentAccess = false) => {
    setSession(nextSession);
    if (!preserveCurrentAccess || !nextSession?.user) {
      setMembership(null);
    }
    if (!nextSession) {
      setPendingAccountSetup(false);
    }
    setAccessError(undefined);

    if (nextSession?.user) {
      try {
        const verifiedMembership = await getMembership(nextSession.user.id);
        setMembership(verifiedMembership);
        await writeCachedAccess(nextSession.user.id, verifiedMembership);
      } catch (error) {
        const cached = await readCachedAccess(nextSession.user.id);
        setMembership(cached?.membership ?? null);
        setAccessError(
          cached
            ? 'Using recently verified offline access. Team changes will be checked when the network returns.'
            : error instanceof Error
              ? error.message
              : String(error),
        );
      }
    }
    setIsLoading(false);
  }, []);

  const refreshAccess = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setAccessError(error.message);
      return;
    }
    await applySession(data.session, true);
  }, [applySession]);

  useEffect(() => {
    let mounted = true;
    let authSubscription: ReturnType<typeof supabase.auth.onAuthStateChange> | undefined;

    async function initialize() {
      try {
        const capturedBrowserUrl = Platform.OS === 'web' ? takeInitialBrowserAuthUrl() : null;
        const browserUrl = capturedBrowserUrl ?? (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : null);
        const initialUrl = browserUrl ?? await Linking.getInitialURL();
        const callback = parseAuthCallbackUrl(initialUrl);
        if (initialUrl) {
          if (callback.flow === 'invite') {
            setPendingAccountSetup(true);
          }

          if (Platform.OS === 'web') {
            const { error } = await supabase.auth.initialize();
            if (error && hasAuthCallbackPayload(callback)) throw error;

            const currentSession = await supabase.auth.getSession();
            if (currentSession.error) throw currentSession.error;
            if (!currentSession.data.session && hasAuthCallbackPayload(callback)) {
              await completeAuthSessionFromUrl(initialUrl);
            }
          } else {
            await completeAuthSessionFromUrl(initialUrl);
          }
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) {
          await applySession(data.session);
          if (!data.session && callback.flow === 'invite') {
            setPendingAccountSetup(true);
            setAccessError(
              hasAuthCallbackPayload(callback)
                ? 'The secure invitation could not create a session. The link may be expired or already used.'
                : 'This page did not receive secure invitation credentials. Open the Accept invitation button in the newest email.',
            );
          }
        }
      } catch (error) {
        if (mounted) {
          setAccessError(error instanceof Error ? error.message : String(error));
          setIsLoading(false);
        }
      }

      if (mounted) {
        authSubscription = supabase.auth.onAuthStateChange((event, nextSession) => {
          if (!mounted) return;
          if (event === 'INITIAL_SESSION') return;
          setTimeout(() => {
            if (mounted) void applySession(nextSession);
          }, 0);
        });
      }
    }

    void initialize();

    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      void (async () => {
        try {
          if (getAuthCallbackFlow(url) === 'invite') {
            setPendingAccountSetup(true);
          }
          await completeAuthSessionFromUrl(url);
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (mounted) await applySession(data.session);
        } catch (error) {
          if (mounted) setAccessError(error instanceof Error ? error.message : String(error));
        }
      })();
    });

    return () => {
      mounted = false;
      authSubscription?.data.subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [applySession]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshAccess();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void refreshAccess();
    }, accessRefreshIntervalMs);

    return () => {
      appStateSubscription.remove();
      clearInterval(interval);
    };
  }, [refreshAccess]);

  const completeAccountSetup = useCallback(() => {
    setPendingAccountSetup(false);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const isAuthorized = Boolean(session && membership);
    return {
      isLoading,
      session,
      user: session?.user ?? null,
      membership,
      isAuthorized,
      isAdmin: membership?.role === 'SUPER_ADMIN' || membership?.role === 'ORG_ADMIN',
      pendingAccountSetup,
      accessError,
      refreshAccess,
      completeAccountSetup,
    };
  }, [accessError, completeAccountSetup, isLoading, membership, pendingAccountSetup, refreshAccess, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
