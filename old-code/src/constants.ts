/**
 * Things-like Task Manager — Constants
 */

export const APP_ID = __APP_ID__
export const SCOPE_ID = `app:${APP_ID}`

/** Connect to workspace:default for tasks, projects, tags, and teams. */
export const SHARED_CONNECTIONS: { type: string; instanceId?: string }[] = [
  { type: 'workspace', instanceId: 'default' },
]

// ── Views ───────────────────────────────────────────
export const VIEWS = {
  ALL: 'all',
  TODAY: 'today',
  UPCOMING: 'upcoming',
  LOGBOOK: 'logbook',
  TRASH: 'trash',
  PROJECT: 'project',
  USER: 'user',
} as const;

export type ViewType = typeof VIEWS[keyof typeof VIEWS];

export interface ViewState {
  type: ViewType;
  id?: string;
}

// ── Task Status ─────────────────────────────────────
export const TASK_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DELETED: 'deleted',
} as const;

// ── Priorities ──────────────────────────────────────
export const PRIORITIES = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export const PRIORITY_LABELS: Record<string, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const PRIORITY_COLORS: Record<string, string> = {
  none: '#8E8E93',
  low: '#34C759',
  medium: '#FF9500',
  high: '#FF3B30',
};

// ── Kanban Status ───────────────────────────────────
export const KANBAN_STATUS = {
  BACKLOG: 'backlog',
  READY: 'ready',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done',
} as const;

export const KANBAN_STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export const KANBAN_STATUS_COLORS: Record<string, string> = {
  backlog: '#8E8E93',
  ready: '#007AFF',
  in_progress: '#FF9500',
  review: '#AF52DE',
  done: '#34C759',
};

export const ALL_KANBAN_STATUS_IDS = ['backlog', 'ready', 'in_progress', 'review', 'done'];

export const KANBAN_STATUS_CONFIG = [
  { id: 'backlog', label: 'Backlog', color: '#9ca3af' },
  { id: 'ready', label: 'Ready', color: '#6366f1' },
  { id: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { id: 'review', label: 'Review', color: '#8b5cf6' },
  { id: 'done', label: 'Done', color: '#22c55e' },
];

// ── Default Task ────────────────────────────────────
export const DEFAULT_TASK: TaskRecord = {
  TeamId: '',
  Title: '',
  Notes: '',
  Completed: 0,
  CompletedAt: null,
  Deleted: 0,
  DeletedAt: null,
  Priority: 'none',
  DueDate: null,
  ProjectId: null,
  KanbanStatus: 'backlog',
  Order: 0,
  AssignedUser: null,
  AssignedBy: null,
  TagIds: [],
  CreatedAt: 0,
};

// ── Default Project ─────────────────────────────────
export const DEFAULT_PROJECT: ProjectRecord = {
  TeamId: '',
  Title: 'New Project',
  Notes: '',
  Color: '#007AFF',
  ParentId: null,
  Order: 0,
  CreatedAt: 0,
};

// ── Tag Colors ──────────────────────────────────────
export const TAG_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE',
  '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#A2845E',
  '#8E8E93', '#636366',
];

export const DEFAULT_TAG: TagRecord = {
  TeamId: '',
  Name: '',
  Color: '#007AFF',
  CreatedAt: 0,
};

// ── Types ───────────────────────────────────────────
export interface TaskUser {
  id: string;
  name: string;
  email?: string;
  color?: string;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  completedAt: number | null;
  deleted: boolean;
  deletedAt: number | null;
  priority: string;
  dueDate: string | null;
  projectId: string | null;
  kanbanStatus: string;
  order: number;
  assignedUser: TaskUser | null;
  assignedBy: TaskUser | null;
  tagIds: string[];
  createdAt: number;
  _isInSubproject?: boolean;
}

export interface Project {
  id: string;
  title: string;
  notes: string;
  color: string;
  parentId: string | null;
  order: number;
  createdAt: number;
}

export interface ProjectTreeNode extends Project {
  children: ProjectTreeNode[];
  taskCount: number;
  totalTaskCount: number;
  totalUncompleted: number;
  totalCompleted: number;
  hasChildren: boolean;
  childCount?: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface TaskCounts {
  all: { total: number; completed: number; uncompleted: number };
  today: { total: number; completed: number; uncompleted: number };
  upcoming: { total: number; completed: number; uncompleted: number };
  logbook: { total: number; completed: number; uncompleted: number };
  trash: { total: number; completed: number; uncompleted: number };
}

export interface CustomUser {
  id: string;
  name: string;
  email: string;
  color: string;
}

/**
 * Widget-level user representation.
 * Named WidgetUser (not RoomUser) to avoid shadowing the SDK's RoomUser
 * from @spaces/sdk/storage, which has different field optionality.
 * `color` is computed deterministically via getUserColor() — the SDK
 * user types do not provide a color field.
 */
export interface WidgetUser {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  color: string;
  role: string;
  createdAt?: string;
  lastSeenAt?: string;
  /** True for pending invites (addMember by email — user hasn't connected yet) */
  isPending?: boolean;
}

// ── Deterministic user color ────────────────────────
import { getUserColor as _getUserColor } from '@spaces/sdk/storage'

export const USER_COLOR_PALETTE = [
  '#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE',
  '#5856D6', '#FF2D55', '#00C7BE', '#A2845E', '#5AC8FA',
];

export function getUserColor(userId: string): string {
  return _getUserColor(userId, USER_COLOR_PALETTE);
}

export function getRandomUserColor(): string {
  return USER_COLOR_PALETTE[Math.floor(Math.random() * USER_COLOR_PALETTE.length)];
}

// ── Record data shapes (PascalCase column names from workspace:default) ──
// Used as generic parameters for useQuery<T> and useMutations<T>.
// Booleans are stored as 0/1 in SQLite; JSON fields are auto-serialized.

export interface TaskRecord {
  TeamId: string;
  Title: string;
  Notes: string;
  Completed: number;
  CompletedAt: number | null;
  Deleted: number;
  DeletedAt: number | null;
  Priority: string;
  DueDate: string | null;
  ProjectId: string | null;
  KanbanStatus: string;
  Order: number;
  AssignedUser: TaskUser | null;
  AssignedBy: TaskUser | null;
  TagIds: string[];
  CreatedAt: number;
}

export interface ProjectRecord {
  TeamId: string;
  Title: string;
  Notes: string;
  Color: string;
  ParentId: string | null;
  Order: number;
  CreatedAt: number;
}

export interface TagRecord {
  TeamId: string;
  Name: string;
  Color: string;
  CreatedAt: number;
}

