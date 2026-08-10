// Deno resolves npm: specifiers when the Edge Function is built.
// eslint-disable-next-line import/no-unresolved
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';

type MemberRole = 'ORG_ADMIN' | 'SCHOOL_ADMIN' | 'STAFF';
type AdminAction = 'invite' | 'generate_invite_link' | 'remove' | 'change_role' | 'revoke_invitation';

type AdminRequest = {
  action?: AdminAction;
  organizationId?: string;
  email?: string;
  role?: MemberRole;
  userId?: string;
  invitationId?: string;
};

type Membership = {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'SUPER_ADMIN' | MemberRole;
  email: string | null;
  display_name: string | null;
};

type PreparedInvitation = {
  email: string;
  role: MemberRole;
  invitationId: string;
  redirectTo: string;
};

const allowedRoles = new Set<MemberRole>(['ORG_ADMIN', 'SCHOOL_ADMIN', 'STAFF']);
const roleLabels: Record<MemberRole, string> = {
  ORG_ADMIN: 'organization administrator',
  SCHOOL_ADMIN: 'school administrator',
  STAFF: 'staff member',
};
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
  });
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function invitationRedirect(value: string): string {
  const redirect = new URL(value);
  redirect.searchParams.set('flow', 'invite');
  return redirect.toString();
}

async function requireOrganizationAdmin(
  admin: SupabaseClient,
  userId: string,
  organizationId: string,
): Promise<Membership> {
  const { data, error } = await admin
    .from('organization_members')
    .select('id, organization_id, user_id, role, email, display_name')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .in('role', ['SUPER_ADMIN', 'ORG_ADMIN'])
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Only an organization administrator can manage team access.');
  return data as Membership;
}

async function writeAudit(
  admin: SupabaseClient,
  values: {
    organization_id: string;
    actor_user_id: string;
    action: 'INVITE_SENT' | 'INVITATION_REVOKED' | 'ROLE_CHANGED' | 'MEMBER_REMOVED';
    target_user_id?: string | null;
    target_email?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await admin.from('access_audit_log').insert(values);
  if (error) throw error;
}

async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  let page = 1;
  const perPage = 200;

  while (page <= 5) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < perPage) return null;
    page += 1;
  }

  throw new Error('The auth user directory is too large to search safely. Contact the platform owner.');
}

async function prepareInvitation(
  admin: SupabaseClient,
  actor: Membership,
  request: AdminRequest,
): Promise<PreparedInvitation | Response> {
  const email = normalizeEmail(request.email);
  const role = request.role;
  if (!emailPattern.test(email)) return json({ error: 'Enter a valid email address.' }, 400);
  if (!role || !allowedRoles.has(role)) return json({ error: 'Choose a valid member role.' }, 400);

  const { data: existingMember, error: memberError } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', actor.organization_id)
    .eq('email', email)
    .maybeSingle();
  if (memberError) throw memberError;
  if (existingMember) return json({ error: 'This email already has access to the organization.' }, 409);

  const { data: existingInvitation, error: invitationLookupError } = await admin
    .from('organization_invitations')
    .select('id')
    .eq('organization_id', actor.organization_id)
    .eq('email', email)
    .eq('status', 'PENDING')
    .maybeSingle();
  if (invitationLookupError) throw invitationLookupError;

  let invitationId = existingInvitation?.id as string | undefined;
  if (invitationId) {
    const { error } = await admin
      .from('organization_invitations')
      .update({ role, invited_by: actor.user_id, expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(), last_error: null })
      .eq('id', invitationId);
    if (error) throw error;
  } else {
    const { data, error } = await admin
      .from('organization_invitations')
      .insert({ organization_id: actor.organization_id, email, role, invited_by: actor.user_id })
      .select('id')
      .single();
    if (error) throw error;
    invitationId = data.id as string;
  }

  const redirectTo = invitationRedirect(
    Deno.env.get('FLOWPILOT_APP_REDIRECT_URL') ?? 'flowpilot://accept-invite',
  );

  return { email, role, invitationId, redirectTo };
}

async function inviteMember(
  admin: SupabaseClient,
  actor: Membership,
  request: AdminRequest,
): Promise<Response> {
  const prepared = await prepareInvitation(admin, actor, request);
  if (prepared instanceof Response) return prepared;

  const { email, role, invitationId, redirectTo } = prepared;
  const existingAuthUser = await findAuthUserByEmail(admin, email);

  if (existingAuthUser) {
    const { error: membershipError } = await admin.from('organization_members').upsert(
      {
        organization_id: actor.organization_id,
        user_id: existingAuthUser.id,
        role,
        email,
        display_name: existingAuthUser.user_metadata?.full_name ?? existingAuthUser.user_metadata?.name ?? null,
      },
      { onConflict: 'organization_id,user_id' },
    );
    if (membershipError) throw membershipError;

    const { error: invitationError } = await admin
      .from('organization_invitations')
      .update({ status: 'ACCEPTED', accepted_by: existingAuthUser.id, last_error: null })
      .eq('id', invitationId);
    if (invitationError) throw invitationError;

    await writeAudit(admin, {
      organization_id: actor.organization_id,
      actor_user_id: actor.user_id,
      action: 'INVITE_SENT',
      target_user_id: existingAuthUser.id,
      target_email: email,
      metadata: { role, existing_user: true },
    });

    return json({
      message: 'The existing FlowPilot account now has access. Ask the user to sign in with this email.',
    });
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      organization_id: actor.organization_id,
      invited_role: role,
      invited_role_label: roleLabels[role],
      invited_by_name: actor.display_name?.trim() || 'Sharath',
    },
  });

  if (inviteError) {
    await admin
      .from('organization_invitations')
      .update({ last_error: inviteError.message })
      .eq('id', invitationId);
    return json({ error: inviteError.message }, 400);
  }

  await writeAudit(admin, {
    organization_id: actor.organization_id,
    actor_user_id: actor.user_id,
    action: 'INVITE_SENT',
    target_user_id: invited.user?.id ?? null,
    target_email: email,
    metadata: { role, existing_user: false },
  });

  return json({ message: `Invitation sent to ${email}.` });
}

async function generateInviteLink(
  admin: SupabaseClient,
  actor: Membership,
  request: AdminRequest,
): Promise<Response> {
  const prepared = await prepareInvitation(admin, actor, request);
  if (prepared instanceof Response) return prepared;

  const { email, role, invitationId, redirectTo } = prepared;
  const existingAuthUser = await findAuthUserByEmail(admin, email);
  if (existingAuthUser) {
    return json({ error: 'This email already has a FlowPilot account. Ask the user to sign in or remove the account before creating a new link.' }, 409);
  }

  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo,
      data: {
        organization_id: actor.organization_id,
        invited_role: role,
        invited_role_label: roleLabels[role],
        invited_by_name: actor.display_name?.trim() || 'Sharath',
      },
    },
  });

  if (linkError) {
    await admin
      .from('organization_invitations')
      .update({ last_error: linkError.message })
      .eq('id', invitationId);
    return json({ error: linkError.message }, 400);
  }

  const inviteLink = data.properties?.action_link;
  if (!inviteLink) return json({ error: 'Supabase did not return an invitation link.' }, 500);

  await writeAudit(admin, {
    organization_id: actor.organization_id,
    actor_user_id: actor.user_id,
    action: 'INVITE_SENT',
    target_user_id: data.user?.id ?? null,
    target_email: email,
    metadata: { role, existing_user: false, delivery: 'manual_link' },
  });

  return json({
    message: `Private invitation link generated for ${email}. No email was sent.`,
    email,
    inviteLink,
  });
}

async function removeMember(
  admin: SupabaseClient,
  actor: Membership,
  request: AdminRequest,
): Promise<Response> {
  if (!request.userId) return json({ error: 'A member is required.' }, 400);
  if (request.userId === actor.user_id) return json({ error: 'You cannot remove your own administrator account.' }, 400);

  const { data: target, error: targetError } = await admin
    .from('organization_members')
    .select('id, organization_id, user_id, role, email')
    .eq('organization_id', actor.organization_id)
    .eq('user_id', request.userId)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!target) return json({ error: 'Member not found.' }, 404);

  if (target.role === 'SUPER_ADMIN' || target.role === 'ORG_ADMIN') {
    const { count, error } = await admin
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', actor.organization_id)
      .in('role', ['SUPER_ADMIN', 'ORG_ADMIN']);
    if (error) throw error;
    if ((count ?? 0) <= 1) return json({ error: 'Add another organization administrator before removing the final owner.' }, 409);
  }

  const { count: otherMemberships, error: membershipCountError } = await admin
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', target.user_id)
    .neq('organization_id', actor.organization_id);
  if (membershipCountError) throw membershipCountError;

  if ((otherMemberships ?? 0) === 0) {
    const { error } = await admin.auth.admin.deleteUser(target.user_id);
    if (error) throw error;
  } else {
    const { error } = await admin.from('organization_members').delete().eq('id', target.id);
    if (error) throw error;
  }

  if (target.email) {
    await admin
      .from('organization_invitations')
      .update({ status: 'REVOKED' })
      .eq('organization_id', actor.organization_id)
      .eq('email', target.email)
      .in('status', ['PENDING', 'ACCEPTED']);
  }

  await writeAudit(admin, {
    organization_id: actor.organization_id,
    actor_user_id: actor.user_id,
    action: 'MEMBER_REMOVED',
    target_user_id: (otherMemberships ?? 0) > 0 ? target.user_id : null,
    target_email: target.email,
    metadata: { deleted_auth_user: (otherMemberships ?? 0) === 0, previous_role: target.role },
  });

  return json({ message: `${target.email ?? 'The member'} no longer has access.` });
}

async function changeRole(
  admin: SupabaseClient,
  actor: Membership,
  request: AdminRequest,
): Promise<Response> {
  if (!request.userId) return json({ error: 'A member is required.' }, 400);
  if (!request.role || !allowedRoles.has(request.role)) return json({ error: 'Choose a valid role.' }, 400);
  if (request.userId === actor.user_id) return json({ error: 'Another owner must change your administrator role.' }, 400);

  const { data: target, error: targetError } = await admin
    .from('organization_members')
    .select('id, organization_id, user_id, role, email')
    .eq('organization_id', actor.organization_id)
    .eq('user_id', request.userId)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!target) return json({ error: 'Member not found.' }, 404);

  if ((target.role === 'SUPER_ADMIN' || target.role === 'ORG_ADMIN') && request.role !== 'ORG_ADMIN') {
    const { count, error } = await admin
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', actor.organization_id)
      .in('role', ['SUPER_ADMIN', 'ORG_ADMIN']);
    if (error) throw error;
    if ((count ?? 0) <= 1) return json({ error: 'The final organization administrator cannot be demoted.' }, 409);
  }

  const { error } = await admin
    .from('organization_members')
    .update({ role: request.role })
    .eq('id', target.id);
  if (error) throw error;

  await writeAudit(admin, {
    organization_id: actor.organization_id,
    actor_user_id: actor.user_id,
    action: 'ROLE_CHANGED',
    target_user_id: target.user_id,
    target_email: target.email,
    metadata: { previous_role: target.role, role: request.role },
  });

  return json({ message: `${target.email ?? 'Member'} is now ${request.role.replaceAll('_', ' ').toLowerCase()}.` });
}

async function revokeInvitation(
  admin: SupabaseClient,
  actor: Membership,
  request: AdminRequest,
): Promise<Response> {
  if (!request.invitationId) return json({ error: 'An invitation is required.' }, 400);

  const { data, error } = await admin
    .from('organization_invitations')
    .update({ status: 'REVOKED' })
    .eq('id', request.invitationId)
    .eq('organization_id', actor.organization_id)
    .eq('status', 'PENDING')
    .select('email')
    .maybeSingle();
  if (error) throw error;
  if (!data) return json({ error: 'Pending invitation not found.' }, 404);

  await writeAudit(admin, {
    organization_id: actor.organization_id,
    actor_user_id: actor.user_id,
    action: 'INVITATION_REVOKED',
    target_email: data.email,
  });

  return json({ message: `Invitation for ${data.email} was revoked.` });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
    const secretKey = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = request.headers.get('Authorization');
    if (!supabaseUrl || !publishableKey || !secretKey) return json({ error: 'Server configuration is incomplete.' }, 500);
    if (!authorization) return json({ error: 'Authentication is required.' }, 401);

    const callerClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Your session is invalid or expired.' }, 401);

    const body = (await request.json()) as AdminRequest;
    if (!body.organizationId) return json({ error: 'An organization is required.' }, 400);
    const actor = await requireOrganizationAdmin(admin, userData.user.id, body.organizationId);

    switch (body.action) {
      case 'invite':
        return await inviteMember(admin, actor, body);
      case 'generate_invite_link':
        return await generateInviteLink(admin, actor, body);
      case 'remove':
        return await removeMember(admin, actor, body);
      case 'change_role':
        return await changeRole(admin, actor, body);
      case 'revoke_invitation':
        return await revokeInvitation(admin, actor, body);
      default:
        return json({ error: 'Unsupported admin action.' }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return json({ error: message }, message.includes('administrator') ? 403 : 500);
  }
});
