/**
 * TeamSelector — compact dropdown in the sidebar for switching between teams.
 * Adapted from original widget's TeamSelector.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '../utils/icons';
import { Team } from '../constants';

interface TeamSelectorProps {
  teams: Team[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  onCreateTeam: () => void;
  onJoinTeam: () => void;
  onOpenSettings: () => void;
}

export function TeamSelector({ teams, selectedTeamId, onSelectTeam, onCreateTeam, onJoinTeam, onOpenSettings }: TeamSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleSelect = useCallback((teamId: string) => {
    onSelectTeam(teamId);
    setIsOpen(false);
  }, [onSelectTeam]);

  if (teams.length === 0) return null;

  const hasMultipleTeams = teams.length > 1;

  return (
    <div ref={containerRef} style={s.container}>
      <button onClick={() => setIsOpen(prev => !prev)} style={s.trigger}>
        <Icon name="users" size={13} color="#8E8E93" />
        <span style={s.triggerLabel}>{selectedTeam?.name || 'Select team'}</span>
        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={12} color="#8E8E93" />
      </button>

      <button
        onClick={e => { e.stopPropagation(); setIsOpen(false); onOpenSettings(); }}
        style={s.settingsBtn} title="Team Settings"
      >
        <Icon name="settings" size={13} color="#8E8E93" />
      </button>

      {isOpen && (
        <div style={s.dropdown}>
          {hasMultipleTeams && teams.map(team => {
            const isActive = team.id === selectedTeamId;
            return (
              <button key={team.id} onClick={() => handleSelect(team.id)} style={{ ...s.option, ...(isActive ? s.optionActive : {}) }}>
                <div style={s.optionInfo}>
                  <span style={{ ...s.optionName, ...(isActive ? { color: '#007AFF', fontWeight: 600 } : {}) }}>
                    {team.name}
                  </span>
                </div>
                {isActive && <Icon name="check" size={14} color="#007AFF" />}
              </button>
            );
          })}
          {hasMultipleTeams && <div style={s.divider} />}

          <button onClick={() => { setIsOpen(false); onCreateTeam(); }} style={s.actionOption}>
            <Icon name="plus-circle" size={14} color="#007AFF" />
            <span>Create New Team</span>
          </button>
          <button onClick={() => { setIsOpen(false); onJoinTeam(); }} style={s.actionOption}>
            <Icon name="log-in" size={14} color="#34C759" />
            <span>Join Another Team</span>
          </button>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { position: 'relative', margin: '0 12px 4px', display: 'flex', gap: 4 },
  trigger: {
    display: 'flex', alignItems: 'center', gap: 6, flex: 1,
    padding: '6px 8px', border: '1px solid #E5E5EA', borderRadius: 8,
    background: '#F9FAFB', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: '#3C3C43',
  },
  settingsBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, padding: 0, border: '1px solid #E5E5EA',
    borderRadius: 6, background: '#F9FAFB', cursor: 'pointer',
  },
  triggerLabel: { flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, fontWeight: 500 },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
    background: '#fff', border: '1px solid #E5E5EA', borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, padding: 4, maxHeight: 300, overflow: 'auto',
  },
  option: {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '8px 10px', border: 'none', background: 'transparent',
    borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  },
  optionActive: { backgroundColor: 'rgba(0, 122, 255, 0.06)' },
  optionInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 },
  optionName: { fontSize: 13, fontWeight: 500, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  divider: { height: 1, backgroundColor: '#E5E5EA', margin: '4px 0' },
  actionOption: {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '8px 10px', border: 'none', background: 'transparent',
    borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
    color: '#1D1D1F', textAlign: 'left',
  },
};
