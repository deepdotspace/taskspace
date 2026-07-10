/**
 * TeamSettings — full-screen "Momentum" settings surface for a team.
 * Adapted from the original widget's TeamSettings for the new SDK.
 *
 * Key adaptations:
 * - No platform-level team API; uses useMutations('team_members') directly
 * - "Add by email" looks up users in roomUsers (everyone who signed in to this app)
 * - Role changes update team_members.RoleInTeam (not app-level role)
 * - Remove member deletes their team_members record (admin only)
 *
 * The surface mounts/unmounts via isOpen/onClose (prop interface unchanged).
 * It renders a two-column layout: settings sub-nav (General + Members) + content.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '../utils/icons';
import { MoreHorizontal } from 'lucide-react';
import { Team, TeamMember, WidgetUser, getUserColor } from '../constants';
import { T, monoLabel } from '../utils/styles';

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

type SettingsTab = 'general' | 'members';

export function TeamSettings({
  isOpen, onClose, team, members, currentUserId, isTeamAdmin,
  roomUsers, onAddMember, onRemoveMember, onChangeRole, onDeleteTeam,
}: TeamSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('members');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addResult, setAddResult] = useState<{ status: 'added' | 'invited' | 'already_member' | 'error'; teamId?: string } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [openRoleMenu, setOpenRoleMenu] = useState<string | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAddForm && inputRef.current) inputRef.current.focus();
  }, [showAddForm]);

  // Small fade/slide-in on mount
  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }
    setMounted(false);
  }, [isOpen]);

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
  const allRows = [...activeMembers, ...invitedMembers];
  const canDeleteTeam = isTeamAdmin && currentMember?.userId === team.createdBy;

  // The connected user directory can lag behind (a member added a moment ago
  // still reads "Anonymous"/no email until the next reconnect) — prefer the
  // membership record's Email over placeholder directory profiles.
  const getMemberDisplayName = (member: TeamMember) => {
    if (member.isPending) return member.email || 'Invited User';
    const name = roomUsers.find(u => u.id === member.userId)?.name;
    if (name && name !== 'Anonymous' && name !== 'Unknown') return name;
    return member.email || name || 'Unknown';
  };

  const getMemberEmail = (member: TeamMember) => {
    if (member.isPending) return member.email;
    return roomUsers.find(u => u.id === member.userId)?.email || member.email || '';
  };

  const navItems: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'members', label: 'Members', icon: 'users' },
  ];

  return (
    <div
      style={{
        ...sx.surface,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(6px)',
      }}
    >
      {/* ── Sub-nav column ── */}
      <aside style={sx.subnav}>
        <button style={sx.backLink} onClick={onClose}
          onMouseEnter={e => (e.currentTarget.style.color = T.accent)}
          onMouseLeave={e => (e.currentTarget.style.color = T.textMuted)}>
          <Icon name="chevron-left" size={15} color="currentColor" />
          Back to app
        </button>
        <div style={sx.workspaceLabel}>Workspace</div>
        <div style={sx.navList}>
          {navItems.map(item => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                style={{ ...sx.navItem, ...(active ? sx.navItemActive : {}) }}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon name={item.icon} size={15} color={active ? T.accent : T.textMuted} />
                <span style={{ color: active ? T.accentStrong : T.textSecondary, fontWeight: active ? 600 : 500 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Content column ── */}
      <main style={sx.content}>
        {activeTab === 'members' && (
          <>
            <div style={sx.contentHeader}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={sx.h2}>Members</h2>
                <p style={sx.subtitle}>
                  {activeMembers.length} member{activeMembers.length !== 1 ? 's' : ''} in {team.name}
                </p>
              </div>
              {isTeamAdmin && (
                <button
                  style={sx.primaryBtn}
                  onClick={() => { setShowAddForm(v => !v); setAddResult(null); }}
                >
                  <Icon name="user-plus" size={15} color="#fff" strokeWidth={2.2} />
                  Invite member
                </button>
              )}
            </div>

            {/* Inline invite form (add-by-email flow) */}
            {showAddForm && (
              <div style={sx.addForm}>
                <input
                  ref={inputRef} type="email" value={addEmail}
                  onChange={e => { setAddEmail(e.target.value); setAddResult(null); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && addEmail.trim()) handleAdd();
                    if (e.key === 'Escape') closeAddForm();
                  }}
                  placeholder="Enter email address…"
                  style={sx.addInput} disabled={isAdding}
                  onFocus={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(107,76,230,.15)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = T.borderCard; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <div style={sx.addFormRight}>
                  <span style={sx.addHint}>
                    {addResult ? (
                      <span style={{ color: addResult.status === 'already_member' || addResult.status === 'error' ? T.red : T.green, fontWeight: 550 }}>
                        {addResult.status === 'invited' ? '✓ Invite created — share the Team ID so they can join.' :
                         addResult.status === 'already_member' ? 'Already a member of this team.' :
                         addResult.status === 'error' ? 'Something went wrong, please try again.' :
                         '✓ Member added!'}
                      </span>
                    ) : (
                      'Existing users are added immediately. Others get a pending invite.'
                    )}
                  </span>
                  <div style={sx.addFormActions}>
                    <button onClick={closeAddForm} style={sx.ghostBtn}>Cancel</button>
                    <button onClick={handleAdd} disabled={!addEmail.trim() || isAdding}
                      style={{ ...sx.primaryBtnSm, opacity: (!addEmail.trim() || isAdding) ? 0.5 : 1 }}>
                      {isAdding ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Table column header */}
            <div style={sx.tableHead}>
              <span style={{ flex: 1 }}>Member</span>
              <span style={{ width: 150 }}>Role</span>
              <span style={{ width: 110 }}>Status</span>
              <span style={{ width: 40 }} />
            </div>

            {/* Rows */}
            <div style={sx.tableBody}>
              {allRows.map((member, i) => {
                const isMe = member.userId === currentUserId;
                const isCreator = member.userId === team.createdBy;
                const isAdmin = member.roleInTeam === 'admin';
                const isInvited = member.status === 'invited';
                const displayName = getMemberDisplayName(member);
                const email = getMemberEmail(member);
                const changeable = isTeamAdmin && !isMe && !isCreator && !isInvited;
                const canRemove = isTeamAdmin && !isMe && !isCreator;
                const last = i === allRows.length - 1;

                return (
                  <div key={member.id} style={{ ...sx.row, borderBottom: last ? 'none' : `1px solid ${T.borderRow}` }}>
                    {/* Member cell */}
                    <div style={sx.memberCell}>
                      <div style={{
                        ...sx.avatar,
                        backgroundColor: getUserColor(member.userId || member.id),
                        opacity: isInvited ? 0.6 : 1,
                      }}>
                        {displayName[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={sx.nameRow}>
                          <span style={sx.memberName}>{displayName}</span>
                          {isMe && <span style={sx.youBadge}>you</span>}
                        </div>
                        <div style={sx.memberEmail}>{email || (isInvited ? 'Waiting to join — share the Team ID' : '')}</div>
                      </div>
                    </div>

                    {/* Role cell */}
                    <div style={{ width: 150, position: 'relative' }}>
                      {changeable ? (
                        <>
                          <button
                            style={sx.roleTrigger}
                            onClick={() => { setOpenRoleMenu(openRoleMenu === member.id ? null : member.id); setOpenActionMenu(null); }}
                          >
                            <span>{isAdmin ? 'Admin' : 'Member'}</span>
                            <Icon name="chevron-down" size={13} color={T.textFaintest} />
                          </button>
                          {openRoleMenu === member.id && (
                            <>
                              <div style={sx.menuBackdrop} onClick={() => setOpenRoleMenu(null)} />
                              <div style={sx.menu}>
                                {(['admin', 'member'] as const).map(role => (
                                  <button
                                    key={role}
                                    style={{ ...sx.menuItem, ...(member.roleInTeam === role ? sx.menuItemActive : {}) }}
                                    onClick={() => { onChangeRole(member.id, role); setOpenRoleMenu(null); }}
                                  >
                                    <span style={{ textTransform: 'capitalize' }}>{role}</span>
                                    {member.roleInTeam === role && <Icon name="check" size={13} color={T.accent} />}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      ) : isAdmin ? (
                        <span style={sx.adminPill}>Admin</span>
                      ) : (
                        <span style={sx.roleText}>Member</span>
                      )}
                    </div>

                    {/* Status cell */}
                    <div style={{ width: 110, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ ...sx.statusDot, background: isInvited ? T.orange : T.green }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: isInvited ? T.orange : T.green }}>
                        {isInvited ? 'Invited' : 'Active'}
                      </span>
                    </div>

                    {/* Actions cell */}
                    <div style={{ width: 40, display: 'flex', justifyContent: 'flex-end', position: 'relative' }}>
                      {canRemove ? (
                        <>
                          <button
                            style={sx.iconBtn}
                            onClick={() => { setOpenActionMenu(openActionMenu === member.id ? null : member.id); setOpenRoleMenu(null); }}
                          >
                            <MoreHorizontal size={16} color={T.textFaintest} />
                          </button>
                          {openActionMenu === member.id && (
                            <>
                              <div style={sx.menuBackdrop} onClick={() => setOpenActionMenu(null)} />
                              <div style={{ ...sx.menu, right: 0, left: 'auto' }}>
                                <button
                                  style={{ ...sx.menuItem, color: T.red }}
                                  onClick={() => { onRemoveMember(member.id, member.userId); setOpenActionMenu(null); }}
                                >
                                  <Icon name="user-minus" size={14} color={T.red} />
                                  {isInvited ? 'Cancel invite' : 'Remove from team'}
                                </button>
                              </div>
                            </>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'general' && (
          <>
            <div style={sx.contentHeader}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={sx.h2}>General</h2>
                <p style={sx.subtitle}>Workspace details and management.</p>
              </div>
            </div>

            {/* Team name (display-only) */}
            <div style={sx.fieldBlock}>
              <div style={sx.fieldLabel}>Team name</div>
              <div style={sx.nameChip}>{team.name}</div>
            </div>

            {/* Team ID + copy */}
            <div style={sx.fieldBlock}>
              <div style={sx.fieldLabel}>Team ID</div>
              <div style={sx.idRow}>
                <code style={sx.idChip}>{team.id}</code>
                <button onClick={handleCopyId} style={sx.copyBtn}>
                  {copiedId
                    ? <><Icon name="check" size={13} color={T.green} /><span style={{ color: T.green, fontWeight: 600 }}>Copied</span></>
                    : <><Icon name="copy" size={13} color={T.textMuted} /><span style={{ color: T.textSecondary, fontWeight: 600 }}>Copy</span></>}
                </button>
              </div>
              <div style={sx.fieldHint}>Share this ID so teammates can join your workspace.</div>
            </div>

            {/* Danger zone */}
            {canDeleteTeam && (
              <div style={sx.dangerZone}>
                <div style={sx.dangerTitle}>Delete team</div>
                <p style={sx.dangerText}>
                  Permanently delete <strong>{team.name}</strong>. All tasks, projects, and tags in this team will be removed. This cannot be undone.
                </p>
                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)} style={sx.dangerBtn}>
                    <Icon name="trash-2" size={13} color={T.red} />
                    Delete team
                  </button>
                ) : (
                  <div style={sx.dangerConfirm}>
                    <span style={{ fontSize: 12.5, color: T.textMuted }}>Are you sure? This can't be undone.</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setShowDeleteConfirm(false)} style={sx.ghostBtn}>Cancel</button>
                      <button onClick={onDeleteTeam} style={sx.dangerConfirmBtn}>Delete team</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const sx: Record<string, React.CSSProperties> = {
  surface: {
    position: 'fixed', inset: 0, zIndex: 600, background: '#FFFFFF',
    display: 'flex', fontFamily: T.font, color: T.textPrimary,
    transition: 'opacity 0.15s ease, transform 0.15s ease',
  },

  // ── Sub-nav ──
  subnav: {
    width: 230, flexShrink: 0, background: T.bgSecondary,
    borderRight: `1px solid ${T.border}`, padding: '20px 12px',
    display: 'flex', flexDirection: 'column',
  },
  backLink: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px 16px',
    background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.font,
    fontSize: 13, color: T.textMuted, fontWeight: 500, transition: 'color 0.15s ease',
    textAlign: 'left',
  },
  workspaceLabel: { ...monoLabel, padding: '0 8px 8px' },
  navList: { display: 'flex', flexDirection: 'column', gap: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
    borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: T.font, fontSize: 13.5, width: '100%', textAlign: 'left',
    transition: 'background-color 0.15s ease',
  },
  navItemActive: { background: T.accentTint },

  // ── Content ──
  content: { flex: 1, minWidth: 0, overflowY: 'auto', padding: '28px 36px', maxWidth: 860 },
  contentHeader: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 22 },
  h2: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 4px', color: T.textPrimary },
  subtitle: { fontSize: 12.5, color: T.textMuted, margin: 0 },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px',
    border: 'none', background: T.accent, color: '#fff', borderRadius: 8,
    fontFamily: T.font, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    boxShadow: T.shadowBtnGlow, whiteSpace: 'nowrap', flexShrink: 0,
  },
  primaryBtnSm: {
    padding: '7px 14px', border: 'none', background: T.accent, color: '#fff',
    borderRadius: 8, fontFamily: T.font, fontSize: 12.5, fontWeight: 600,
    cursor: 'pointer', boxShadow: T.shadowBtnGlow,
  },
  ghostBtn: {
    padding: '7px 14px', border: `1px solid ${T.borderBtn}`, background: '#fff',
    color: T.textSecondary, borderRadius: 8, fontFamily: T.font, fontSize: 12.5,
    fontWeight: 500, cursor: 'pointer',
  },

  // ── Add form ──
  addForm: {
    display: 'flex', flexDirection: 'column', gap: 10, padding: 14,
    marginBottom: 18, background: T.bgSecondary, borderRadius: 12,
    border: `1px solid ${T.borderCard}`,
  },
  addInput: {
    width: '100%', padding: '10px 12px', fontSize: 13.5, border: `1px solid ${T.borderCard}`,
    borderRadius: 9, outline: 'none', fontFamily: T.font, boxSizing: 'border-box',
    background: '#fff', color: T.textPrimary, transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  addFormRight: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  addHint: { flex: 1, minWidth: 160, fontSize: 12, color: T.textFaint, lineHeight: 1.5 },
  addFormActions: { display: 'flex', gap: 8, marginLeft: 'auto' },

  // ── Table ──
  tableHead: {
    display: 'flex', alignItems: 'center', padding: '0 16px 10px',
    ...monoLabel, fontSize: 11, letterSpacing: '0.04em',
  },
  tableBody: { border: `1px solid ${T.borderCard}`, borderRadius: 12, background: '#fff', overflow: 'hidden' },
  row: { display: 'flex', alignItems: 'center', padding: '12px 16px' },
  memberCell: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 11 },
  avatar: {
    width: 32, height: 32, borderRadius: '50%', color: '#fff', fontSize: 12,
    fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  nameRow: { display: 'flex', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 13.5, fontWeight: 550, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  memberEmail: { fontSize: 12, color: T.textFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  youBadge: {
    fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 6,
    background: T.accentTint, color: T.accentStrong, flexShrink: 0, letterSpacing: '0.2px',
  },

  // ── Role cell ──
  roleTrigger: {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px',
    marginLeft: -8, background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: T.font, fontSize: 12.5, color: T.textSecondary, borderRadius: 6,
  },
  roleText: { fontSize: 12.5, color: T.textSecondary },
  adminPill: {
    fontSize: 11.5, fontWeight: 600, color: T.accentStrong, background: T.accentTint,
    padding: '3px 10px', borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },

  // ── Menus ──
  iconBtn: {
    width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6,
  },
  menuBackdrop: { position: 'fixed', inset: 0, zIndex: 10 },
  menu: {
    position: 'absolute', top: '100%', left: 0, marginTop: 4, minWidth: 150,
    background: '#fff', borderRadius: 10, border: `1px solid ${T.borderCard}`,
    boxShadow: '0 6px 24px -4px rgba(20,20,50,0.14)', padding: 4, zIndex: 20,
  },
  menuItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    padding: '7px 10px', borderRadius: 6, background: 'none', border: 'none',
    cursor: 'pointer', fontFamily: T.font, fontSize: 13, fontWeight: 500,
    color: T.textSecondary, width: '100%', textAlign: 'left',
  },
  menuItemActive: { background: T.accentTint, color: T.accent },

  // ── General tab ──
  fieldBlock: { marginBottom: 24 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 7 },
  nameChip: {
    display: 'inline-block', padding: '9px 14px', border: `1px solid ${T.borderCard}`,
    borderRadius: 9, fontSize: 14, color: T.textPrimary, background: T.bgSecondary,
  },
  idRow: { display: 'flex', alignItems: 'center', gap: 8 },
  idChip: {
    fontFamily: T.mono, fontSize: 12.5, color: T.textSecondary, background: T.bgSecondary,
    border: `1px solid ${T.borderCard}`, borderRadius: 9, padding: '8px 12px',
    letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340,
  },
  copyBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px',
    border: `1px solid ${T.borderBtn}`, background: '#fff', borderRadius: 9,
    cursor: 'pointer', fontFamily: T.font, fontSize: 12.5, flexShrink: 0,
  },
  fieldHint: { fontSize: 12, color: T.textFaint, marginTop: 7 },

  // ── Danger zone ──
  dangerZone: {
    marginTop: 8, border: '1px solid #FFD9D9', borderRadius: 12, padding: 18,
    background: '#fff',
  },
  dangerTitle: { fontSize: 13.5, fontWeight: 600, color: T.red, marginBottom: 6 },
  dangerText: { fontSize: 12.5, color: T.textMuted, lineHeight: 1.5, margin: '0 0 14px' },
  dangerBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
    border: '1px solid #FFD9D9', background: '#fff', color: T.red, borderRadius: 8,
    fontFamily: T.font, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
  dangerConfirm: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  dangerConfirmBtn: {
    padding: '7px 14px', border: 'none', background: T.red, color: '#fff',
    borderRadius: 8, fontFamily: T.font, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
};
