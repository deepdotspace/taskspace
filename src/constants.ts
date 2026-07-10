/**
 * Things-like Task Manager — Constants
 */

export const APP_NAME = 'taskspace'
export const SCOPE_ID = `app:${APP_NAME}`

/** Roles and display config — imported from SDK (single source of truth) */
export { ROLES, ROLE_CONFIG, type Role } from 'deepspace'

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
  none: '#98A0B3',
  low: '#22C08B',
  medium: '#FF9F2E',
  high: '#FF4D4F',
};

/** Soft pill backgrounds per priority (Momentum design). */
export const PRIORITY_SOFT_COLORS: Record<string, string> = {
  none: '#F1F1F6',
  low: '#E4F7EF',
  medium: '#FFF3E0',
  high: '#FFEEEE',
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
  backlog: '#98A0B3',
  ready: '#4C6FFF',
  in_progress: '#6B4CE6',
  review: '#A855F7',
  done: '#22C08B',
};

/** Soft pill backgrounds per status (Momentum design). */
export const KANBAN_STATUS_SOFT_COLORS: Record<string, string> = {
  backlog: '#F1F1F6',
  ready: '#EAF0FF',
  in_progress: '#F0ECFE',
  review: '#F6ECFE',
  done: '#E4F7EF',
};

export const ALL_KANBAN_STATUS_IDS = ['backlog', 'ready', 'in_progress', 'review', 'done'];

export const KANBAN_STATUS_CONFIG = [
  { id: 'backlog', label: 'Backlog', color: '#98A0B3' },
  { id: 'ready', label: 'Ready', color: '#4C6FFF' },
  { id: 'in_progress', label: 'In Progress', color: '#6B4CE6' },
  { id: 'review', label: 'Review', color: '#A855F7' },
  { id: 'done', label: 'Done', color: '#22C08B' },
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
  Color: '#7C5CFC',
  ParentId: null,
  Order: 0,
  CreatedAt: 0,
};

// ── Tag Colors ──────────────────────────────────────
export const TAG_COLORS = [
  '#FF4D4F', '#FF9F2E', '#FFC933', '#22C08B', '#00C7BE',
  '#4C6FFF', '#6B4CE6', '#A855F7', '#FF2D75', '#A2845E',
  '#98A0B3', '#3A3C52',
];

export const DEFAULT_TAG: TagRecord = {
  TeamId: '',
  Name: '',
  Color: '#6B4CE6',
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

export interface WidgetUser {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  color: string;
  role: string;
  createdAt?: string;
  lastSeenAt?: string;
  isPending?: boolean;
}

// ── Deterministic user color ────────────────────────

export const USER_COLOR_PALETTE = [
  '#7C5CFC', '#FF4D4F', '#22C08B', '#FF9F2E', '#A855F7',
  '#4C6FFF', '#FF2D75', '#00C7BE', '#A2845E', '#38B6E0',
];

export function getUserColor(userId: string | null | undefined): string {
  if (!userId) return USER_COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return USER_COLOR_PALETTE[Math.abs(hash) % USER_COLOR_PALETTE.length];
}

export function getRandomUserColor(): string {
  return USER_COLOR_PALETTE[Math.floor(Math.random() * USER_COLOR_PALETTE.length)];
}

// ── Record data shapes (PascalCase column names) ──

// ── Team types ──────────────────────────────────────

export interface TeamRecord {
  Name: string;
  CreatedBy: string; // userId
  IsOpen: number;    // 1 = open (join by ID), 0 = invite only
}

export interface TeamMemberRecord {
  TeamId: string;
  UserId: string;
  RoleInTeam: string; // 'admin' | 'member'
  JoinedAt: number;   // unix ms timestamp
  Email: string;      // email for invited-not-yet-signed-in users
  Status: string;     // 'active' | 'invited'
}

export interface Team {
  id: string;
  name: string;
  createdBy: string;
  isOpen: boolean;
}

export interface TeamMember {
  id: string;        // team_members record ID
  teamId: string;
  userId: string;
  roleInTeam: string;
  joinedAt: number;
  email: string;
  status: string;    // 'active' | 'invited'
  isPending: boolean;
}

// ── Record data shapes (PascalCase column names) ──

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
