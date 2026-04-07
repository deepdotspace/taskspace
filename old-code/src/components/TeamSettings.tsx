/**
 * TeamSettings — Team admin panel.
 * Shows team ID (copyable), member list with pending invites,
 * "Add Member" form (email/username), and management actions.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Icon } from '../utils/icons';
import { WidgetUser, getUserColor } from '../constants';
import ConfirmModal from './ConfirmModal';

interface TeamMember {
  userId: string;
  roleInTeam: string;
  joinedAt: string;
  status?: string;   // 'active' | 'pending'
  email?: string;    // present for pending invites
}

interface Team {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  isOpen?: boolean;
  members?: TeamMember[];
}

interface AddMemberResult {
  status: 'added' | 'invited' | 'already_member' | 'error';
  userId?: string;
  email?: string;
  error?: string;
}

interface TeamSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  currentUser: WidgetUser | null;
  teamMembers: WidgetUser[];
  onAddMember?: (teamId: string, member: string | { email: string } | { username: string }, roleOrOptions?: string | { roleInTeam?: string; sendEmail?: boolean; teamName?: string }) => Promise<AddMemberResult>;
  onRemoveMember?: (teamId: string, userId: string) => void;
  onCancelInvite?: (teamId: string, inviteId: string) => void;
  onDeleteTeam?: (teamId: string) => void;
  getDisplayName: (user: WidgetUser | null) => string;
}

export default function TeamSettings({
  isOpen, onClose, team, currentUser, teamMembers,
  onAddMember, onRemoveMember, onCancelInvite, onDeleteTeam, getDisplayName,
}: TeamSettingsProps) {
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string; isPending?: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Add member form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addInput, setAddInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addResult, setAddResult] = useState<{ status: string; message: string } | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const isOwner = currentUser?.id === team.createdBy;

  // Split members into active and pending
  const activeMembers = teamMembers.filter(m => !m.isPending);
  const pendingMembers = teamMembers.filter(m => m.isPending);

  // Focus input when add form opens
  useEffect(() => {
    if (showAddForm && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [showAddForm]);

  // Clear result after 4 seconds
  useEffect(() => {
    if (addResult) {
      const timer = setTimeout(() => setAddResult(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [addResult]);

  const handleCopyTeamId = useCallback(() => {
    navigator.clipboard.writeText(team.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [team.id]);

  const handleConfirmRemove = useCallback(() => {
    if (!confirmRemove) return;
    if (confirmRemove.isPending && onCancelInvite) {
      onCancelInvite(team.id, confirmRemove.id);
    } else if (onRemoveMember) {
      onRemoveMember(team.id, confirmRemove.id);
    }
    setConfirmRemove(null);
  }, [confirmRemove, onRemoveMember, onCancelInvite, team.id]);

  const handleAddMember = useCallback(async () => {
    const value = addInput.trim();
    if (!value || !onAddMember) return;

    setIsAdding(true);
    setAddResult(null);

    try {
      // Auto-detect: if contains @, treat as email; otherwise username
      const memberIdentifier = value.includes('@')
        ? { email: value }
        : { username: value };

      const options = {
        roleInTeam: 'member',
        sendEmail: true,
        miniappId: 'tasks',
        teamName: team.name,
      };
      console.log('[TeamSettings] addMember call:', { teamId: team.id, memberIdentifier, options });
      const result = await onAddMember(team.id, memberIdentifier, options);
      console.log('[TeamSettings] addMember result:', result);

      if (result.status === 'added') {
        setAddResult({ status: 'success', message: `${value} has been added to the team.` });
        setAddInput('');
        setShowAddForm(false);
      } else if (result.status === 'invited') {
        setAddResult({ status: 'success', message: `Invitation sent to ${value}. They'll join when they sign in.` });
        setAddInput('');
        setShowAddForm(false);
      } else if (result.status === 'already_member') {
        setAddResult({ status: 'info', message: `${value} is already a member of this team.` });
      } else {
        setAddResult({ status: 'error', message: result.error || 'Failed to add member.' });
      }

    } catch (err: any) {
      setAddResult({ status: 'error', message: err?.message || 'Failed to add member. Please try again.' });
    } finally {
      setIsAdding(false);
    }
  }, [addInput, onAddMember, team.id, team.name]);

  if (!isOpen) return null;

  return (
    <div data-team-settings-overlay style={tsStyles.overlay} onClick={onClose}>
      <div style={tsStyles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={tsStyles.header}>
          <h3 style={tsStyles.title}>Team Settings</h3>
          <button onClick={onClose} style={tsStyles.closeButton}>
            <Icon name="x" size={18} color="#8E8E93" />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={tsStyles.body}>
          {/* Team Info */}
          <div style={tsStyles.section}>
            <div style={tsStyles.teamNameRow}>
              <span style={tsStyles.teamName}>{team.name}</span>
              {isOwner && <span style={tsStyles.ownerBadge}>Owner</span>}
            </div>

            {/* Team ID — always visible to all members so they can share */}
            <div style={tsStyles.teamIdSection}>
              <label style={tsStyles.teamIdLabel}>Team ID</label>
              <div style={tsStyles.teamIdRow}>
                <code style={tsStyles.teamIdCode}>{team.id}</code>
                <button
                  onClick={handleCopyTeamId}
                  style={tsStyles.copyBtn}
                  title="Copy team ID"
                >
                  <Icon name={copied ? 'check' : 'copy'} size={14} color={copied ? '#34C759' : '#007AFF'} />
                  <span style={{ color: copied ? '#34C759' : '#007AFF' }}>
                    {copied ? 'Copied' : 'Copy'}
                  </span>
                </button>
              </div>
              <p style={tsStyles.teamIdHint}>
                Share this ID with teammates so they can join your team.
              </p>
            </div>
          </div>

          {/* Members */}
          <div style={tsStyles.section}>
            <div style={tsStyles.sectionHeader}>
              <span style={tsStyles.sectionTitle}>
                Members ({activeMembers.length}{pendingMembers.length > 0 ? ` + ${pendingMembers.length} invited` : ''})
              </span>
              {isOwner && onAddMember && !showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  style={tsStyles.addMemberBtn}
                >
                  <Icon name="user-plus" size={13} color="#007AFF" />
                  <span>Add</span>
                </button>
              )}
            </div>

            {/* Add Member Form */}
            {showAddForm && isOwner && (
              <div style={tsStyles.addMemberForm}>
                <div style={tsStyles.addMemberInputRow}>
                  <input
                    ref={addInputRef}
                    type="text"
                    value={addInput}
                    onChange={(e) => setAddInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && addInput.trim()) handleAddMember();
                      if (e.key === 'Escape') {
                        setShowAddForm(false);
                        setAddInput('');
                        setAddResult(null);
                      }
                    }}
                    placeholder="Email or username"
                    style={tsStyles.addMemberInput}
                    disabled={isAdding}
                  />
                  <button
                    onClick={handleAddMember}
                    disabled={!addInput.trim() || isAdding}
                    style={{
                      ...tsStyles.addMemberSubmitBtn,
                      opacity: (!addInput.trim() || isAdding) ? 0.5 : 1,
                    }}
                  >
                    {isAdding ? (
                      <div style={{
                        width: 14, height: 14,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite',
                      }} />
                    ) : (
                      <Icon name="plus" size={14} color="#fff" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setAddInput('');
                      setAddResult(null);
                    }}
                    style={tsStyles.addMemberCancelBtn}
                  >
                    <Icon name="x" size={14} color="#8E8E93" />
                  </button>
                </div>
                <p style={tsStyles.addMemberHint}>
                  Enter an email to add or invite, or a username to add directly.
                </p>
              </div>
            )}

            {/* Add result feedback */}
            {addResult && (
              <div style={{
                ...tsStyles.addResultBanner,
                backgroundColor: addResult.status === 'error' ? 'rgba(255,59,48,0.08)' : addResult.status === 'info' ? 'rgba(255,149,0,0.08)' : 'rgba(52,199,89,0.08)',
                color: addResult.status === 'error' ? '#FF3B30' : addResult.status === 'info' ? '#FF9500' : '#34C759',
              }}>
                <Icon
                  name={addResult.status === 'error' ? 'alert-circle' : addResult.status === 'info' ? 'info' : 'check-circle'}
                  size={14}
                  color={addResult.status === 'error' ? '#FF3B30' : addResult.status === 'info' ? '#FF9500' : '#34C759'}
                />
                <span>{addResult.message}</span>
              </div>
            )}

            <div style={tsStyles.memberList}>
              {/* Active members */}
              {activeMembers.map(member => {
                const isSelf = currentUser?.id === member.id;
                const isTeamOwner = member.id === team.createdBy;
                const displayName = getDisplayName(member);

                return (
                  <div key={member.id} style={tsStyles.memberRow}>
                    <span style={{
                      ...tsStyles.memberAvatar,
                      backgroundColor: member.color || getUserColor(member.id),
                    }}>
                      {displayName?.charAt(0).toUpperCase() || '?'}
                    </span>
                    <div style={tsStyles.memberInfo}>
                      <span style={tsStyles.memberName}>
                        {displayName}
                      </span>
                      {member.email && (
                        <span style={tsStyles.memberEmail}>{member.email}</span>
                      )}
                    </div>
                    <div style={tsStyles.badges}>
                      {isSelf && <span style={tsStyles.youBadge}>You</span>}
                      {isTeamOwner && <span style={tsStyles.adminBadge}>Admin</span>}
                    </div>
                    {/* Remove button — owner can remove others */}
                    {isOwner && !isSelf && onRemoveMember && (
                      <button
                        onClick={() => setConfirmRemove({ id: member.id, name: displayName })}
                        style={tsStyles.removeBtn}
                        title="Remove member"
                      >
                        <Icon name="user-minus" size={14} color="#FF3B30" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Pending invites */}
              {pendingMembers.length > 0 && (
                <>
                  {activeMembers.length > 0 && <div style={tsStyles.pendingDivider} />}
                  <div style={tsStyles.pendingSectionLabel}>
                    <Icon name="clock" size={11} color="#FF9500" />
                    <span>Pending Invites</span>
                  </div>
                  {pendingMembers.map(member => {
                    const displayEmail = member.email || member.name || 'Invited User';
                    return (
                      <div key={member.id} style={tsStyles.memberRow}>
                        <span style={{
                          ...tsStyles.memberAvatar,
                          backgroundColor: '#E5E5EA',
                          color: '#8E8E93',
                        }}>
                          <Icon name="mail" size={13} color="#8E8E93" />
                        </span>
                        <div style={tsStyles.memberInfo}>
                          <span style={{ ...tsStyles.memberName, color: '#6B7280' }}>
                            {displayEmail}
                          </span>
                        </div>
                        <div style={tsStyles.badges}>
                          <span style={tsStyles.invitedBadge}>Invited</span>
                        </div>
                        {/* Cancel invite — owner only */}
                        {isOwner && onCancelInvite && (
                          <button
                            onClick={() => setConfirmRemove({ id: member.id, name: displayEmail, isPending: true })}
                            style={tsStyles.removeBtn}
                            title="Cancel invite"
                          >
                            <Icon name="x" size={14} color="#FF9500" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {teamMembers.length === 0 && (
                <div style={tsStyles.emptyMembers}>
                  <Icon name="users" size={24} color="#C7C7CC" />
                  <span>No members yet</span>
                </div>
              )}
            </div>
          </div>

          {/* Delete Team — only for owners */}
          {isOwner && onDeleteTeam && (
            <div style={tsStyles.section}>
              <div style={tsStyles.dangerZone}>
                <div style={tsStyles.dangerZoneContent}>
                  <span style={tsStyles.dangerZoneTitle}>Delete Team</span>
                  <span style={tsStyles.dangerZoneText}>
                    Permanently delete this team and all its tasks, projects, and tags.
                  </span>
                </div>
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={tsStyles.dangerButton}
                >
                  <Icon name="trash-2" size={14} color="#FF3B30" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Remove / Cancel Invite Confirmation */}
      <ConfirmModal
        isOpen={confirmRemove !== null}
        title={confirmRemove?.isPending ? 'Cancel Invite' : 'Remove Member'}
        message={
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '15px', color: '#1D1D1F' }}>
              {confirmRemove?.isPending
                ? <>Cancel the invite for <strong>{confirmRemove?.name}</strong>?</>
                : <>Remove <strong>{confirmRemove?.name}</strong> from this team?</>
              }
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
              {confirmRemove?.isPending
                ? 'The pending invitation will be revoked.'
                : 'They will no longer see this team\'s tasks, projects, or tags.'}
            </p>
          </div>
        }
        confirmLabel={confirmRemove?.isPending ? 'Cancel Invite' : 'Remove'}
        cancelLabel="Keep"
        confirmStyle="danger"
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmRemove(null)}
      />

      {/* Delete Team Confirmation */}
      <ConfirmModal
        isOpen={confirmDelete}
        title="Delete Team"
        message={
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '15px', color: '#1D1D1F' }}>
              Permanently delete team <strong>{team.name}</strong>?
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
              All tasks, projects, and tags in this team will be deleted. This action cannot be undone.
            </p>
          </div>
        }
        confirmLabel="Delete Team"
        cancelLabel="Cancel"
        confirmStyle="danger"
        onConfirm={() => {
          if (onDeleteTeam) {
            onDeleteTeam(team.id);
            setConfirmDelete(false);
            onClose();
          }
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

const tsStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 12,
    width: 420,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #E5E5EA',
    flexShrink: 0,
  },
  body: {
    overflow: 'auto',
    flex: 1,
  },
  title: {
    margin: 0,
    fontSize: 17,
    fontWeight: 600,
    color: '#1D1D1F',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  closeButton: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 6,
  },
  section: {
    padding: '16px 20px',
    borderBottom: '1px solid #F2F2F7',
  },
  teamNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1D1D1F',
  },
  ownerBadge: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    color: '#007AFF',
    letterSpacing: '0.2px',
  },
  teamIdSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: '12px 14px',
  },
  teamIdLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#8E8E93',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 6,
  },
  teamIdRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  teamIdCode: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'SF Mono, Monaco, Consolas, monospace',
    color: '#1D1D1F',
    backgroundColor: '#fff',
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #E5E5EA',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    display: 'block',
  },
  copyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 6,
    fontFamily: 'inherit',
    flexShrink: 0,
  },
  teamIdHint: {
    margin: '8px 0 0',
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 1.4,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#3C3C43',
  },
  addMemberBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    border: 'none',
    background: 'rgba(0, 122, 255, 0.08)',
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  // Add member form
  addMemberForm: {
    marginBottom: 12,
    padding: '12px',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
  },
  addMemberInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  addMemberInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: 13,
    border: '1px solid #E5E5EA',
    borderRadius: 8,
    outline: 'none',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    backgroundColor: '#fff',
    boxSizing: 'border-box' as const,
  },
  addMemberSubmitBtn: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: '#007AFF',
    color: '#fff',
    borderRadius: 8,
    cursor: 'pointer',
    flexShrink: 0,
  },
  addMemberCancelBtn: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 8,
    flexShrink: 0,
  },
  addMemberHint: {
    margin: '6px 0 0',
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 1.4,
  },
  addResultBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 8,
  },
  memberList: {
    maxHeight: 300,
    overflow: 'auto',
  },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    color: 'white',
    fontSize: 13,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  memberInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 0,
  },
  memberName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#1D1D1F',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  memberEmail: {
    fontSize: 12,
    color: '#8E8E93',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  badges: {
    display: 'flex',
    gap: 4,
    flexShrink: 0,
  },
  youBadge: {
    fontSize: 10,
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    color: '#007AFF',
    letterSpacing: '0.2px',
  },
  adminBadge: {
    fontSize: 10,
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: 10,
    backgroundColor: 'rgba(175, 82, 222, 0.12)',
    color: '#AF52DE',
    letterSpacing: '0.2px',
  },
  invitedBadge: {
    fontSize: 10,
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    color: '#FF9500',
    letterSpacing: '0.2px',
  },
  removeBtn: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 6,
    flexShrink: 0,
  },
  pendingDivider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    margin: '8px 0',
  },
  pendingSectionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    color: '#FF9500',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    padding: '4px 0',
  },
  emptyMembers: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '20px',
    color: '#8E8E93',
    fontSize: 13,
  },
  dangerZone: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    backgroundColor: 'rgba(255, 59, 48, 0.06)',
    borderRadius: 10,
    border: '1px solid rgba(255, 59, 48, 0.15)',
  },
  dangerZoneContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  dangerZoneTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1D1D1F',
  },
  dangerZoneText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 1.4,
  },
  dangerButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    border: '1px solid rgba(255, 59, 48, 0.2)',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background-color 0.15s ease',
    flexShrink: 0,
  },
};
