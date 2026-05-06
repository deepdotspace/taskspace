/**
 * MembersPanel — modal for viewing and managing workspace members.
 *
 * Adapted from the original TeamSettings component for the new single-scope
 * SDK model. Role management via useUsers().setRole() (sends user.set_role
 * over the WebSocket; only admins can change roles per DO RBAC).
 */

import React, { useState } from 'react';
import { Icon } from '../utils/icons';
import { WidgetUser, getUserColor } from '../constants';

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access, can manage members' },
  { value: 'member', label: 'Member', description: 'Can create and edit tasks' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
] as const;

type RoleValue = 'admin' | 'member' | 'viewer';

interface MembersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  users: WidgetUser[];
  currentUserId: string;
  isAdmin: boolean;
  onSetRole: (userId: string, role: string) => void;
}

export function MembersPanel({ isOpen, onClose, users, currentUserId, isAdmin, onSetRole }: MembersPanelProps) {
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRoleChange = (userId: string, role: string) => {
    onSetRole(userId, role);
    setChangingRoleFor(null);
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <h3 style={s.title}>Workspace Members</h3>
          <button onClick={onClose} style={s.closeBtn}>
            <Icon name="x" size={18} color="#8E8E93" />
          </button>
        </div>

        {/* Info bar */}
        <div style={s.infoBar}>
          <Icon name="users" size={14} color="#007AFF" />
          <span style={s.infoText}>
            {users.length} member{users.length !== 1 ? 's' : ''} in this workspace
          </span>
        </div>

        {/* Member list */}
        <div style={s.list}>
          {users.map(user => {
            const isMe = user.id === currentUserId;
            const userRole = (user.role || 'member') as RoleValue;
            const isChanging = changingRoleFor === user.id;

            return (
              <div key={user.id} style={s.row}>
                {/* Avatar */}
                <div style={{ ...s.avatar, backgroundColor: getUserColor(user.id) }}>
                  {user.imageUrl
                    ? <img src={user.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                    : (user.name?.[0] || '?').toUpperCase()
                  }
                </div>

                {/* Info */}
                <div style={s.info}>
                  <div style={s.nameRow}>
                    <span style={s.name}>{user.name || 'Unknown'}</span>
                    {isMe && <span style={s.youBadge}>You</span>}
                  </div>
                  {user.email && <span style={s.email}>{user.email}</span>}
                </div>

                {/* Role section */}
                <div style={s.roleSection}>
                  {isChanging ? (
                    /* Role picker */
                    <div style={s.rolePicker}>
                      {ROLES.map(r => (
                        <button
                          key={r.value}
                          onClick={() => handleRoleChange(user.id, r.value)}
                          style={{
                            ...s.roleOption,
                            ...(userRole === r.value ? s.roleOptionActive : {}),
                          }}
                        >
                          <span style={s.roleOptionLabel}>{r.label}</span>
                          <span style={s.roleOptionDesc}>{r.description}</span>
                        </button>
                      ))}
                      <button onClick={() => setChangingRoleFor(null)} style={s.cancelChangeBtn}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    /* Role badge + change button */
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ ...s.roleBadge, ...roleBadgeStyle(userRole) }}>
                        {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                      </span>
                      {/* Admin can change other members' roles, but not their own */}
                      {isAdmin && !isMe && (
                        <button
                          onClick={() => setChangingRoleFor(user.id)}
                          style={s.changeRoleBtn}
                          title="Change role"
                        >
                          <Icon name="chevron-down" size={12} color="#8E8E93" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {users.length === 0 && (
            <div style={s.empty}>
              <Icon name="users" size={32} color="#C7C7CC" />
              <span>No members yet</span>
            </div>
          )}
        </div>

        {/* Footer hint */}
        {isAdmin && (
          <div style={s.footer}>
            <Icon name="info" size={13} color="#8E8E93" />
            <span style={s.footerText}>
              New members join when they sign in to this app. Admins can adjust their roles here.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function roleBadgeStyle(role: RoleValue): React.CSSProperties {
  switch (role) {
    case 'admin':
      return { backgroundColor: 'rgba(0, 122, 255, 0.12)', color: '#007AFF' };
    case 'member':
      return { backgroundColor: 'rgba(52, 199, 89, 0.12)', color: '#34C759' };
    case 'viewer':
      return { backgroundColor: 'rgba(142, 142, 147, 0.12)', color: '#8E8E93' };
  }
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  },
  modal: {
    background: '#fff',
    borderRadius: 14,
    width: 400,
    maxWidth: 'calc(100vw - 32px)',
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
  },
  title: {
    margin: 0,
    fontSize: 17,
    fontWeight: 600,
    color: '#1D1D1F',
  },
  closeBtn: {
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
  infoBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    backgroundColor: 'rgba(0, 122, 255, 0.06)',
    borderBottom: '1px solid #E5E5EA',
  },
  infoText: {
    fontSize: 13,
    color: '#3C3C43',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '10px 20px',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  info: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: 500,
    color: '#1D1D1F',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  youBadge: {
    fontSize: 10,
    fontWeight: 500,
    padding: '2px 6px',
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    color: '#007AFF',
    letterSpacing: '0.2px',
    flexShrink: 0,
  },
  email: {
    fontSize: 12,
    color: '#8E8E93',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  roleSection: {
    flexShrink: 0,
  },
  roleBadge: {
    fontSize: 11,
    fontWeight: 500,
    padding: '3px 10px',
    borderRadius: 10,
    letterSpacing: '0.1px',
  },
  changeRoleBtn: {
    width: 22,
    height: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #E5E5EA',
    background: '#F9FAFB',
    cursor: 'pointer',
    borderRadius: 5,
    padding: 0,
  },
  rolePicker: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '8px',
    background: '#fff',
    border: '1px solid #E5E5EA',
    borderRadius: 10,
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    minWidth: 180,
  },
  roleOption: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    padding: '8px 10px',
    border: 'none',
    background: 'transparent',
    borderRadius: 6,
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
  },
  roleOptionActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  roleOptionLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: '#1D1D1F',
  },
  roleOptionDesc: {
    fontSize: 11,
    color: '#8E8E93',
  },
  cancelChangeBtn: {
    padding: '6px 10px',
    border: 'none',
    background: 'transparent',
    color: '#8E8E93',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: 'inherit',
    borderRadius: 6,
    marginTop: 2,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    color: '#8E8E93',
    fontSize: 14,
    gap: 8,
  },
  footer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '12px 20px',
    borderTop: '1px solid #E5E5EA',
    backgroundColor: '#F9FAFB',
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 1.5,
  },
};
