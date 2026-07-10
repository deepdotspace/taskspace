import type { ActionHandler } from 'deepspace/worker'

type Envelope = { recordId: string; data: Record<string, unknown> }

/** Tools as provided by worker.ts — includes the team-room escape hatch. */
type Tools = Parameters<ActionHandler>[0]['tools'] & {
  forRoom?: (roomId: string) => Parameters<ActionHandler>[0]['tools']
}

/**
 * Ensure a membership MIRROR exists in the team's own room. Per-room RBAC
 * ('team'-level reads on tasks/projects/tags) resolves memberships from the
 * ROOM'S OWN team_members table — memberships written only to the app room
 * leave non-creator members unable to read any team data.
 * Returns true when a mirror was created (i.e. permissions changed).
 */
async function ensureTeamRoomMirror(
  tools: Tools,
  teamId: string,
  member: { UserId: string; RoleInTeam: string; JoinedAt: number; Email: string },
): Promise<boolean> {
  const roomTools = tools.forRoom?.(`team:${teamId}`)
  if (!roomTools) return false
  const existing = await roomTools.query('team_members', {
    where: { TeamId: teamId, UserId: member.UserId },
  })
  if (existing.success && (existing.data as { records: Envelope[] }).records.length > 0) return false
  const res = await roomTools.create('team_members', {
    TeamId: teamId,
    UserId: member.UserId,
    RoleInTeam: member.RoleInTeam,
    JoinedAt: member.JoinedAt,
    Email: member.Email,
    Status: 'active',
  })
  return res.success
}

/** Remove a user's membership mirror from the team room (revokes reads). */
async function removeTeamRoomMirror(tools: Tools, teamId: string, userId: string): Promise<void> {
  const roomTools = tools.forRoom?.(`team:${teamId}`)
  if (!roomTools || !userId) return
  const res = await roomTools.query('team_members', { where: { TeamId: teamId, UserId: userId } })
  if (!res.success) return
  for (const r of (res.data as { records: Envelope[] }).records) {
    await roomTools.remove('team_members', r.recordId)
  }
}

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

/**
 * The caller's verified profile (email/name/image). The platform validates
 * the JWT before invoking an action (`userId` is its subject), so decoding
 * the payload here is safe as long as `sub` matches. Email falls back to the
 * users directory row. NEVER trust a client-supplied email for invite
 * claiming — that would let anyone claim someone else's invite.
 */
async function getVerifiedProfile(
  tools: Parameters<ActionHandler>[0]['tools'],
  userId: string,
  callerJwt: string,
): Promise<{ email: string; name: string; image: string }> {
  let email = ''
  let name = ''
  let image = ''
  try {
    const part = callerJwt.split('.')[1]
    if (part) {
      const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
      const claims = JSON.parse(json) as { sub?: string; email?: string; name?: string; image?: string }
      if (claims.sub === userId) {
        email = (claims.email || '').toLowerCase()
        name = claims.name || ''
        image = claims.image || ''
      }
    }
  } catch { /* fall through to directory lookup */ }
  if (!email) {
    const res = await tools.get('users', userId)
    if (res.success) {
      const record = (res.data as { record?: Envelope }).record
      const dirEmail = record?.data?.email
      if (typeof dirEmail === 'string' && dirEmail) email = dirEmail.toLowerCase()
    }
  }
  return { email, name, image }
}

async function getVerifiedEmail(
  tools: Parameters<ActionHandler>[0]['tools'],
  userId: string,
  callerJwt: string,
): Promise<string> {
  return (await getVerifiedProfile(tools, userId, callerJwt)).email
}

/** Claim one pending invite in place: the record id survives, so tasks that
 *  were assigned to the pending member (they point at this record id) can be
 *  migrated to the real user by the client afterwards. */
async function claimInviteInPlace(
  tools: Parameters<ActionHandler>[0]['tools'],
  invite: Envelope,
  userId: string,
): Promise<boolean> {
  const res = await tools.update('team_members', invite.recordId, {
    ...invite.data,
    UserId: userId,
    Status: 'active',
    JoinedAt: Date.now(),
  })
  return res.success
}

export const actions: Record<string, ActionHandler> = {

  /**
   * Look up a user by email. Runs as the app, bypassing user RBAC, so the
   * inviter can locate users they don't yet share a team with.
   * Returns { id, email, name } or null if not found.
   */
  lookupUserByEmail: async ({ params, tools }) => {
    const email = ((params as { email: string }).email || '').trim().toLowerCase()
    if (!email) return { success: false, error: 'Missing email' }
    const res = await tools.query('users', { where: { email } })
    if (!res.success) return { success: false, error: 'Lookup failed' }
    const records = (res.data as { records: Envelope[] }).records
    const user = records[0]
    if (!user) return { success: true, data: null }
    return {
      success: true,
      data: {
        id: user.recordId,
        email: user.data.email as string,
        name: (user.data.name as string) || '',
      },
    }
  },

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

    // Revoke the removed member's team-room mirror (their read access).
    await removeTeamRoomMirror(tools as Tools, teamId, member.data.UserId as string)

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
   * Claim ALL pending invites matching the caller's verified email.
   * Runs at sign-in so invited users auto-join their teams without pasting a
   * team ID. Invites are claimed IN PLACE (UserId + Status updated on the
   * existing record) so tasks assigned to the pending member — which point at
   * the invite's record id — can be migrated client-side.
   * Returns { claimed } — the number of memberships that changed.
   */
  claimMyInvites: async ({ userId, tools, callerJwt }) => {
    const profile = await getVerifiedProfile(tools, userId, callerJwt)
    const email = profile.email

    // Backfill the caller's user-directory row from the verified JWT. The
    // connect-time registration only persists profile claims present in the
    // room token — empty for non-OAuth accounts — which leaves ghost rows
    // ("Anonymous", no email) that break lookupUserByEmail and invite
    // resolution. registerUser bypasses the system-managed column stripping.
    if (email || profile.name) {
      try {
        await tools.registerUser({
          userId,
          ...(profile.name ? { name: profile.name } : {}),
          ...(email ? { email } : {}),
          ...(profile.image ? { imageUrl: profile.image } : {}),
        })
      } catch { /* directory backfill is best-effort */ }
    }

    if (!email) return { success: true, data: { claimed: 0 } }

    // Match invites case-insensitively (covers legacy rows saved with the
    // inviter's original casing).
    const res = await tools.query('team_members', { where: { Status: 'invited' } })
    if (!res.success) return { success: false, error: 'Invite lookup failed' }
    const invites = (res.data as { records: Envelope[] }).records
      .filter(r => typeof r.data.Email === 'string' && (r.data.Email as string).toLowerCase() === email)

    let claimed = 0
    const teamIds: string[] = []
    for (const invite of invites) {
      const teamId = invite.data.TeamId as string
      const existing = await getCallerMembership(tools, userId, teamId)
      if (existing) {
        // Already an active member (e.g. joined manually) — drop the ghost invite.
        await tools.remove('team_members', invite.recordId)
        continue
      }
      if (await claimInviteInPlace(tools, invite, userId)) {
        claimed++
        teamIds.push(teamId)
      }
    }

    // Ensure every active membership has its team-room mirror (grants the
    // 'team'-level reads inside each team's own room). Covers just-claimed
    // invites, members added directly by email, and legacy memberships that
    // predate mirroring.
    let mirrored = 0
    const mineRes = await tools.query('team_members', { where: { UserId: userId, Status: 'active' } })
    if (mineRes.success) {
      for (const m of (mineRes.data as { records: Envelope[] }).records) {
        const created = await ensureTeamRoomMirror(tools as Tools, m.data.TeamId as string, {
          UserId: userId,
          RoleInTeam: (m.data.RoleInTeam as string) || 'member',
          JoinedAt: (m.data.JoinedAt as number) || Date.now(),
          Email: (m.data.Email as string) || email,
        })
        if (created) mirrored++
      }
    }

    return { success: true, data: { claimed: claimed + mirrored, claimedInvites: claimed, mirrored, teamIds } }
  },

  /**
   * Join a team by ID — atomic server-side join that claims a pending invite
   * for the caller's email when one exists (instead of creating a duplicate
   * membership record). Fresh joins require the team to be open.
   * Returns { status: 'joined' | 'claimed' | 'already' }.
   */
  joinTeam: async ({ userId, params, tools, callerJwt }) => {
    const { teamId } = params as { teamId: string }
    if (!teamId) return { success: false, error: 'Missing teamId' }

    const teamRes = await tools.get('teams', teamId)
    if (!teamRes.success) return { success: false, error: 'Team not found' }
    const team = (teamRes.data as { record: Envelope }).record

    const existing = await getCallerMembership(tools, userId, teamId)
    if (existing) return { success: true, data: { status: 'already' } }

    const email = await getVerifiedEmail(tools, userId, callerJwt)

    // Pending invite for my email in this team → claim it in place.
    if (email) {
      const invRes = await tools.query('team_members', {
        where: { TeamId: teamId, Status: 'invited' },
      })
      if (invRes.success) {
        const invite = (invRes.data as { records: Envelope[] }).records
          .find(r => typeof r.data.Email === 'string' && (r.data.Email as string).toLowerCase() === email)
        if (invite) {
          const ok = await claimInviteInPlace(tools, invite, userId)
          if (!ok) return { success: false, error: 'Claim failed' }
          await ensureTeamRoomMirror(tools as Tools, teamId, {
            UserId: userId,
            RoleInTeam: (invite.data.RoleInTeam as string) || 'member',
            JoinedAt: Date.now(),
            Email: email,
          })
          return { success: true, data: { status: 'claimed' } }
        }
      }
    }

    // Fresh join: only open teams accept uninvited members.
    if (!team.data.IsOpen) return { success: false, error: 'This team is invite-only' }

    const membership = {
      TeamId: teamId,
      UserId: userId,
      RoleInTeam: 'member',
      JoinedAt: Date.now(),
      Email: email,
      Status: 'active',
    }
    const createRes = await tools.create('team_members', membership)
    if (!createRes.success) return { success: false, error: 'Join failed' }
    await ensureTeamRoomMirror(tools as Tools, teamId, membership)
    return { success: true, data: { status: 'joined' } }
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

    // Delete all team_members for this team (and their team-room mirrors)
    const membersRes = await tools.query('team_members', { where: { TeamId: teamId } })
    if (membersRes.success) {
      for (const m of (membersRes.data as { records: Envelope[] }).records) {
        await removeTeamRoomMirror(tools as Tools, teamId, m.data.UserId as string)
        await tools.remove('team_members', m.recordId)
      }
    }

    return tools.remove('teams', teamId)
  },
}
