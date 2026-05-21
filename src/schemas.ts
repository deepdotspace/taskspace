/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 */

import type { CollectionSchema } from 'deepspace/worker'
import { AI_CHATS_SCHEMA, AI_MESSAGES_SCHEMA } from 'deepspace/worker'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { teamsSchema, teamMembersSchema } from './schemas/teams-schema'
import { tasksSchema } from './schemas/tasks-schema'
import { projectsSchema } from './schemas/projects-schema'
import { tagsSchema } from './schemas/tags-schema'

/** App-scope schemas — discovery layer (teams, members, AI chat). */
export const appSchemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  teamsSchema,
  teamMembersSchema,
  AI_CHATS_SCHEMA,
  AI_MESSAGES_SCHEMA,
]

/** Team-scope schemas — workspace data isolated per team room. */
export const teamSchemas: CollectionSchema[] = [
  tasksSchema,
  projectsSchema,
  tagsSchema,
]

/** All schemas — consumed by AppRecordRoom so each DO instance can serve any collection. */
export const schemas: CollectionSchema[] = [...appSchemas, ...teamSchemas]
