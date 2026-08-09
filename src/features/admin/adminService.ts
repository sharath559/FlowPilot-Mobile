import { supabase } from '../../services/supabaseClient';
import type { OrganizationInvitation, OrganizationMember, UserRole } from '../../types/domain';

export type AssignableRole = Exclude<UserRole, 'SUPER_ADMIN'>;

export type TeamAccess = {
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
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
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('admin-members', { body });
  if (error) throw new Error(await getFunctionErrorMessage(error, data));
  if (data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string') {
    throw new Error((data as { error: string }).error);
  }
  return data && typeof data === 'object' && typeof (data as { message?: unknown }).message === 'string'
    ? (data as { message: string }).message
    : 'Access was updated.';
}

export function inviteOrganizationMember(
  organizationId: string,
  email: string,
  role: AssignableRole,
): Promise<string> {
  return runAdminAction({ action: 'invite', organizationId, email, role });
}

export function removeOrganizationMember(organizationId: string, userId: string): Promise<string> {
  return runAdminAction({ action: 'remove', organizationId, userId });
}

export function changeOrganizationMemberRole(
  organizationId: string,
  userId: string,
  role: AssignableRole,
): Promise<string> {
  return runAdminAction({ action: 'change_role', organizationId, userId, role });
}

export function revokeOrganizationInvitation(organizationId: string, invitationId: string): Promise<string> {
  return runAdminAction({ action: 'revoke_invitation', organizationId, invitationId });
}
