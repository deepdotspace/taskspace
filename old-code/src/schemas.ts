import type { CollectionSchema } from '@spaces/sdk/worker'
import { USERS_COLLECTION_FIELDS } from '@spaces/sdk/worker'

// ── Users (app-private — role tracking only) ─────────

const usersSchema: CollectionSchema = {
  name: 'users',
  fields: {
    ...USERS_COLLECTION_FIELDS,
  },
  permissions: {
    viewer: { read: 'own', create: false, update: 'own', delete: false, writableFields: [] },
    member: { read: true, create: false, update: 'own', delete: false, writableFields: [] },
    admin:  { read: true, create: false, update: true, delete: true },
  },
}

// Tasks, projects, and tags now live in workspace:default.
// See SHARED_CONNECTIONS in constants.ts.

export const schemas: CollectionSchema[] = [
  usersSchema,
]
