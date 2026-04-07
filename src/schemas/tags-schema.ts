import type { CollectionSchema } from 'deepspace/worker'

export const tagsSchema: CollectionSchema = {
  name: 'tags',
  columns: [
    { name: 'Name', storage: 'text', interpretation: 'plain' },
    { name: 'Color', storage: 'text', interpretation: 'plain' },
    { name: 'CreatedAt', storage: 'number', interpretation: 'plain' },
  ],
  permissions: {
    viewer: { read: true, create: false, update: false, delete: false },
    member: { read: true, create: true, update: true, delete: true },
    admin:  { read: true, create: true, update: true, delete: true },
  },
}
