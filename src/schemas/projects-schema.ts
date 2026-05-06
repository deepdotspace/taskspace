import type { CollectionSchema } from 'deepspace/worker'

export const projectsSchema: CollectionSchema = {
  name: 'projects',
  columns: [
    { name: 'TeamId', storage: 'text', interpretation: 'plain' },
    { name: 'Title', storage: 'text', interpretation: 'plain' },
    { name: 'Notes', storage: 'text', interpretation: 'plain' },
    { name: 'Color', storage: 'text', interpretation: 'plain' },
    { name: 'ParentId', storage: 'text', interpretation: 'plain' },
    { name: 'Order', storage: 'number', interpretation: 'plain' },
    { name: 'CreatedAt', storage: 'number', interpretation: 'plain' },
  ],
  teamField: 'TeamId',
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: 'team', create: true, update: 'team', delete: 'team' },
    admin:  { read: true, create: true, update: true, delete: true },
  },
}
