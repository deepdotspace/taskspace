/**
 * User Management Modal - Add, manage, and claim users
 * Ported from previous_task_widget/components/UserManagement.jsx
 */

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../utils/icons';
import { WidgetUser, CustomUser, USER_COLOR_PALETTE, getRandomUserColor } from '../constants';
import ConfirmModal from './ConfirmModal';

interface UserManagementProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: WidgetUser[];
  customUsers?: CustomUser[];
  currentUser: WidgetUser | null;
  onAddUser?: (userData: { name: string; email: string; color: string }) => Promise<WidgetUser | CustomUser | null>;
  onUpdateUser?: (id: string, updates: Partial<{ name: string; email: string; color: string }>) => void;
  onDeleteUser?: (id: string) => void;
  onSelectUser?: (user: WidgetUser | null) => void;
  selectedUserId: string | null;
  mode: 'manage' | 'assign';
  getDisplayName: (user: WidgetUser | null) => string;
}

export default function UserManagement({
  isOpen, onClose, allUsers, customUsers = [], currentUser,
  onAddUser, onUpdateUser, onDeleteUser,
  onSelectUser, selectedUserId, mode, getDisplayName,
}: UserManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserColor, setNewUserColor] = useState(USER_COLOR_PALETTE[0]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAddForm && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showAddForm]);

  if (!isOpen) return null;

  const handleAddUser = async () => {
    const email = newUserEmail.trim();
    if (email && onAddUser) {
      const derivedName = email.split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      const newUser = await onAddUser({
        name: derivedName,
        email,
        color: newUserColor,
      });
      setNewUserEmail('');
      setNewUserColor(getRandomUserColor());
      setShowAddForm(false);

      // If in assign mode, select the new user
      if (mode === 'assign' && newUser && onSelectUser) {
        onSelectUser(newUser as WidgetUser);
      }
    }
  };

  const handleStartEdit = (user: WidgetUser | CustomUser) => {
    setEditingUserId(user.id);
    setEditName(user.name);
  };

  const handleSaveEdit = (userId: string) => {
    if (editName.trim() && onUpdateUser) {
      onUpdateUser(userId, { name: editName.trim() });
    }
    setEditingUserId(null);
    setEditName('');
  };

  const handleDeleteClick = (user: WidgetUser | CustomUser) => {
    setUserToDelete({ id: user.id, name: user.name });
  };

  const handleConfirmDelete = () => {
    if (userToDelete && onDeleteUser) {
      onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  };

  const isUserCustom = (user: WidgetUser | CustomUser): boolean => {
    // Check if user is in customUsers list
    return customUsers.some(cu => cu.id === user.id);
  };

  const isCurrentUser = (userId: string): boolean => currentUser?.id === userId;

  // Combine platform users + custom users
  const displayUsers: WidgetUser[] = [
    ...allUsers,
    ...customUsers
      .filter(cu => !allUsers.some(u => u.id === cu.id))
      .map(cu => ({
        id: cu.id,
        name: cu.name,
        email: cu.email,
        color: cu.color,
        role: 'member' as string,
      })),
  ];

  return (
    <div style={umStyles.overlay} onClick={onClose}>
      <div style={umStyles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={umStyles.header}>
          <h3 style={umStyles.title}>
            {mode === 'assign' ? 'Assign To' : 'Team Members'}
          </h3>
          <button onClick={onClose} style={umStyles.closeButton}>
            <Icon name="x" size={18} color="#8E8E93" />
          </button>
        </div>

        {/* Current user info */}
        {mode === 'manage' && currentUser && (() => {
          const displayName = getDisplayName(currentUser);
          return (
            <div style={umStyles.currentUserBar}>
              <span>Logged in as <strong>{displayName}</strong></span>
            </div>
          );
        })()}

        {/* User List */}
        <div style={umStyles.userList}>
          {mode === 'assign' && (
            <div style={umStyles.userRow}>
              <button
                onClick={() => onSelectUser?.(null)}
                style={{
                  ...umStyles.userItem,
                  ...(selectedUserId === null ? umStyles.userItemSelected : {}),
                }}
              >
                <div style={{ ...umStyles.userAvatar, backgroundColor: '#C7C7CC' }}>?</div>
                <div style={umStyles.userInfo}>
                  <span style={umStyles.userName}>Unassigned</span>
                </div>
                <div style={umStyles.badges} />
                {selectedUserId === null && (
                  <span style={{ marginLeft: 8 }}>
                    <Icon name="check" size={16} color="#007AFF" />
                  </span>
                )}
              </button>
            </div>
          )}

          {displayUsers.map(user => {
            const isCustom = isUserCustom(user);

            return (
              <div key={user.id} style={umStyles.userRow}>
                {editingUserId === user.id ? (
                  <div style={umStyles.editRow}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(user.id);
                        if (e.key === 'Escape') setEditingUserId(null);
                      }}
                      style={umStyles.editInput}
                      autoFocus
                    />
                    <button onClick={() => handleSaveEdit(user.id)} style={umStyles.saveEditButton}>
                      <Icon name="check" size={14} color="white" />
                    </button>
                    <button onClick={() => setEditingUserId(null)} style={umStyles.cancelEditButton}>
                      <Icon name="x" size={14} color="#8E8E93" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (mode === 'assign') onSelectUser?.(user);
                    }}
                    style={{
                      ...umStyles.userItem,
                      ...(mode === 'assign' && selectedUserId === user.id ? umStyles.userItemSelected : {}),
                      cursor: mode === 'assign' ? 'pointer' : 'default',
                    }}
                  >
                    {(() => {
                      const displayName = getDisplayName(user);
                      return (
                        <>
                          <div style={{ ...umStyles.userAvatar, backgroundColor: user.color || '#007AFF' }}>
                            {displayName?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div style={umStyles.userInfo}>
                            <span style={umStyles.userName}>{displayName}</span>
                            {user.email && <span style={umStyles.userEmail}>{user.email}</span>}
                          </div>
                        </>
                      );
                    })()}

                    {/* Badges */}
                    <div style={umStyles.badges}>
                      {isCurrentUser(user.id) && (
                        <span style={umStyles.youBadge}>You</span>
                      )}
                      {!isCustom && !isCurrentUser(user.id) && (
                        <span style={umStyles.activeBadge}>Active</span>
                      )}
                      {isCustom && !isCurrentUser(user.id) && (
                        <span style={umStyles.pendingBadge}>Pending</span>
                      )}
                    </div>

                    {/* Selection indicator for assign mode */}
                    {mode === 'assign' && selectedUserId === user.id && (
                      <span style={{ marginLeft: 8 }}>
                        <Icon name="check" size={16} color="#007AFF" />
                      </span>
                    )}
                  </button>
                )}

                {/* Actions for custom users */}
                {isCustom && editingUserId !== user.id && onUpdateUser && onDeleteUser && (
                  <div style={umStyles.userActions}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStartEdit(user); }}
                      style={umStyles.actionButton}
                      title="Edit"
                    >
                      <Icon name="pencil" size={12} color="#8E8E93" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(user); }}
                      style={{ ...umStyles.actionButton, color: '#FF3B30' }}
                      title="Delete"
                    >
                      <Icon name="trash-2" size={12} color="#FF3B30" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {displayUsers.length === 0 && (
            <div style={umStyles.emptyState}>
              <Icon name="users" size={32} color="#C7C7CC" />
              <span>No users yet</span>
              <span style={umStyles.emptyHint}>Add users to assign tasks</span>
            </div>
          )}
        </div>

        {/* Add User Form */}
        {onAddUser && (
          showAddForm ? (
            <div style={umStyles.addForm}>
              <div style={umStyles.formHint}>
                <Icon name="mail" size={14} color="#007AFF" />
                <span>Enter their email address. When they log in, tasks will be automatically assigned to them.</span>
              </div>
              <div style={umStyles.formRow}>
                <input
                  ref={inputRef}
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Email address"
                  style={umStyles.formInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newUserEmail.trim()) handleAddUser();
                    if (e.key === 'Escape') setShowAddForm(false);
                  }}
                />
              </div>
              <div style={umStyles.colorPicker}>
                {USER_COLOR_PALETTE.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewUserColor(color)}
                    style={{
                      ...umStyles.colorOption,
                      backgroundColor: color,
                      ...(newUserColor === color ? umStyles.colorOptionSelected : {}),
                    }}
                  />
                ))}
              </div>
              <div style={umStyles.formActions}>
                <button onClick={() => setShowAddForm(false)} style={umStyles.cancelButton}>
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={!newUserEmail.trim()}
                  style={{ ...umStyles.addButton, opacity: newUserEmail.trim() ? 1 : 0.5 }}
                >
                  Add User
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddForm(true)} style={umStyles.showAddButton}>
              <Icon name="user-plus" size={16} color="#007AFF" />
              Add by Email
            </button>
          )
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={userToDelete !== null}
        title="Delete User"
        message={
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '15px', color: '#1D1D1F' }}>
              Delete user &quot;<strong>{userToDelete?.name}</strong>&quot;?
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
              They will be unassigned from all tasks.
            </p>
          </div>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmStyle="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}

// ── UserManagement Styles (ported from old widget) ──────────
const umStyles: Record<string, React.CSSProperties> = {
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
    width: 380,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
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
    color: '#8E8E93',
    cursor: 'pointer',
    borderRadius: 6,
  },
  currentUserBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderBottom: '1px solid #E5E5EA',
    fontSize: 13,
    color: '#1D1D1F',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  userList: {
    flex: 1,
    overflow: 'auto',
    padding: '8px 0',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
  },
  userItem: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    margin: '2px 0',
    border: 'none',
    background: 'transparent',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  userItemSelected: {
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#1D1D1F',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userEmail: {
    fontSize: 12,
    color: '#8E8E93',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badges: {
    display: 'flex',
    gap: 6,
    marginLeft: 'auto',
  },
  activeBadge: {
    fontSize: 10,
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: 10,
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    color: '#34C759',
    letterSpacing: '0.2px',
  },
  pendingBadge: {
    fontSize: 10,
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    color: '#FF9500',
    letterSpacing: '0.2px',
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
  userActions: {
    display: 'flex',
    gap: 4,
    marginLeft: 4,
  },
  actionButton: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    color: '#8E8E93',
    cursor: 'pointer',
    borderRadius: 6,
  },
  editRow: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
  },
  editInput: {
    flex: 1,
    padding: '6px 10px',
    fontSize: 14,
    border: '1px solid #007AFF',
    borderRadius: 6,
    outline: 'none',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    boxSizing: 'border-box',
  },
  saveEditButton: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: '#34C759',
    color: 'white',
    cursor: 'pointer',
    borderRadius: 6,
  },
  cancelEditButton: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: '#E5E5EA',
    color: '#8E8E93',
    cursor: 'pointer',
    borderRadius: 6,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    color: '#8E8E93',
    fontSize: 14,
    gap: 8,
  },
  emptyHint: {
    fontSize: 12,
    color: '#AEAEB2',
  },
  addForm: {
    padding: '16px 20px',
    borderTop: '1px solid #E5E5EA',
    backgroundColor: '#F5F5F7',
  },
  formHint: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '12px 14px',
    marginBottom: 14,
    backgroundColor: 'rgba(0, 122, 255, 0.06)',
    borderRadius: 10,
    fontSize: 13,
    color: '#6E6E73',
    lineHeight: 1.5,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  formRow: {
    marginBottom: 12,
  },
  formInput: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 15,
    border: '1px solid #f0f0f0',
    borderRadius: 12,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  colorPicker: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 24,
    height: 24,
    borderRadius: 6,
    border: '2px solid transparent',
    cursor: 'pointer',
    padding: 0,
  },
  colorOptionSelected: {
    border: '2px solid #1D1D1F',
    boxShadow: '0 0 0 1px white inset',
  },
  formActions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    color: '#8E8E93',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  addButton: {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    color: '#fff',
    background: '#007AFF',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  showAddButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '14px 20px',
    borderTop: '1px solid #E5E5EA',
    border: 'none',
    background: 'transparent',
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
};
