import { supabase } from '../../services/supabaseClient';
import type { OrganizationInvitation, OrganizationMember, UserRole } from '../../types/domain';

export type AssignableRole = Exclude<UserRole, 'SUPER_ADMIN'>;

export type TeamAccess = {
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
};

export type GeneratedOrganizationInvite = {
  email: string;
  inviteLink: string;
  message: string;
};

type AdminActionResult = {
  message: string;
  email?: string;
  inviteLink?: string;
};

export async function listTeamAccess(organizationId: string): Promise<TeamAccess> {
  const [membersResult, invitationsResult] = await Promise.all([
    supabase
      .from('organization_members')
      .select('id, organization_id, user_id, role, email, display_name, created_at, updated_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true }),
    supabase
      .from('organization_invitations')
      .select('id, organization_id, email, role, status, invited_by, accepted_by, expires_at, last_error, created_at, updated_at')
      .eq('organization_id', organizationId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false }),
  ]);

  if (membersResult.error) throw new Error(membersResult.error.message);
  if (invitationsResult.error) throw new Error(invitationsResult.error.message);

  return {
    members: membersResult.data as OrganizationMember[],
    invitations: invitationsResult.data as OrganizationInvitation[],
  };
}

async function getFunctionErrorMessage(error: unknown, responseData: unknown): Promise<string> {
  if (responseData && typeof responseData === 'object' && 'error' in responseData) {
    const message = (responseData as { error?: unknown }).error;
    if (typeof message === 'string') return message;
  }

  const context = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context;
  if (context?.json) {
    try {
      const body = await context.json();
      if (body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string') {
        return (body as { error: string }).error;
      }
    } catch {
      // Fall through to the SDK error message.
    }
  }

  return error instanceof Error ? error.message : String(error);
}

async function runAdminAction(
  body: Record<string, unknown>,
): Promise<AdminActionResult> {
  const { data, error } = await supabase.functions.invoke('admin-members', { body });
  if (error) throw new Error(await getFunctionErrorMessage(error, data));
  if (data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string') {
    throw new Error((data as { error: string }).error);
  }
  const result = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  return {
    message: typeof result.message === 'string' ? result.message : 'Access was updated.',
    email: typeof result.email === 'string' ? result.email : undefined,
    inviteLink: typeof result.inviteLink === 'string' ? result.inviteLink : undefined,
  };
}

export function inviteOrganizationMember(
  organizationId: string,
  email: string,
  role: AssignableRole,
): Promise<string> {
  return runAdminAction({ action: 'invite', organizationId, email, role }).then((result) => result.message);
}

export async function generateOrganizationInviteLink(
  organizationId: string,
  email: string,
  role: AssignableRole,
): Promise<GeneratedOrganizationInvite> {
  const result = await runAdminAction({ action: 'generate_invite_link', organizationId, email, role });
  if (!result.email || !result.inviteLink) throw new Error('Supabase did not return a usable invitation link.');
  return { email: result.email, inviteLink: result.inviteLink, message: result.message };
}

export function removeOrganizationMember(organizationId: string, userId: string): Promise<string> {
  return runAdminAction({ action: 'remove', organizationId, userId }).then((result) => result.message);
}

export function changeOrganizationMemberRole(
  organizationId: string,
  userId: string,
  role: AssignableRole,
): Promise<string> {
  return runAdminAction({ action: 'change_role', organizationId, userId, role }).then((result) => result.message);
}

export function revokeOrganizationInvitation(organizationId: string, invitationId: string): Promise<string> {
  return runAdminAction({ action: 'revoke_invitation', organizationId, invitationId }).then((result) => result.message);
}
