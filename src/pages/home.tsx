/**
 * HomePage — outer/app-scope component.
 *
 * Owns app-scope state (active team, team management). When a team is selected,
 * wraps the workspace in a per-team <RecordScope> so task/project/tag data and
 * presence are isolated to that team's Durable Object room.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useUser, useUsers, useQuery, useMutations, RecordScope } from 'deepspace';

import { TeamOnboarding } from '../components/TeamOnboarding';
import TeamWorkspace from '../components/TeamWorkspace';

import { useBodyBackground, useIsMobile } from '../hooks';
import { callAction } from '../utils/callAction';

import { APP_NAME } from '../constants';
import { teamSchemas } from '../schemas';
import {
  WidgetUser,
  Team,
  TeamMember,
  TeamRecord,
  TeamMemberRecord,
  getUserColor,
} from '../constants';

export default function HomePage() {
  useBodyBackground('#ffffff');

  const { user: platformUser, isLoading: userLoading } = useUser();
  const { users: roomUsers } = useUsers();

  const currentUser: WidgetUser | null = useMemo(() => {
    if (!platformUser) return null;
    const userId = platformUser.id || '';
    return {
      id: userId,
      name: platformUser.name || 'Unknown',
      email: platformUser.email || '',
      imageUrl: platformUser.imageUrl || '',
      color: getUserColor(userId),
      role: platformUser.role || 'member',
    };
  }, [platformUser]);

  const allUsers: WidgetUser[] = useMemo(() => {
    if (!roomUsers || roomUsers.length === 0) return currentUser ? [currentUser] : [];
    return roomUsers.map((u: any) => ({
      id: u.id,
      name: u.name || 'Unknown',
      email: u.email || '',
      imageUrl: u.imageUrl || '',
      color: getUserColor(u.id),
      role: u.role || 'member',
    }));
  }, [roomUsers, currentUser]);

  // ── Team state ───────────────────────────────────────────────────────────
  const [activeTeamId, setActiveTeamId] = useState<string | null>(() =>
    localStorage.getItem('taskspace_activeTeamId')
  );

  const { records: myMembershipRecords, status: membershipStatus } = useQuery<TeamMemberRecord>(
    'team_members',
    currentUser ? { where: { UserId: currentUser.id } } : {}
  );

  const { records: teamRecords, status: teamStatus } = useQuery<TeamRecord>('teams');

  const { records: activeTeamMemberRecords } = useQuery<TeamMemberRecord>(
    'team_members',
    activeTeamId ? { where: { TeamId: activeTeamId } } : {}
  );

  const { create: createTeam } = useMutations<TeamRecord>('teams');
  const { create: createTeamMember } = useMutations<TeamMemberRecord>('team_members');

  const myTeams: Team[] = useMemo(() =>
    (teamRecords || []).map(r => ({
      id: r.recordId,
      name: r.data.Name || 'Untitled team',
      createdBy: r.data.CreatedBy || '',
      isOpen: !!r.data.IsOpen,
    })),
    [teamRecords]
  );

  const activeTeam = useMemo(() => myTeams.find(t => t.id === activeTeamId) || null, [myTeams, activeTeamId]);

  // Note: the server omits empty-string columns from record payloads (e.g. an
  // invited-but-not-yet-signed-in member has no UserId), so default them here.
  const activeTeamMembers: TeamMember[] = useMemo(() =>
    (activeTeamMemberRecords || []).map(r => ({
      id: r.recordId,
      teamId: r.data.TeamId,
      userId: r.data.UserId || '',
      roleInTeam: r.data.RoleInTeam,
      joinedAt: r.data.JoinedAt,
      email: r.data.Email || '',
      status: r.data.Status,
      isPending: r.data.Status === 'invited',
    })),
    [activeTeamMemberRecords]
  );

  // Sync activeTeamId: if it's not in myTeams, fall back to first team
  useEffect(() => {
    if (membershipStatus === 'loading' || teamStatus === 'loading' || !currentUser) return;
    if (myTeams.length === 0) {
      setActiveTeamId(null);
      localStorage.removeItem('taskspace_activeTeamId');
      return;
    }
    if (!activeTeamId || !myTeams.find(t => t.id === activeTeamId)) {
      const first = myTeams[0].id;
      setActiveTeamId(first);
      localStorage.setItem('taskspace_activeTeamId', first);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTeams, currentUser, membershipStatus, teamStatus]);

  const handleSelectTeam = useCallback((teamId: string) => {
    setActiveTeamId(teamId);
    localStorage.setItem('taskspace_activeTeamId', teamId);
  }, []);

  const handleCreateTeam = useCallback(async (name: string): Promise<string | null> => {
    if (!currentUser) return null;
    try {
      const teamId = await createTeam({ Name: name, CreatedBy: currentUser.id, IsOpen: 1 });
      await createTeamMember({
        TeamId: teamId, UserId: currentUser.id, RoleInTeam: 'admin',
        JoinedAt: Date.now(), Email: currentUser.email, Status: 'active',
      });
      setActiveTeamId(teamId);
      localStorage.setItem('taskspace_activeTeamId', teamId);
      return teamId;
    } catch (err) {
      console.error('[team] create failed:', err);
      return null;
    }
  }, [currentUser, createTeam, createTeamMember]);

  const handleJoinTeam = useCallback(async (teamId: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const already = myMembershipRecords?.find(r => r.data.TeamId === teamId && r.data.UserId === currentUser.id);
      if (already) { handleSelectTeam(teamId); return true; }
      await createTeamMember({
        TeamId: teamId, UserId: currentUser.id, RoleInTeam: 'member',
        JoinedAt: Date.now(), Email: currentUser.email, Status: 'active',
      });
      setActiveTeamId(teamId);
      localStorage.setItem('taskspace_activeTeamId', teamId);
      return true;
    } catch (err) {
      console.error('[team] join failed:', err);
      return false;
    }
  }, [currentUser, createTeamMember, myMembershipRecords, handleSelectTeam]);

  const handleAddMember = useCallback(async (email: string): Promise<{ status: 'added' | 'invited' | 'already_member' | 'error'; teamId?: string }> => {
    if (!activeTeamId) return { status: 'error' };
    const existingRecord = (activeTeamMemberRecords || []).find(r => r.data.Email === email);
    if (existingRecord) return { status: 'already_member' };
    // Server action lookup so we can resolve users we don't share a team with yet.
    const lookup = await callAction('lookupUserByEmail', { email });
    const targetUser = lookup.success ? (lookup.data as { id: string; email: string; name: string } | null) : null;
    const isExistingUser = !!targetUser;
    try {
      await createTeamMember({
        TeamId: activeTeamId,
        UserId: targetUser?.id || '',
        RoleInTeam: 'member',
        JoinedAt: Date.now(),
        Email: email,
        Status: isExistingUser ? 'active' : 'invited',
      });
      return { status: isExistingUser ? 'added' : 'invited' };
    } catch {
      return { status: 'error' };
    }
  }, [activeTeamId, activeTeamMemberRecords, createTeamMember]);

  const handleChangeRole = useCallback(async (memberId: string, role: 'admin' | 'member') => {
    const result = await callAction('changeMemberRole', { memberId, role });
    if (!result.success) console.error('[team] change role failed:', result.error);
  }, []);

  const handleDeleteTeam = useCallback(async () => {
    if (!activeTeamId) return;
    const result = await callAction('deleteTeam', { teamId: activeTeamId });
    if (!result.success) { console.error('[team] delete failed:', result.error); return; }
    const next = myTeams.find(t => t.id !== activeTeamId);
    const nextId = next?.id || null;
    setActiveTeamId(nextId);
    if (nextId) localStorage.setItem('taskspace_activeTeamId', nextId);
    else localStorage.removeItem('taskspace_activeTeamId');
  }, [activeTeamId, myTeams]);

  const [teamOnboardingMode, setTeamOnboardingMode] = useState<null | 'create' | 'join'>(null);

  const isMobile = useIsMobile();
  const isReadOnly = !platformUser || platformUser.role === 'viewer';
  const teamDataLoading = membershipStatus === 'loading' || teamStatus === 'loading';

  if (userLoading || teamDataLoading) return null;

  // No teams yet → onboarding gate
  if (currentUser && myTeams.length === 0) {
    return <TeamOnboarding onCreate={handleCreateTeam} onJoin={handleJoinTeam} />;
  }

  if (!currentUser || !activeTeamId || !activeTeam) return null;

  return (
    <>
      <RecordScope
        roomId={`team:${activeTeamId}`}
        schemas={teamSchemas}
        appId={APP_NAME}
      >
        <TeamWorkspace
          activeTeamId={activeTeamId}
          activeTeam={activeTeam}
          currentUser={currentUser}
          allUsers={allUsers}
          activeTeamMembers={activeTeamMembers}
          myTeams={myTeams}
          isMobile={isMobile}
          isReadOnly={isReadOnly}
          onAddMember={handleAddMember}
          onChangeRole={handleChangeRole}
          onDeleteTeam={handleDeleteTeam}
          onSelectTeam={handleSelectTeam}
          onOpenCreateTeam={() => setTeamOnboardingMode('create')}
          onOpenJoinTeam={() => setTeamOnboardingMode('join')}
        />
      </RecordScope>

      {teamOnboardingMode && (
        <TeamOnboarding
          mode={teamOnboardingMode}
          onCreate={handleCreateTeam}
          onJoin={handleJoinTeam}
          onClose={() => setTeamOnboardingMode(null)}
        />
      )}
    </>
  );
}
