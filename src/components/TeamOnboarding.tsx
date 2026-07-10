/**
 * TeamOnboarding — shown when an authenticated user has no teams,
 * or as a dismissible overlay to create/join another team.
 *
 * "Momentum" design: a dimmed app-skeleton backdrop under a scrim, with a
 * centered 460px modal carrying segmented Create / Join tabs.
 *
 * Adapted from the original widget for the new SDK:
 * - onCreate: uses useMutations('teams') + useMutations('team_members')
 * - onJoin: uses useMutations('team_members') to create a self-membership
 *
 * Prop interface unchanged: onCreate / onJoin / onClose / mode.
 * The `mode` prop preselects a tab ('join' → Join, otherwise Create).
 * When `onClose` is provided the modal is dismissible (✕ + scrim click);
 * when absent (no team yet) it cannot be closed.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../utils/icons';
import { Building2 } from 'lucide-react';
import { T } from '../utils/styles';

interface TeamOnboardingProps {
  onCreate: (name: string) => Promise<string | null>; // returns new teamId or null on error
  onJoin: (teamId: string) => Promise<boolean>;       // returns true on success
  onClose?: () => void;
  mode?: 'choose' | 'create' | 'join';
}

export function TeamOnboarding({ onCreate, onJoin, onClose, mode: initialMode = 'choose' }: TeamOnboardingProps) {
  const [tab, setTab] = useState<'create' | 'join'>(initialMode === 'join' ? 'join' : 'create');
  const [teamName, setTeamName] = useState('');
  const [joinTeamId, setJoinTeamId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [tab]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const switchTab = (next: 'create' | 'join') => { setTab(next); setError(null); };

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

  return (
    <div style={s.overlay}>
      {/* dimmed app skeleton backdrop */}
      <div style={s.skeleton}>
        <div style={s.skeletonRail} />
        <div style={s.skeletonMain}>
          <div style={s.skeletonTitle} />
          <div style={s.skeletonRow} />
          <div style={s.skeletonRow} />
          <div style={s.skeletonRow} />
        </div>
      </div>
      <div style={s.scrim} onClick={() => { if (onClose) onClose(); }} />

      {/* modal */}
      <div
        data-modal-content
        style={{ ...s.modal, opacity: mounted ? 1 : 0, transform: `translate(-50%,-50%) scale(${mounted ? 1 : 0.98})` }}
        onClick={e => e.stopPropagation()}
      >
        {onClose && (
          <button onClick={onClose} style={s.closeBtn} aria-label="Close">
            <Icon name="x" size={16} color={T.textFaint} />
          </button>
        )}

        <div style={s.head}>
          <div style={s.tile}>
            <Icon name="users" size={24} color="#fff" />
          </div>
          <h3 style={s.title}>Set up your team</h3>
          <p style={s.subtitle}>Create a fresh workspace or join one you've been invited to.</p>
        </div>

        {/* segmented tabs */}
        <div style={s.segTrack}>
          <button
            style={{ ...s.seg, ...(tab === 'create' ? s.segActive : {}) }}
            onClick={() => switchTab('create')}
          >
            Create a team
          </button>
          <button
            style={{ ...s.seg, ...(tab === 'join' ? s.segActive : {}) }}
            onClick={() => switchTab('join')}
          >
            Join a team
          </button>
        </div>

        <div style={s.formArea}>
          {tab === 'create' ? (
            <>
              <label style={s.label}>Team name</label>
              <div style={s.inputWrap}>
                <Building2 size={16} color={T.textFaint} strokeWidth={2} style={{ flexShrink: 0 }} />
                <input
                  ref={inputRef} type="text" value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && teamName.trim()) handleCreate(); }}
                  placeholder="Acme Inc"
                  style={s.input} disabled={isSubmitting}
                  onFocus={e => { const w = e.currentTarget.parentElement; if (w) { w.style.borderColor = T.accent; w.style.boxShadow = '0 0 0 3px rgba(107,76,230,.15)'; } }}
                  onBlur={e => { const w = e.currentTarget.parentElement; if (w) { w.style.borderColor = T.borderCard; w.style.boxShadow = 'none'; } }}
                />
              </div>
              {error && <div style={s.error}>{error}</div>}
              <button
                onClick={handleCreate} disabled={!teamName.trim() || isSubmitting}
                style={{ ...s.primaryBtn, opacity: (!teamName.trim() || isSubmitting) ? 0.6 : 1 }}
              >
                {isSubmitting ? 'Creating…' : 'Create team'}
              </button>
              <p style={s.helper}>You'll be the workspace owner. Invite teammates next.</p>
            </>
          ) : (
            <>
              <label style={s.label}>Team ID</label>
              <div style={s.inputWrap}>
                <Icon name="log-in" size={16} color={T.textFaint} />
                <input
                  ref={inputRef} type="text" value={joinTeamId}
                  onChange={e => setJoinTeamId(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && joinTeamId.trim()) handleJoin(); }}
                  placeholder="Paste team ID here"
                  style={s.input} disabled={isSubmitting}
                  onFocus={e => { const w = e.currentTarget.parentElement; if (w) { w.style.borderColor = T.accent; w.style.boxShadow = '0 0 0 3px rgba(107,76,230,.15)'; } }}
                  onBlur={e => { const w = e.currentTarget.parentElement; if (w) { w.style.borderColor = T.borderCard; w.style.boxShadow = 'none'; } }}
                />
              </div>
              {error && <div style={s.error}>{error}</div>}
              <button
                onClick={handleJoin} disabled={!joinTeamId.trim() || isSubmitting}
                style={{ ...s.primaryBtn, opacity: (!joinTeamId.trim() || isSubmitting) ? 0.6 : 1 }}
              >
                {isSubmitting ? 'Joining…' : 'Join team'}
              </button>
              <p style={s.helper}>Ask your workspace admin for the team ID if you don't have it.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 700, overflow: 'hidden',
    fontFamily: T.font, color: T.textPrimary,
  },

  // dimmed app skeleton
  skeleton: { position: 'absolute', inset: 0, background: T.bgSecondary, display: 'flex' },
  skeletonRail: { width: 236, background: '#F3F3F7', borderRight: `1px solid ${T.border}`, flexShrink: 0 },
  skeletonMain: { flex: 1, padding: '28px 32px' },
  skeletonTitle: { height: 22, width: 160, background: '#ECECF2', borderRadius: 6, marginBottom: 24 },
  skeletonRow: { height: 44, background: T.graySoft, borderRadius: 10, marginBottom: 10 },
  scrim: { position: 'absolute', inset: 0, background: T.scrim },

  // modal
  modal: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    width: 460, maxWidth: '90vw', background: '#fff', borderRadius: 18,
    boxShadow: T.shadowModal, padding: '30px 32px', boxSizing: 'border-box',
    transition: 'opacity 0.16s ease, transform 0.16s ease',
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16, width: 28, height: 28,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8, padding: 0,
  },

  head: { textAlign: 'center' },
  tile: {
    width: 48, height: 48, borderRadius: 14, background: T.accentGradient,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px', boxShadow: T.shadowHeroGlow,
  },
  title: { fontSize: 19, fontWeight: 700, letterSpacing: '-0.015em', margin: '0 0 6px', color: T.textPrimary },
  subtitle: { fontSize: 13.5, lineHeight: 1.55, color: T.textMuted, margin: '0 12px' },

  // segmented tabs
  segTrack: {
    display: 'flex', gap: 2, margin: '22px 0 0', background: T.graySoft,
    borderRadius: 10, padding: 3,
  },
  seg: {
    flex: 1, textAlign: 'center', padding: '8px', fontFamily: T.font, fontSize: 13,
    fontWeight: 600, color: T.textMuted, background: 'transparent', border: 'none',
    borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s ease',
  },
  segActive: {
    background: '#fff', color: T.textPrimary,
    boxShadow: '0 1px 2px rgba(20,20,40,.08)',
  },

  formArea: { paddingTop: 20 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 7 },
  inputWrap: {
    display: 'flex', alignItems: 'center', gap: 9, border: `1px solid ${T.borderCard}`,
    borderRadius: 9, padding: '0 12px', height: 40, marginBottom: 18,
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease', background: '#fff',
  },
  input: {
    flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
    fontFamily: T.font, fontSize: 14, color: T.textPrimary, height: '100%', padding: 0,
  },
  error: {
    padding: '9px 12px', background: T.redSoft, color: T.red, fontSize: 12.5,
    borderRadius: 8, marginBottom: 14, marginTop: -4,
  },
  primaryBtn: {
    width: '100%', padding: '12px', border: 'none', background: T.accent, color: '#fff',
    borderRadius: 9, fontFamily: T.font, fontSize: 14, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(107,76,230,.35)', transition: 'opacity 0.15s ease',
  },
  helper: { fontSize: 12, color: T.textFaint, textAlign: 'center', margin: '14px 0 0' },
};
