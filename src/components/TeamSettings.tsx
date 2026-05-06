/**
 * TeamSettings — modal for managing a team's members.
 * Adapted from the original widget's TeamSettings for the new SDK.
 *
 * Key adaptations:
 * - No platform-level team API; uses useMutations('team_members') directly
 * - "Add by email" looks up users in roomUsers (everyone who signed in to this app)
 * - Role changes update team_members.RoleInTeam (not app-level role)
 * - Remove member deletes their team_members record (admin only)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '../utils/icons';
import { Team, TeamMember, WidgetUser, getUserColor } from '../constants';

interface TeamSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  members: TeamMember[];
  currentUserId: string;
  isTeamAdmin: boolean;
  roomUsers: WidgetUser[];  // all users who ever signed into the app
  onAddMember: (email: string) => Promise<{ status: 'added' | 'invited' | 'already_member' | 'error'; teamId?: string }>;
  onRemoveMember: (memberId: string, userId: string) => void;
  onChangeRole: (memberId: string, newRole: 'admin' | 'member') => void;
  onDeleteTeam: () => void;
}

export function TeamSettings({
  isOpen, onClose, team, members, currentUserId, isTeamAdmin,
  roomUsers, onAddMember, onRemoveMember, onChangeRole, onDeleteTeam,
}: TeamSettingsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addResult, setAddResult] = useState<{ status: 'added' | 'invited' | 'already_member' | 'error'; teamId?: string } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAddForm && inputRef.current) inputRef.current.focus();
  }, [showAddForm]);

  // ── All hooks must be above the early return ──
  const handleCopyId = useCallback(() => {
    if (!team) return;
    navigator.clipboard.writeText(team.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }, [team]);

  const closeAddForm = useCallback(() => {
    setShowAddForm(false); setAddResult(null); setAddEmail('');
  }, []);

  if (!isOpen || !team) return null;

  const handleAdd = async () => {
    const email = addEmail.trim();
    if (!email) return;
    setIsAdding(true);
    setAddResult(null);
    try {
      const result = await onAddMember(email);
      setAddResult(result);
      if (result.status === 'added' || result.status === 'invited') {
        setAddEmail('');
        setTimeout(() => { setShowAddForm(false); setAddResult(null); }, 2500);
      }
    } finally {
      setIsAdding(false);
    }
  };

  const currentMember = members.find(m => m.userId === currentUserId);
  const activeMembers = members.filter(m => m.status === 'active');
  const invitedMembers = members.filter(m => m.status === 'invited');

  const getMemberDisplayName = (member: TeamMember) => {
    if (member.isPending) return member.email || 'Invited User';
    const roomUser = roomUsers.find(u => u.id === member.userId);
    return roomUser?.name || member.email || 'Unknown';
  };

  const getMemberEmail = (member: TeamMember) => {
    if (member.isPending) return member.email;
    return roomUsers.find(u => u.id === member.userId)?.email || '';
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.teamIcon}>
              {team.name[0]?.toUpperCase() || 'T'}
            </div>
            <div>
              <div style={s.title}>{team.name}</div>
              <div style={s.memberCount}>{activeMembers.length} member{activeMembers.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <button onClick={onClose} style={s.closeBtn}>
            <Icon name="x" size={16} color="#8E8E93" />
          </button>
        </div>

        {/* ── Team ID row ── */}
        <div style={s.teamIdRow}>
          <Icon name="link" size={13} color="#8E8E93" />
          <span style={s.teamIdLabel}>Team ID</span>
          <code style={s.teamIdValue}>{team.id}</code>
          <button onClick={handleCopyId} style={s.copyBtn} title="Copy team ID">
            {copiedId
              ? <><Icon name="check" size={13} color="#34C759" /><span style={{ ...s.copyLabel, color: '#34C759' }}>Copied</span></>
              : <><Icon name="copy" size={13} color="#007AFF" /><span style={s.copyLabel}>Copy</span></>}
          </button>
        </div>

        {/* ── Member list ── */}
        <div style={s.body}>
          {/* Section header with inline invite button */}
          <div style={s.sectionHeader}>
            <span style={s.sectionLabel}>Members</span>
            {isTeamAdmin && !showAddForm && (
              <button onClick={() => { setShowAddForm(true); setAddResult(null); }} style={s.inviteBtn}>
                <Icon name="user-plus" size={13} color="#007AFF" />
                Invite
              </button>
            )}
          </div>

          {/* Inline invite form */}
          {showAddForm && (
            <div style={s.addForm}>
              <input
                ref={inputRef} type="email" value={addEmail}
                onChange={e => { setAddEmail(e.target.value); setAddResult(null); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && addEmail.trim()) handleAdd();
                  if (e.key === 'Escape') closeAddForm();
                }}
                placeholder="Enter email address…"
                style={s.addInput} disabled={isAdding}
              />
              <div style={s.addHint}>
                {addResult ? (
                  <span style={{ color: addResult.status === 'already_member' || addResult.status === 'error' ? '#FF3B30' : '#34C759' }}>
                    {addResult.status === 'invited' ? '✓ Invite created — share the Team ID so they can join.' :
                     addResult.status === 'already_member' ? 'Already a member of this team.' :
                     addResult.status === 'error' ? 'Something went wrong, please try again.' :
                     '✓ Member added!'}
                  </span>
                ) : (
                  <span>Existing users are added immediately. Others get a pending invite.</span>
                )}
              </div>
              <div style={s.addFormActions}>
                <button onClick={closeAddForm} style={s.cancelBtn}>Cancel</button>
                <button onClick={handleAdd} disabled={!addEmail.trim() || isAdding}
                  style={{ ...s.primaryBtn, opacity: (!addEmail.trim() || isAdding) ? 0.5 : 1 }}>
                  {isAdding ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {/* Active members */}
          {activeMembers.map(member => {
            const isMe = member.userId === currentUserId;
            const displayName = getMemberDisplayName(member);
            const email = getMemberEmail(member);
            const isAdmin = member.roleInTeam === 'admin';

            return (
              <div key={member.id} style={s.memberRow}>
                <div style={{ ...s.avatar, backgroundColor: getUserColor(member.userId) }}>
                  {displayName[0]?.toUpperCase() || '?'}
                </div>
                <div style={s.memberInfo}>
                  <div style={s.nameRow}>
                    <span style={s.memberName}>{displayName}</span>
                    {isMe && <span style={s.youBadge}>you</span>}
                  </div>
                  {email && <span style={s.memberEmail}>{email}</span>}
                </div>

                <div style={s.memberRight}>
                  <span style={{ ...s.rolePill, ...(isAdmin ? s.adminPill : s.memberPill) }}>
                    {isAdmin ? 'Admin' : 'Member'}
                  </span>
                  {isTeamAdmin && !isMe && (
                    <div style={s.actionGroup}>
                      <button
                        onClick={() => onChangeRole(member.id, isAdmin ? 'member' : 'admin')}
                        style={s.textActionBtn}
                        title={isAdmin ? 'Change to member' : 'Change to admin'}
                      >
                        {isAdmin ? 'Make Member' : 'Make Admin'}
                      </button>
                      <span style={s.actionDivider}>·</span>
                      <button
                        onClick={() => onRemoveMember(member.id, member.userId)}
                        style={{ ...s.textActionBtn, color: '#FF3B30' }}
                        title="Remove from team"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pending invites */}
          {invitedMembers.length > 0 && (
            <>
              <div style={{ ...s.sectionHeader, marginTop: 16 }}>
                <span style={s.sectionLabel}>Pending invites</span>
              </div>
              {invitedMembers.map(member => (
                <div key={member.id} style={s.memberRow}>
                  <div style={{ ...s.avatar, background: '#F2F2F7', color: '#8E8E93', fontSize: 16 }}>✉</div>
                  <div style={s.memberInfo}>
                    <span style={s.memberName}>{member.email || 'Invited User'}</span>
                    <span style={s.memberEmail}>Waiting to join — share the Team ID</span>
                  </div>
                  <div style={s.memberRight}>
                    <span style={s.pendingPill}>Pending</span>
                    {isTeamAdmin && (
                      <div style={s.actionGroup}>
                        <button
                          onClick={() => onRemoveMember(member.id, member.userId)}
                          style={{ ...s.textActionBtn, color: '#FF3B30' }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Delete team (creator + admin only) ── */}
        {isTeamAdmin && currentMember?.userId === team.createdBy && (
          <div style={s.dangerZone}>
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} style={s.deleteBtn}>
                <Icon name="trash-2" size={13} color="#FF3B30" />
                Delete Team
              </button>
            ) : (
              <div style={s.deleteConfirm}>
                <p style={s.deleteConfirmText}>
                  Permanently delete <strong>{team.name}</strong>? All tasks, projects, and tags in this team will be removed. This cannot be undone.
                </p>
                <div style={s.deleteConfirmActions}>
                  <button onClick={() => setShowDeleteConfirm(false)} style={s.cancelBtn}>Cancel</button>
                  <button onClick={onDeleteTeam} style={s.confirmDeleteBtn}>Delete Team</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    backdropFilter: 'blur(2px)',
  },
  modal: {
    background: '#fff', borderRadius: 16, width: 460, maxWidth: 'calc(100vw - 24px)',
    maxHeight: '80vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 64px rgba(0,0,0,0.18)', overflow: 'hidden',
  },

  // Header
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 20px 14px', flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  teamIcon: {
    width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #007AFF, #5856D6)',
    color: '#fff', fontSize: 18, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  title: { fontSize: 16, fontWeight: 700, color: '#1D1D1F', lineHeight: 1.2 },
  memberCount: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  closeBtn: {
    width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: '#F2F2F7', cursor: 'pointer', borderRadius: 8,
  },

  // Team ID
  teamIdRow: {
    display: 'flex', alignItems: 'center', gap: 8, margin: '0 20px 16px',
    padding: '10px 14px', background: '#F9FAFB', borderRadius: 10,
    border: '1px solid #E5E5EA', flexShrink: 0,
  },
  teamIdLabel: { fontSize: 12, color: '#8E8E93', fontWeight: 500, flexShrink: 0 },
  teamIdValue: {
    flex: 1, fontSize: 11, color: '#3C3C43',
    fontFamily: '"SF Mono", "Fira Code", monospace', letterSpacing: '0.02em',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    background: 'none', border: 'none', padding: 0,
  },
  copyBtn: {
    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
    border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 4px',
    borderRadius: 4, fontFamily: 'inherit',
  },
  copyLabel: { fontSize: 11, fontWeight: 500, color: '#007AFF' },

  // Body
  body: { flex: 1, overflowY: 'auto', padding: '0 20px 4px' },
  sectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: '#AEAEB2', textTransform: 'uppercase', letterSpacing: '0.6px' },
  inviteBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    border: 'none', background: 'rgba(0,122,255,0.08)', cursor: 'pointer',
    color: '#007AFF', fontSize: 12, fontWeight: 600, padding: '4px 10px',
    borderRadius: 8, fontFamily: 'inherit',
  },

  // Add form (inline, above member list)
  addForm: {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: '12px 14px', marginBottom: 12,
    background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E5EA',
  },
  addInput: {
    width: '100%', padding: '9px 12px', fontSize: 14, border: '1px solid #D1D1D6',
    borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const,
    background: '#fff',
  },
  addHint: { fontSize: 12, color: '#8E8E93', lineHeight: 1.5 },
  addFormActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },

  // Member rows
  memberRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
    borderBottom: '1px solid #F2F2F7',
  },
  avatar: {
    width: 36, height: 36, borderRadius: '50%', color: '#fff',
    fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  memberInfo: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  nameRow: { display: 'flex', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 14, fontWeight: 500, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  memberEmail: { fontSize: 12, color: '#8E8E93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  youBadge: {
    fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 6,
    background: 'rgba(0,122,255,0.1)', color: '#007AFF', flexShrink: 0, letterSpacing: '0.2px',
  },

  // Member right side (role + actions)
  memberRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  rolePill: { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, letterSpacing: '0.1px' },
  adminPill: { background: 'rgba(175,82,222,0.1)', color: '#AF52DE' },
  memberPill: { background: 'rgba(0,0,0,0.05)', color: '#636366' },
  pendingPill: { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,149,0,0.1)', color: '#FF9500' },
  actionGroup: { display: 'flex', alignItems: 'center', gap: 4 },
  textActionBtn: {
    background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 11, fontWeight: 500, color: '#636366', padding: '2px 4px', borderRadius: 4,
  },
  actionDivider: { fontSize: 11, color: '#C7C7CC' },

  // Buttons
  cancelBtn: { padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#8E8E93', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 8 },
  primaryBtn: { padding: '7px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: '#007AFF', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' },

  // Danger zone
  dangerZone: {
    padding: '12px 20px', borderTop: '1px solid #F2F2F7', flexShrink: 0,
  },
  deleteBtn: {
    display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
    color: '#FF3B30', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0',
  },
  deleteConfirm: { display: 'flex', flexDirection: 'column', gap: 10 },
  deleteConfirmText: { margin: 0, fontSize: 13, color: '#3C3C43', lineHeight: 1.5 },
  deleteConfirmActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  confirmDeleteBtn: { padding: '7px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: '#FF3B30', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' },
};
