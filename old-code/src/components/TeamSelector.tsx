/**
 * TeamSelector — compact dropdown for switching between teams.
 * Shown in the sidebar when the user belongs to multiple teams.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '../utils/icons';

interface TeamMember {
  userId: string;
  roleInTeam: string;
  joinedAt: string;
}

interface Team {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  isOpen?: boolean;
  members?: TeamMember[];
}

interface TeamSelectorProps {
  teams: Team[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  onCreateTeam: () => void;
  onJoinTeam: () => void;
  onOpenSettings: () => void;
}

export default function TeamSelector({ teams, selectedTeamId, onSelectTeam, onCreateTeam, onJoinTeam, onOpenSettings }: TeamSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  // Close dropdown on outside click
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

  // Don't render if no teams at all
  if (teams.length === 0) return null;

  const hasMultipleTeams = teams.length > 1;

  return (
    <div ref={containerRef} style={tsStyles.container}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        style={tsStyles.trigger}
      >
        <Icon name="users" size={13} color="#8E8E93" />
        <span style={tsStyles.triggerLabel}>
          {selectedTeam?.name || 'Select team'}
        </span>
        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={12} color="#8E8E93" />
      </button>

      {/* Settings button next to trigger */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
          onOpenSettings();
        }}
        style={tsStyles.settingsBtn}
        title="Team Settings"
      >
        <Icon name="settings" size={13} color="#8E8E93" />
      </button>

      {isOpen && (
        <div style={tsStyles.dropdown}>
          {/* Team list — show when multiple teams for switching */}
          {hasMultipleTeams && teams.map(team => {
            const isActive = team.id === selectedTeamId;
            const memberCount = team.members?.length || 0;

            return (
              <button
                key={team.id}
                onClick={() => handleSelect(team.id)}
                style={{
                  ...tsStyles.option,
                  ...(isActive ? tsStyles.optionActive : {}),
                }}
              >
                <div style={tsStyles.optionInfo}>
                  <span style={{
                    ...tsStyles.optionName,
                    ...(isActive ? { color: '#007AFF', fontWeight: 600 } : {}),
                  }}>
                    {team.name}
                  </span>
                  {memberCount > 0 && (
                    <span style={tsStyles.optionMeta}>
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {isActive && (
                  <Icon name="check" size={14} color="#007AFF" />
                )}
              </button>
            );
          })}

          {/* Divider — only if team list is shown above */}
          {hasMultipleTeams && (
            <div style={tsStyles.divider} />
          )}

          {/* Create New Team */}
          <button
            onClick={() => {
              setIsOpen(false);
              onCreateTeam();
            }}
            style={tsStyles.actionOption}
          >
            <Icon name="plus-circle" size={14} color="#007AFF" />
            <span>Create New Team</span>
          </button>

          {/* Join Another Team */}
          <button
            onClick={() => {
              setIsOpen(false);
              onJoinTeam();
            }}
            style={tsStyles.actionOption}
          >
            <Icon name="log-in" size={14} color="#34C759" />
            <span>Join Another Team</span>
          </button>
        </div>
      )}
    </div>
  );
}

const tsStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    margin: '0 12px 4px',
    display: 'flex',
    gap: 4,
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    padding: '6px 8px',
    border: '1px solid #E5E5EA',
    borderRadius: 8,
    background: '#F9FAFB',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 12,
    color: '#3C3C43',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
  },
  settingsBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    padding: 0,
    border: '1px solid #E5E5EA',
    borderRadius: 6,
    background: '#F9FAFB',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
  },
  triggerLabel: {
    flex: 1,
    textAlign: 'left',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    fontWeight: 500,
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #E5E5EA',
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    zIndex: 100,
    padding: 4,
    maxHeight: 300,
    overflow: 'auto',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 10px',
    border: 'none',
    background: 'transparent',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
  },
  optionActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.06)',
  },
  optionInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 0,
  },
  optionName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#1D1D1F',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  optionMeta: {
    fontSize: 11,
    color: '#8E8E93',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    margin: '4px 0',
  },
  actionOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 10px',
    border: 'none',
    background: 'transparent',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 500,
    color: '#1D1D1F',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
  },
};

