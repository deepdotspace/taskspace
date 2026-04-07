/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 */

import type { CollectionSchema } from 'deepspace/worker'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { tasksSchema } from './schemas/tasks-schema'
import { projectsSchema } from './schemas/projects-schema'
import { tagsSchema } from './schemas/tags-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  tasksSchema,
  projectsSchema,
  tagsSchema,
]
