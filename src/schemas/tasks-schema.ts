import type { CollectionSchema } from 'deepspace/worker'

export const tasksSchema: CollectionSchema = {
  name: 'tasks',
  columns: [
    { name: 'TeamId', storage: 'text', interpretation: 'plain' },
    { name: 'Title', storage: 'text', interpretation: 'plain' },
    { name: 'Notes', storage: 'text', interpretation: 'plain' },
    { name: 'Completed', storage: 'number', interpretation: 'plain' },
    { name: 'CompletedAt', storage: 'number', interpretation: 'plain' },
    { name: 'Deleted', storage: 'number', interpretation: 'plain' },
    { name: 'DeletedAt', storage: 'number', interpretation: 'plain' },
    { name: 'Priority', storage: 'text', interpretation: 'plain' },
    { name: 'DueDate', storage: 'text', interpretation: 'plain' },
    { name: 'ProjectId', storage: 'text', interpretation: 'plain' },
    { name: 'KanbanStatus', storage: 'text', interpretation: 'plain' },
    { name: 'Order', storage: 'number', interpretation: 'plain' },
    { name: 'AssignedUser', storage: 'text', interpretation: 'json' },
    { name: 'AssignedBy', storage: 'text', interpretation: 'json' },
    { name: 'TagIds', storage: 'text', interpretation: 'json' },
    { name: 'CreatedAt', storage: 'number', interpretation: 'plain' },
  ],
  teamField: 'TeamId',
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: 'team', create: true, update: 'team', delete: 'team' },
    admin:  { read: true, create: true, update: true, delete: true },
  },
}
