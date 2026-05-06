import type { ActionHandler } from 'deepspace/worker'

type Envelope = { recordId: string; data: Record<string, unknown> }

/** Look up the caller's team_members record for a given team. */
async function getCallerMembership(
  tools: Parameters<ActionHandler>[0]['tools'],
  userId: string,
  teamId: string,
): Promise<Envelope | null> {
  const res = await tools.query('team_members', { where: { TeamId: teamId, UserId: userId } })
  if (!res.success) return null
  const records = (res.data as { records: Envelope[] }).records
  return records[0] ?? null
}

export const actions: Record<string, ActionHandler> = {

  /**
   * Remove a team member.
   * Caller must have roleInTeam === 'admin' for the same team.
   */
  removeMember: async ({ userId, params, tools }) => {
    const { memberId } = params as { memberId: string }

    const memberRes = await tools.get('team_members', memberId)
    if (!memberRes.success) return { success: false, error: 'Member not found' }
    const member = (memberRes.data as { record: Envelope }).record
    const teamId = member.data.TeamId as string

    const callerMembership = await getCallerMembership(tools, userId, teamId)
    if (!callerMembership || callerMembership.data.RoleInTeam !== 'admin') {
      return { success: false, error: 'Forbidden: only team admins can remove members' }
    }

    return tools.remove('team_members', memberId)
  },

  /**
   * Change a team member's role.
   * Caller must have roleInTeam === 'admin' for the same team.
   */
  changeMemberRole: async ({ userId, params, tools }) => {
    const { memberId, role } = params as { memberId: string; role: string }

    if (role !== 'admin' && role !== 'member') {
      return { success: false, error: 'Invalid role' }
    }

    const memberRes = await tools.get('team_members', memberId)
    if (!memberRes.success) return { success: false, error: 'Member not found' }
    const member = (memberRes.data as { record: Envelope }).record
    const teamId = member.data.TeamId as string

    const callerMembership = await getCallerMembership(tools, userId, teamId)
    if (!callerMembership || callerMembership.data.RoleInTeam !== 'admin') {
      return { success: false, error: 'Forbidden: only team admins can change roles' }
    }

    return tools.update('team_members', memberId, { ...member.data, RoleInTeam: role })
  },

  /**
   * Claim a pending invite for the caller's own email.
   * Removes the 'invited' team_members record so no duplicate exists.
   */
  claimInvite: async ({ userId, params, tools }) => {
    const { inviteId, teamId } = params as { inviteId: string; teamId: string }

    const inviteRes = await tools.get('team_members', inviteId)
    if (!inviteRes.success) return { success: false, error: 'Invite not found' }
    const invite = (inviteRes.data as { record: Envelope }).record

    if (invite.data.TeamId !== teamId) return { success: false, error: 'Team mismatch' }
    if (invite.data.Status !== 'invited') return { success: false, error: 'Not a pending invite' }

    // Confirm the caller actually joined this team (has an active record)
    const activeRes = await tools.query('team_members', { where: { TeamId: teamId, UserId: userId } })
    if (!activeRes.success || (activeRes.data as { records: Envelope[] }).records.length === 0) {
      return { success: false, error: 'No active membership found' }
    }

    return tools.remove('team_members', inviteId)
  },

  /**
   * Delete a team entirely.
   * Caller must be the team creator AND have roleInTeam === 'admin'.
   */
  deleteTeam: async ({ userId, params, tools }) => {
    const { teamId } = params as { teamId: string }

    const teamRes = await tools.get('teams', teamId)
    if (!teamRes.success) return { success: false, error: 'Team not found' }
    const team = (teamRes.data as { record: Envelope }).record

    if (team.data.CreatedBy !== userId) {
      return { success: false, error: 'Forbidden: only the team creator can delete the team' }
    }

    const callerMembership = await getCallerMembership(tools, userId, teamId)
    if (!callerMembership || callerMembership.data.RoleInTeam !== 'admin') {
      return { success: false, error: 'Forbidden: only team admins can delete the team' }
    }

    // Delete all team_members for this team
    const membersRes = await tools.query('team_members', { where: { TeamId: teamId } })
    if (membersRes.success) {
      for (const m of (membersRes.data as { records: Envelope[] }).records) {
        await tools.remove('team_members', m.recordId)
      }
    }

    return tools.remove('teams', teamId)
  },
}
