import type { CollectionSchema } from 'deepspace/worker'

/**
 * Teams schema — one record per team.
 * teamField: '_rowId' means the DO uses the team's own record ID as the team ID
 * for permission checks (so team members can read their team's record).
 */
export const teamsSchema: CollectionSchema = {
  name: 'teams',
  columns: [
    { name: 'Name', storage: 'text', interpretation: 'plain' },
    { name: 'CreatedBy', storage: 'text', interpretation: 'plain' },
    { name: 'IsOpen', storage: 'number', interpretation: { kind: 'boolean' } },
  ],
  teamField: '_rowId',
  permissions: {
    admin:  { read: true, create: true, update: true, delete: true },
    member: { read: 'team', create: true, update: 'team', delete: 'own' },
  },
}

/**
 * Team members schema — one record per (team, user) pair.
 * The DO's preloadUserTeamIds reads this collection to resolve team membership
 * for 'team' permission checks. collection name must be 'team_members'.
 */
export const teamMembersSchema: CollectionSchema = {
  name: 'team_members',
  columns: [
    { name: 'TeamId', storage: 'text', interpretation: 'plain' },
    { name: 'UserId', storage: 'text', interpretation: 'plain' },
    { name: 'RoleInTeam', storage: 'text', interpretation: 'plain' }, // 'admin' | 'member'
    { name: 'JoinedAt', storage: 'number', interpretation: 'plain' }, // unix ms timestamp
    { name: 'Email', storage: 'text', interpretation: 'plain' },      // for invited-not-yet-signed-in users
    { name: 'Status', storage: 'text', interpretation: 'plain' },     // 'active' | 'invited'
  ],
  teamField: 'TeamId',
  permissions: {
    admin:  { read: true, create: true, update: true, delete: true },
    member: { read: 'team', create: true, update: false, delete: false },
  },
}
