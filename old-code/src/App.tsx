/**
 * Things-like Task Manager — App Shell
 *
 * Team gating: anonymous → sign in, no teams → onboarding, has teams → app
 *
 * Teams are workspace:default collections managed via useTeams().
 *
 * Platform wiring (auth shells, RecordProvider, DeepSpacePill,
 * MobileHeader) lives in main.tsx (synced from template).
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useUser, useTeams } from '@spaces/sdk/storage'

// Page
import HomePage from './pages/HomePage'

// Components
import TeamOnboarding from './components/TeamOnboarding'

// ── Team types (mirroring SDK) ────────────────────
interface TeamMember {
  userId: string
  roleInTeam: string
  joinedAt: string
}

interface Team {
  id: string
  name: string
  createdBy: string
  createdAt: string
  isOpen?: boolean
  members?: TeamMember[]
}

// ============================================================================
// Loading overlay — covers everything until content is ready to display.
// ============================================================================

function LoadingOverlay({ visible }: { visible: boolean }) {
  const [mounted, setMounted] = useState(true)

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(t)
    }
    setMounted(true)
  }, [visible])

  if (!mounted) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F5F5F7',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.25s ease-out',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 32, height: 32,
          border: '2px solid #E5E5EA', borderTopColor: '#007AFF',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px',
        }} />
        <div style={{ color: '#8E8E93', fontSize: 14 }}>Loading…</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ============================================================================
// App — team gating + loading overlay
// ============================================================================

export default function App() {
  const [ready, setReady] = useState(false)
  const handleReady = useCallback(() => setReady(true), [])

  return (
    <>
      <LoadingOverlay visible={!ready} />
      <AppRouter onReady={handleReady} />
    </>
  )
}

function AppRouter({ onReady }: { onReady: () => void }) {
  const { user: platformUser, isLoading: userLoading } = useUser()
  const { teams: rawTeams, loading: teamsLoading, create, addMember, removeMember, cancelInvite, deleteTeam } = useTeams()
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const pendingSelectRef = useRef<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Defensive: teams may be undefined/null during initialization
  const teams = Array.isArray(rawTeams) ? rawTeams : []

  // Teams are settled when the SDK has received data from the server
  // (not just "loading with empty array"). This replaces the old 600ms timer.
  const teamsSettled = !teamsLoading

  // Auto-select first team when teams load (respects intentional selections)
  useEffect(() => {
    if (teams.length > 0) {
      if (pendingSelectRef.current) {
        if (teams.some(t => t.id === pendingSelectRef.current)) {
          setSelectedTeamId(pendingSelectRef.current)
          pendingSelectRef.current = null
        }
        return
      }
      if (!selectedTeamId || !teams.some(t => t.id === selectedTeamId)) {
        setSelectedTeamId(teams[0].id)
      }
    }
  }, [teams, selectedTeamId])

  // Signal readiness once all data is resolved enough to show meaningful content.
  useEffect(() => {
    if (isReady) return
    if (userLoading) return
    if (!platformUser) { setIsReady(true); onReady(); return }
    if (teamsSettled && teams.length === 0) { setIsReady(true); onReady(); return }
    if (selectedTeamId) { setIsReady(true); return }
  }, [isReady, userLoading, platformUser, teams.length, selectedTeamId, teamsSettled, onReady])

  // While loading, render nothing — the overlay handles the loading UI
  if (!isReady) return null

  // Anonymous user — prompt to sign in
  if (!platformUser) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - var(--mobile-header-height, 0px))',
        marginTop: 'var(--mobile-header-height, 0px)',
        background: '#F5F5F7',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      }}>
        <div style={{
          textAlign: 'center', padding: 32,
          background: '#fff', borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          maxWidth: 360,
        }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#1D1D1F' }}>
            Sign in to continue
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: '#8E8E93', lineHeight: 1.5 }}>
            Sign in to access your team's tasks, projects, and more.
          </p>
        </div>
      </div>
    )
  }

  // Authenticated but no teams — show onboarding
  if (teams.length === 0) {
    return (
      <TeamOnboarding
        onCreate={create}
        onJoin={addMember}
        userId={platformUser.id}
      />
    )
  }

  if (!selectedTeamId) return null

  return (
    <>
      <HomePage
        teamId={selectedTeamId}
        teams={teams}
        onSelectTeam={setSelectedTeamId}
        onAddMember={addMember}
        onRemoveMember={removeMember}
        onCancelInvite={cancelInvite}
        onReady={onReady}
        onDeleteTeam={(teamId) => {
          deleteTeam(teamId);
          if (teamId === selectedTeamId) {
            const remaining = teams.filter(t => t.id !== teamId);
            setSelectedTeamId(remaining.length > 0 ? remaining[0].id : null);
          }
        }}
        onCreateTeam={() => setShowCreateModal(true)}
        onJoinTeam={() => setShowJoinModal(true)}
      />

      {/* Create Team Modal */}
      {showCreateModal && (
        <TeamOnboarding
          onCreate={(name, options) => {
            const teamId = create(name, options);
            setShowCreateModal(false);
            pendingSelectRef.current = teamId;
            setSelectedTeamId(teamId);
            return teamId;
          }}
          onJoin={addMember}
          userId={platformUser!.id}
          mode="create"
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Join Team Modal */}
      {showJoinModal && (
        <TeamOnboarding
          onCreate={create}
          onJoin={(teamId, userId) => {
            addMember(teamId, userId);
            setShowJoinModal(false);
            pendingSelectRef.current = teamId;
            setSelectedTeamId(teamId);
          }}
          userId={platformUser!.id}
          mode="join"
          onClose={() => setShowJoinModal(false)}
        />
      )}
    </>
  )
}
