import type { CollectionSchema } from 'deepspace/worker'

export const tagsSchema: CollectionSchema = {
  name: 'tags',
  columns: [
    { name: 'TeamId', storage: 'text', interpretation: 'plain' },
    { name: 'Name', storage: 'text', interpretation: 'plain' },
    { name: 'Color', storage: 'text', interpretation: 'plain' },
    { name: 'CreatedAt', storage: 'number', interpretation: 'plain' },
  ],
  teamField: 'TeamId',
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: 'team', create: true, update: 'team', delete: 'team' },
    admin:  { read: true, create: true, update: true, delete: true },
  },
}
