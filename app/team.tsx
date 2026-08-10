import { useEffect, useState } from 'react';
import { Linking, Platform, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '../src/components/AppButton';
import { Badge } from '../src/components/Badge';
import { ChoiceList } from '../src/components/ChoiceList';
import { ConfirmDialog } from '../src/components/ConfirmDialog';
import { Screen } from '../src/components/Screen';
import { Section } from '../src/components/Section';
import { StatusNotice } from '../src/components/StatusNotice';
import { TextField } from '../src/components/TextField';
import { colors, spacing } from '../src/constants/theme';
import {
  changeOrganizationMemberRole,
  generateOrganizationInviteLink,
  inviteOrganizationMember,
  listTeamAccess,
  removeOrganizationMember,
  revokeOrganizationInvitation,
  type AssignableRole,
  type TeamAccess,
} from '../src/features/admin/adminService';
import { useAuth } from '../src/hooks/useAuth';
import type { OrganizationMember, UserRole } from '../src/types/domain';
import { authEmailOnlySchema } from '../src/validation/schemas';

const roles: { id: AssignableRole; label: string; meta: string }[] = [
  { id: 'STAFF', label: 'Staff', meta: 'Can manage student records and sync.' },
  { id: 'SCHOOL_ADMIN', label: 'School admin', meta: 'Can also manage classes and student fields.' },
  { id: 'ORG_ADMIN', label: 'Organization admin', meta: 'Full access, including invitations and account removal.' },
];

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: 'Platform owner',
  ORG_ADMIN: 'Organization admin',
  SCHOOL_ADMIN: 'School admin',
  STAFF: 'Staff',
};

type Feedback = { tone: 'success' | 'danger' | 'info'; text: string };
type GeneratedInvite = { email: string; link: string };

function buildInviteMessage(invite: GeneratedInvite): string {
  return [
    'Welcome to FlowPilot.',
    '',
    'Sharath has invited you to securely manage school records with the team.',
    'Open this private link to finish setting up your account:',
    invite.link,
    '',
    `This invitation is only for ${invite.email}. The link is single-use and expires, so please do not forward it.`,
  ].join('\n');
}

export default function TeamScreen() {
  const { membership, user } = useAuth();
  const [access, setAccess] = useState<TeamAccess>({ members: [], invitations: [] });
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AssignableRole>('STAFF');
  const [emailError, setEmailError] = useState<string>();
  const [busyAction, setBusyAction] = useState<string>();
  const [feedback, setFeedback] = useState<Feedback>();
  const [generatedInvite, setGeneratedInvite] = useState<GeneratedInvite>();
  const [editingMember, setEditingMember] = useState<OrganizationMember>();
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<OrganizationMember>();
  const [nextRole, setNextRole] = useState<AssignableRole>('STAFF');

  const organizationId = membership?.organization_id;

  function getValidatedInviteEmail(): string | null {
    setEmailError(undefined);
    setFeedback(undefined);
    const parsed = authEmailOnlySchema.safeParse({ email });
    if (parsed.success) return parsed.data.email;

    const message = parsed.error.issues[0]?.message ?? 'Enter a valid email.';
    setEmailError(message);
    setFeedback({ tone: 'danger', text: message });
    return null;
  }

  async function load() {
    if (!organizationId) return;
    setAccess(await listTeamAccess(organizationId));
  }

  useEffect(() => {
    if (!organizationId) return undefined;
    let active = true;

    void listTeamAccess(organizationId)
      .then((nextAccess) => {
        if (active) setAccess(nextAccess);
      })
      .catch((error) => {
        if (active) setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : String(error) });
      });

    return () => {
      active = false;
    };
  }, [organizationId]);

  async function invite() {
    if (!organizationId || busyAction) return;
    const validatedEmail = getValidatedInviteEmail();
    if (!validatedEmail) return;

    setBusyAction('invite');
    try {
      const message = await inviteOrganizationMember(organizationId, validatedEmail, role);
      setEmail('');
      setRole('STAFF');
      setGeneratedInvite(undefined);
      setFeedback({ tone: 'success', text: message });
      await load();
    } catch (error) {
      setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusyAction(undefined);
    }
  }

  async function generateLink() {
    if (!organizationId || busyAction) return;
    const validatedEmail = getValidatedInviteEmail();
    if (!validatedEmail) return;

    setBusyAction('generate-link');
    setGeneratedInvite(undefined);
    try {
      const result = await generateOrganizationInviteLink(organizationId, validatedEmail, role);
      setGeneratedInvite({ email: result.email, link: result.inviteLink });
      setFeedback({ tone: 'success', text: result.message });
      await load();
    } catch (error) {
      setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusyAction(undefined);
    }
  }

  async function copyOrShareInvite() {
    if (!generatedInvite) return;
    const message = buildInviteMessage(generatedInvite);
    try {
      if (Platform.OS === 'web' && globalThis.navigator?.clipboard) {
        await globalThis.navigator.clipboard.writeText(message);
        setFeedback({ tone: 'success', text: 'Invitation message copied. Send it privately to the invited person.' });
      } else {
        await Share.share({ title: 'Sharath invited you to FlowPilot', message });
      }
    } catch (error) {
      setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : String(error) });
    }
  }

  async function emailGeneratedInvite() {
    if (!generatedInvite) return;
    const subject = encodeURIComponent('Sharath invited you to FlowPilot');
    const body = encodeURIComponent(buildInviteMessage(generatedInvite));
    try {
      await Linking.openURL(`mailto:${generatedInvite.email}?subject=${subject}&body=${body}`);
    } catch (error) {
      setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : String(error) });
    }
  }

  async function saveRole() {
    if (!organizationId || !editingMember || busyAction) return;
    setBusyAction(`role:${editingMember.user_id}`);
    setFeedback(undefined);
    try {
      const message = await changeOrganizationMemberRole(organizationId, editingMember.user_id, nextRole);
      setEditingMember(undefined);
      setFeedback({ tone: 'success', text: message });
      await load();
    } catch (error) {
      setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusyAction(undefined);
    }
  }

  function confirmRemoval(member: OrganizationMember) {
    setFeedback(undefined);
    setMemberPendingRemoval(member);
  }

  async function removeConfirmed() {
    const member = memberPendingRemoval;
    if (!organizationId || busyAction) return;
    if (!member) return;
    setBusyAction(`remove:${member.user_id}`);
    setFeedback(undefined);
    try {
      const message = await removeOrganizationMember(organizationId, member.user_id);
      setMemberPendingRemoval(undefined);
      setFeedback({ tone: 'success', text: message });
      await load();
    } catch (error) {
      setMemberPendingRemoval(undefined);
      setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusyAction(undefined);
    }
  }

  async function revoke(invitationId: string) {
    if (!organizationId || busyAction) return;
    setBusyAction(`revoke:${invitationId}`);
    setFeedback(undefined);
    try {
      const message = await revokeOrganizationInvitation(organizationId, invitationId);
      setFeedback({ tone: 'success', text: message });
      await load();
    } catch (error) {
      setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusyAction(undefined);
    }
  }

  return (
    <Screen title="Team access" subtitle="Invite exact email addresses and control who can work with school records.">
      {feedback ? <StatusNotice tone={feedback.tone} text={feedback.text} /> : null}
      <Section title="Invite member">
        <TextField
          label="Email address"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setEmailError(undefined);
            setFeedback(undefined);
            setGeneratedInvite(undefined);
          }}
          keyboardType="email-address"
          placeholder="person@gmail.com"
          error={emailError}
        />
        <Text style={styles.fieldLabel}>Access role</Text>
        <ChoiceList
          choices={roles}
          selectedId={role}
          onSelect={(value) => {
            setRole(value as AssignableRole);
            setGeneratedInvite(undefined);
          }}
        />
        <AppButton label={busyAction === 'invite' ? 'Sending invitation...' : 'Send invitation'} onPress={() => void invite()} loading={busyAction === 'invite'} disabled={Boolean(busyAction)} />
        <AppButton
          label={busyAction === 'generate-link' ? 'Generating link...' : 'Generate invite link'}
          onPress={() => void generateLink()}
          loading={busyAction === 'generate-link'}
          disabled={Boolean(busyAction)}
          variant="secondary"
        />
        {generatedInvite ? (
          <View style={styles.linkResult}>
            <View style={styles.linkHeading}>
              <Text style={styles.linkTitle}>Private invite ready</Text>
              <Text style={styles.linkMeta}>For {generatedInvite.email}</Text>
            </View>
            <TextInput
              accessibilityLabel="Generated invitation link"
              editable={false}
              multiline
              selectTextOnFocus
              style={styles.linkInput}
              value={generatedInvite.link}
            />
            <StatusNotice tone="warning" text="This link grants access to the invited account. Send it privately, do not post it publicly, and generate a new one if it is exposed." />
            <View style={styles.rowActions}>
              <AppButton
                label={Platform.OS === 'web' ? 'Copy message' : 'Share invite'}
                onPress={() => void copyOrShareInvite()}
                variant="secondary"
                style={styles.flexButton}
              />
              <AppButton
                label="Email friend"
                onPress={() => void emailGeneratedInvite()}
                style={styles.flexButton}
              />
            </View>
          </View>
        ) : null}
      </Section>

      <Section title="Members" meta={`${access.members.length} active`}>
        <View style={styles.list}>
          {access.members.map((member) => {
            const isCurrentUser = member.user_id === user?.id;
            const isEditing = editingMember?.user_id === member.user_id;
            return (
              <View key={member.id} style={styles.memberRow}>
                <View style={styles.memberHeader}>
                  <View style={styles.memberIdentity}>
                    <Text style={styles.memberName}>{member.display_name || member.email || 'FlowPilot member'}</Text>
                    {member.display_name && member.email ? <Text style={styles.memberEmail}>{member.email}</Text> : null}
                  </View>
                  {isCurrentUser ? <Badge label="You" tone="success" /> : null}
                </View>
                <Badge label={roleLabels[member.role]} tone={member.role === 'ORG_ADMIN' || member.role === 'SUPER_ADMIN' ? 'warning' : 'neutral'} />

                {isEditing ? (
                  <View style={styles.roleEditor}>
                    <ChoiceList choices={roles} selectedId={nextRole} onSelect={(value) => setNextRole(value as AssignableRole)} />
                    <AppButton label="Save role" onPress={() => void saveRole()} loading={busyAction === `role:${member.user_id}`} disabled={Boolean(busyAction)} />
                    <AppButton label="Cancel" onPress={() => setEditingMember(undefined)} variant="ghost" disabled={Boolean(busyAction)} />
                  </View>
                ) : !isCurrentUser ? (
                  <View style={styles.rowActions}>
                    <AppButton
                      label="Change role"
                      onPress={() => {
                        setEditingMember(member);
                        setNextRole(member.role === 'SUPER_ADMIN' ? 'ORG_ADMIN' : member.role);
                      }}
                      variant="secondary"
                      disabled={Boolean(busyAction)}
                      style={styles.flexButton}
                    />
                    <AppButton
                      label="Remove"
                      onPress={() => confirmRemoval(member)}
                      variant="danger"
                      loading={busyAction === `remove:${member.user_id}`}
                      disabled={Boolean(busyAction)}
                      style={styles.flexButton}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </Section>

      {access.invitations.length ? (
        <Section title="Pending invitations" meta={`${access.invitations.length} waiting`}>
          <View style={styles.list}>
            {access.invitations.map((invitation) => (
              <View key={invitation.id} style={styles.memberRow}>
                <Text style={styles.memberName}>{invitation.email}</Text>
                <Badge label={roleLabels[invitation.role]} tone="warning" />
                <Text style={styles.memberEmail}>Expires {new Date(invitation.expires_at).toLocaleDateString()}</Text>
                {invitation.last_error ? <StatusNotice tone="danger" text={invitation.last_error} /> : null}
                <AppButton
                  label="Revoke invitation"
                  onPress={() => void revoke(invitation.id)}
                  variant="danger"
                  loading={busyAction === `revoke:${invitation.id}`}
                  disabled={Boolean(busyAction)}
                />
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <ConfirmDialog
        visible={Boolean(memberPendingRemoval)}
        title="Remove account access?"
        message={`${memberPendingRemoval?.email ?? 'This account'} will lose access to this organization. If it has no other memberships, its FlowPilot Auth account will also be deleted.`}
        confirmLabel="Remove access"
        loading={Boolean(memberPendingRemoval && busyAction === `remove:${memberPendingRemoval.user_id}`)}
        onCancel={() => setMemberPendingRemoval(undefined)}
        onConfirm={() => void removeConfirmed()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  flexButton: { flex: 1 },
  list: { gap: spacing.sm },
  linkHeading: {
    gap: 2,
  },
  linkInput: {
    backgroundColor: '#FBFCFB',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    minHeight: 96,
    padding: spacing.sm,
    textAlignVertical: 'top',
  },
  linkMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  linkResult: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  linkTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  memberEmail: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 19,
  },
  memberHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  memberIdentity: { flex: 1, gap: 2 },
  memberName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  memberRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  roleEditor: { gap: spacing.sm },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
