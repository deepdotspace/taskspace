/**
 * TeamOnboarding — shown when an authenticated user has no teams.
 * Allows creating a new team or joining an existing one by team ID.
 *
 * Adapted from the original widget for the new SDK:
 * - onCreate: uses useMutations('teams') + useMutations('team_members')
 * - onJoin: uses useMutations('team_members') to create a self-membership
 */
import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../utils/icons';

interface TeamOnboardingProps {
  onCreate: (name: string) => Promise<string | null>; // returns new teamId or null on error
  onJoin: (teamId: string) => Promise<boolean>;       // returns true on success
  onClose?: () => void;
  mode?: 'choose' | 'create' | 'join';
}

export function TeamOnboarding({ onCreate, onJoin, onClose, mode: initialMode = 'choose' }: TeamOnboardingProps) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>(initialMode);
  const [teamName, setTeamName] = useState('');
  const [joinTeamId, setJoinTeamId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode !== 'choose' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  const handleCreate = async () => {
    const name = teamName.trim();
    if (!name) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const teamId = await onCreate(name);
      if (!teamId) setError('Failed to create team. Please try again.');
      else if (onClose) onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to create team');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async () => {
    const tid = joinTeamId.trim();
    if (!tid) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const ok = await onJoin(tid);
      if (!ok) setError('Could not join team. Check the team ID and try again.');
      else if (onClose) onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to join team. Check the team ID and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => { onClose ? onClose() : setMode('choose'); setError(null); };

  return (
    <div style={s.container}>
      <div style={s.card}>
        {onClose && mode !== 'choose' && (
          <button onClick={onClose} style={s.closeBtn}>
            <Icon name="x" size={18} color="#8E8E93" />
          </button>
        )}

        {mode === 'choose' && (
          <>
            <div style={s.header}>
              <Icon name="users" size={28} color="#007AFF" />
              <h2 style={s.title}>Welcome to Task Manager</h2>
              <p style={s.subtitle}>Create a team to get started, or join an existing one.</p>
            </div>
            <div style={s.optionList}>
              <button onClick={() => setMode('create')} style={s.optionButton}>
                <div style={s.optionIcon}><Icon name="plus-circle" size={20} color="#007AFF" /></div>
                <div style={s.optionInfo}>
                  <span style={s.optionTitle}>Create a New Team</span>
                  <span style={s.optionDesc}>Start fresh and invite your teammates</span>
                </div>
                <Icon name="chevron-right" size={16} color="#C7C7CC" />
              </button>
              <button onClick={() => setMode('join')} style={s.optionButton}>
                <div style={{ ...s.optionIcon, backgroundColor: 'rgba(52, 199, 89, 0.08)' }}>
                  <Icon name="log-in" size={20} color="#34C759" />
                </div>
                <div style={s.optionInfo}>
                  <span style={s.optionTitle}>Join an Existing Team</span>
                  <span style={s.optionDesc}>Enter the team ID from your admin</span>
                </div>
                <Icon name="chevron-right" size={16} color="#C7C7CC" />
              </button>
            </div>
          </>
        )}

        {mode === 'create' && (
          <>
            <div style={s.header}>
              <button onClick={goBack} style={s.backButton}>
                <Icon name="arrow-left" size={16} color="#007AFF" />
                <span>Back</span>
              </button>
              <h2 style={s.title}>Create a Team</h2>
              <p style={s.subtitle}>Give your team a name. You'll be the admin and can share the team ID with members.</p>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Team Name</label>
              <input
                ref={inputRef} type="text" value={teamName}
                onChange={e => setTeamName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && teamName.trim()) handleCreate();
                  if (e.key === 'Escape') goBack();
                }}
                placeholder="e.g. Engineering, Design, Marketing"
                style={s.input} disabled={isSubmitting}
              />
            </div>
            {error && <div style={s.error}>{error}</div>}
            <div style={s.actions}>
              <button onClick={goBack} style={s.cancelBtn} disabled={isSubmitting}>Cancel</button>
              <button onClick={handleCreate} disabled={!teamName.trim() || isSubmitting}
                style={{ ...s.primaryBtn, opacity: (!teamName.trim() || isSubmitting) ? 0.5 : 1 }}>
                {isSubmitting ? 'Creating…' : 'Create Team'}
              </button>
            </div>
          </>
        )}

        {mode === 'join' && (
          <>
            <div style={s.header}>
              <button onClick={goBack} style={s.backButton}>
                <Icon name="arrow-left" size={16} color="#007AFF" />
                <span>Back</span>
              </button>
              <h2 style={s.title}>Join a Team</h2>
              <p style={s.subtitle}>Enter the team ID provided by your workspace admin. If you don't know your team ID, ask your admin.</p>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Team ID</label>
              <input
                ref={inputRef} type="text" value={joinTeamId}
                onChange={e => setJoinTeamId(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && joinTeamId.trim()) handleJoin();
                  if (e.key === 'Escape') goBack();
                }}
                placeholder="Paste team ID here"
                style={s.input} disabled={isSubmitting}
              />
            </div>
            {error && <div style={s.error}>{error}</div>}
            <div style={s.actions}>
              <button onClick={goBack} style={s.cancelBtn} disabled={isSubmitting}>Cancel</button>
              <button onClick={handleJoin} disabled={!joinTeamId.trim() || isSubmitting}
                style={{ ...s.primaryBtn, opacity: (!joinTeamId.trim() || isSubmitting) ? 0.5 : 1 }}>
                {isSubmitting ? 'Joining…' : 'Join Team'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#F5F5F7', padding: 24,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  },
  card: {
    position: 'relative', background: '#fff', borderRadius: 16,
    padding: '32px 28px', width: '100%', maxWidth: 420,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  header: { marginBottom: 24 },
  title: { margin: '12px 0 4px', fontSize: 22, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.3px' },
  subtitle: { margin: 0, fontSize: 14, color: '#8E8E93', lineHeight: 1.5 },
  backButton: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'none', border: 'none', color: '#007AFF', fontSize: 14,
    fontWeight: 500, cursor: 'pointer', padding: 0, marginBottom: 4, fontFamily: 'inherit',
  },
  optionList: { display: 'flex', flexDirection: 'column', gap: 8 },
  optionButton: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 12px',
    background: '#F9FAFB', border: '1px solid #E5E5EA', borderRadius: 12,
    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%',
  },
  optionIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0, 122, 255, 0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  optionInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  optionTitle: { fontSize: 15, fontWeight: 600, color: '#1D1D1F' },
  optionDesc: { fontSize: 12, color: '#8E8E93' },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#3C3C43', marginBottom: 6 },
  input: {
    width: '100%', padding: '12px 14px', fontSize: 15, border: '1px solid #E5E5EA',
    borderRadius: 10, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const,
    color: '#1D1D1F',
  },
  error: {
    padding: '10px 14px', backgroundColor: 'rgba(255, 59, 48, 0.08)',
    color: '#FF3B30', fontSize: 13, borderRadius: 8, marginBottom: 16,
  },
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  cancelBtn: {
    padding: '10px 18px', fontSize: 14, fontWeight: 500, color: '#8E8E93',
    background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
  },
  primaryBtn: {
    padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#fff',
    background: '#007AFF', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 12, width: 28, height: 28,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 6, padding: 0,
  },
};
