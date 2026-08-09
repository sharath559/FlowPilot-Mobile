import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { parseAuthCallbackUrl } from './authCallback';
import { supabase } from '../../services/supabaseClient';

WebBrowser.maybeCompleteAuthSession();

export type AuthUserSummary = {
  id: string;
  email: string | null;
};

export type AuthResult = {
  user: AuthUserSummary;
  needsEmailConfirmation: boolean;
};

export const authRedirectUrl = makeRedirectUri({
  scheme: 'flowpilot',
  path: 'auth',
});

function summarizeUser(user: { id: string; email?: string | null }): AuthUserSummary {
  return { id: user.id, email: user.email ?? null };
}

export async function getCurrentAuthUser(): Promise<AuthUserSummary | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }

  return data.session?.user ? summarizeUser(data.session.user) : null;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message);
  }

  if (!data.user || !data.session) {
    throw new Error('Supabase did not create a login session. Confirm your email, then try again.');
  }

  return { user: summarizeUser(data.user), needsEmailConfirmation: false };
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('Supabase did not create the account. Check the project authentication settings and try again.');
  }

  return {
    user: summarizeUser(data.user),
    needsEmailConfirmation: !data.session,
  };
}

export async function completeAuthSessionFromUrl(url: string): Promise<AuthResult | null> {
  const callback = parseAuthCallbackUrl(url);
  if (callback.error) throw new Error(callback.error);

  let result: AuthResult | null = null;

  if (callback.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(callback.code);
    if (error) throw new Error(error.message);
    if (!data.user || !data.session) return null;
    result = { user: summarizeUser(data.user), needsEmailConfirmation: false };
  }

  if (!result && callback.accessToken && callback.refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: callback.accessToken,
      refresh_token: callback.refreshToken,
    });
    if (error) throw new Error(error.message);
    if (!data.user || !data.session) return null;
    result = { user: summarizeUser(data.user), needsEmailConfirmation: false };
  }

  if (result && Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
  }

  return result;
}

export async function signInWithGoogle(): Promise<AuthResult | null> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: authRedirectUrl,
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });
  if (error) throw new Error(error.message);

  if (Platform.OS === 'web') {
    return null;
  }

  const browserResult = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUrl);
  if (browserResult.type !== 'success') {
    return null;
  }

  return completeAuthSessionFromUrl(browserResult.url);
}

export async function setInvitedUserPassword(password: string, displayName?: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password,
    data: {
      ...(displayName?.trim() ? { full_name: displayName.trim() } : {}),
      flowpilot_setup_completed: true,
    },
  });
  if (error) throw new Error(error.message);
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}
