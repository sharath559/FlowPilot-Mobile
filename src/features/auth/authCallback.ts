export type AuthCallbackFlow = 'invite' | 'recovery';

export type AuthCallback = {
  flow: AuthCallbackFlow | null;
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
};

export function parseAuthCallbackUrl(url: string | null | undefined): AuthCallback {
  if (!url) return { flow: null };

  try {
    const parsed = new URL(url);
    const params = new URLSearchParams(parsed.search);
    new URLSearchParams(parsed.hash.replace(/^#/, '')).forEach((value, key) => {
      params.set(key, value);
    });

    const flowValue = params.get('flow') ?? params.get('type');
    const flow = flowValue === 'invite' || flowValue === 'recovery' ? flowValue : null;
    const error = params.get('error_description') ?? params.get('error') ?? params.get('errorCode') ?? undefined;

    return {
      flow,
      code: params.get('code') ?? undefined,
      accessToken: params.get('access_token') ?? undefined,
      refreshToken: params.get('refresh_token') ?? undefined,
      error,
    };
  } catch {
    return { flow: null, error: 'The authentication link is not a valid URL.' };
  }
}

export function getAuthCallbackFlow(url: string | null | undefined): AuthCallbackFlow | null {
  return parseAuthCallbackUrl(url).flow;
}
