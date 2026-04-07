/**
 * TeamOnboarding — shown when an authenticated user has no teams.
 * Allows creating a new team or joining an existing one by team ID.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../utils/icons';

interface TeamOnboardingProps {
  onCreate: (name: string, options?: { isOpen?: boolean }) => string;
  onJoin: (teamId: string, userId: string, roleInTeam?: string) => void;
  userId: string;
  mode?: 'choose' | 'create' | 'join';
  onClose?: () => void;
}

export default function TeamOnboarding({ onCreate, onJoin, userId, mode: initialMode = 'choose', onClose }: TeamOnboardingProps) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>(initialMode);
  const [teamName, setTeamName] = useState('');
  const [joinTeamId, setJoinTeamId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode !== 'choose' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  const handleCreate = () => {
    const name = teamName.trim();
    if (!name) return;
    setError(null);
    try {
      onCreate(name, { isOpen: true });
    } catch (err: any) {
      setError(err?.message || 'Failed to create team');
    }
  };

  const handleJoin = () => {
    const tid = joinTeamId.trim();
    if (!tid) return;
    setError(null);
    try {
      onJoin(tid, userId);
    } catch (err: any) {
      setError(err?.message || 'Failed to join team. Check the team ID and try again.');
    }
  };

  return (
    <div data-testid="team-onboarding" style={obStyles.container}>
      <div style={obStyles.card}>
        {/* Close button for modal mode */}
        {onClose && mode !== 'choose' && (
          <button onClick={onClose} style={obStyles.closeBtn}>
            <Icon name="x" size={18} color="#8E8E93" />
          </button>
        )}
        
        {mode === 'choose' && (
          <>
            <div style={obStyles.header}>
              <Icon name="users" size={28} color="#007AFF" />
              <h2 style={obStyles.title}>Welcome to Task Manager</h2>
              <p style={obStyles.subtitle}>
                Create a team to get started, or join an existing one.
              </p>
            </div>

            <div style={obStyles.optionList}>
              <button data-testid="create-team-btn" onClick={() => setMode('create')} style={obStyles.optionButton}>
                <div style={obStyles.optionIcon}>
                  <Icon name="plus-circle" size={20} color="#007AFF" />
                </div>
                <div style={obStyles.optionInfo}>
                  <span style={obStyles.optionTitle}>Create a New Team</span>
                  <span style={obStyles.optionDesc}>
                    Start fresh and invite your teammates
                  </span>
                </div>
                <Icon name="chevron-right" size={16} color="#C7C7CC" />
              </button>

              <button data-testid="join-team-btn" onClick={() => setMode('join')} style={obStyles.optionButton}>
                <div style={obStyles.optionIcon}>
                  <Icon name="log-in" size={20} color="#34C759" />
                </div>
                <div style={obStyles.optionInfo}>
                  <span style={obStyles.optionTitle}>Join an Existing Team</span>
                  <span style={obStyles.optionDesc}>
                    Enter the team ID from your admin
                  </span>
                </div>
                <Icon name="chevron-right" size={16} color="#C7C7CC" />
              </button>
            </div>
          </>
        )}

        {mode === 'create' && (
          <>
            <div style={obStyles.header}>
              <button onClick={() => { onClose ? onClose() : setMode('choose'); setError(null); }} style={obStyles.backButton}>
                <Icon name="arrow-left" size={16} color="#007AFF" />
                <span>Back</span>
              </button>
              <h2 style={obStyles.title}>Create a Team</h2>
              <p style={obStyles.subtitle}>
                Give your team a name. You'll be the admin and can share the team ID with members.
              </p>
            </div>

            <div style={obStyles.formGroup}>
              <label style={obStyles.label}>Team Name</label>
              <input
                ref={inputRef}
                data-testid="team-name-input"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && teamName.trim()) handleCreate();
                  if (e.key === 'Escape') { onClose ? onClose() : setMode('choose'); setError(null); }
                }}
                placeholder="e.g. Engineering, Design, Marketing"
                style={obStyles.input}
              />
            </div>

            {error && <div style={obStyles.error}>{error}</div>}

            <div style={obStyles.actions}>
              <button
                onClick={() => { onClose ? onClose() : setMode('choose'); setError(null); }}
                style={obStyles.cancelBtn}
              >
                Cancel
              </button>
              <button
                data-testid="submit-create-team"
                onClick={handleCreate}
                disabled={!teamName.trim()}
                style={{
                  ...obStyles.primaryBtn,
                  opacity: !teamName.trim() ? 0.5 : 1,
                }}
              >
                Create Team
              </button>
            </div>
          </>
        )}

        {mode === 'join' && (
          <>
            <div style={obStyles.header}>
              <button onClick={() => { onClose ? onClose() : setMode('choose'); setError(null); }} style={obStyles.backButton}>
                <Icon name="arrow-left" size={16} color="#007AFF" />
                <span>Back</span>
              </button>
              <h2 style={obStyles.title}>Join a Team</h2>
              <p style={obStyles.subtitle}>
                Enter the team ID provided by your workspace admin.
                If you don't know your team ID, ask your admin.
              </p>
            </div>

            <div style={obStyles.formGroup}>
              <label style={obStyles.label}>Team ID</label>
              <input
                ref={inputRef}
                data-testid="join-team-id-input"
                type="text"
                value={joinTeamId}
                onChange={(e) => setJoinTeamId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && joinTeamId.trim()) handleJoin();
                  if (e.key === 'Escape') { onClose ? onClose() : setMode('choose'); setError(null); }
                }}
                placeholder="Paste team ID here"
                style={obStyles.input}
              />
            </div>

            {error && <div style={obStyles.error}>{error}</div>}

            <div style={obStyles.actions}>
              <button
                onClick={() => { onClose ? onClose() : setMode('choose'); setError(null); }}
                style={obStyles.cancelBtn}
              >
                Cancel
              </button>
              <button
                data-testid="submit-join-team"
                onClick={handleJoin}
                disabled={!joinTeamId.trim()}
                style={{
                  ...obStyles.primaryBtn,
                  opacity: !joinTeamId.trim() ? 0.5 : 1,
                }}
              >
                Join Team
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const obStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - var(--mobile-header-height, 0px))',
    marginTop: 'var(--mobile-header-height, 0px)',
    background: '#F5F5F7',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    padding: 24,
  },
  card: {
    position: 'relative',
    background: '#fff',
    borderRadius: 16,
    padding: '32px 28px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    margin: '12px 0 4px',
    fontSize: 22,
    fontWeight: 700,
    color: '#1D1D1F',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    margin: 0,
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 1.5,
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    padding: 0,
    marginBottom: 4,
    fontFamily: 'inherit',
  },
  optionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  optionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 12px',
    background: '#F9FAFB',
    border: '1px solid #E5E5EA',
    borderRadius: 12,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s ease, border-color 0.15s ease',
    fontFamily: 'inherit',
    width: '100%',
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1D1D1F',
  },
  optionDesc: {
    fontSize: 12,
    color: '#8E8E93',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#3C3C43',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: 15,
    border: '1px solid #E5E5EA',
    borderRadius: 10,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s ease',
    color: '#1D1D1F',
  },
  error: {
    padding: '10px 14px',
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    color: '#FF3B30',
    fontSize: 13,
    borderRadius: 8,
    marginBottom: 16,
  },
  actions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 500,
    color: '#8E8E93',
    background: 'none',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  primaryBtn: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: '#007AFF',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'opacity 0.15s ease',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 6,
    padding: 0,
  },
};

