/**
 * Compute the displayed task list with filtering & sorting applied.
 * Ported from previous_task_widget/utils/computeDisplayedTasks.js
 */

import { Task, VIEWS, ViewType, ViewState } from '../constants';

function parseYMDLocalTime(ymd: string | null | undefined): number | null {
  if (!ymd || typeof ymd !== 'string') return null;
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return null;
  const t = new Date(y, m - 1, d).getTime();
  return Number.isFinite(t) ? t : null;
}

function normalizeSortKey(sortBy: string): string {
  if (sortBy === 'deadline') return 'dueDate';
  if (sortBy === 'created') return 'createdAt';
  if (sortBy === 'alpha') return 'title';
  return sortBy;
}

function compareTasks(sortKey: string, sortDirection: string, a: Task, b: Task): number {
  const stableFallback = () =>
    String(a?.id || '').localeCompare(String(b?.id || ''));

  const dir = sortDirection === 'desc' ? -1 : 1;

  switch (sortKey) {
    case 'title': {
      const aTitle = String(a?.title || '').trim();
      const bTitle = String(b?.title || '').trim();
      if (!aTitle && !bTitle) return stableFallback();
      if (!aTitle) return 1;
      if (!bTitle) return -1;
      const cmp = aTitle.localeCompare(bTitle, undefined, {
        sensitivity: 'base',
        numeric: true,
      });
      return cmp === 0 ? stableFallback() : cmp * dir;
    }
    case 'dueDate': {
      const aRaw = a?.dueDate || null;
      const bRaw = b?.dueDate || null;
      const aTime = parseYMDLocalTime(aRaw);
      const bTime = parseYMDLocalTime(bRaw);
      if (aTime == null && bTime == null) return stableFallback();
      if (aTime == null) return 1;
      if (bTime == null) return -1;
      if (aTime === bTime) return stableFallback();
      return (aTime < bTime ? -1 : 1) * dir;
    }
    case 'priority': {
      const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const aP = priorityOrder[a?.priority] || 0;
      const bP = priorityOrder[b?.priority] || 0;
      if (aP === bP) return stableFallback();
      return (aP < bP ? -1 : 1) * dir;
    }
    case 'createdAt': {
      // createdAt is stored as epoch ms (number), but may also be an ISO string from older data
      const aRaw = a?.createdAt;
      const bRaw = b?.createdAt;
      const aTime = typeof aRaw === 'number' ? aRaw : Date.parse(String(aRaw || ''));
      const bTime = typeof bRaw === 'number' ? bRaw : Date.parse(String(bRaw || ''));
      const aOk = Number.isFinite(aTime);
      const bOk = Number.isFinite(bTime);
      if (!aOk && !bOk) return stableFallback();
      if (!aOk) return 1;
      if (!bOk) return -1;
      if (aTime === bTime) return stableFallback();
      return (aTime < bTime ? -1 : 1) * dir;
    }
    default:
      return stableFallback();
  }
}

interface ComputeOptions {
  currentView: ViewState;
  getTasksForView: (view: string, viewId?: string | null, includeCompleted?: boolean) => Task[];
  views?: typeof VIEWS;
  showCompleted: boolean;
  showUnassigned?: boolean;
  selectedProjectIds: string[] | null;
  selectedTagIds: string[] | null;
  selectedKanbanStatuses: string[] | null;
  selectedUserIds?: string[] | null;
  searchQuery: string;
  sortBy: string | null;
  sortDirection: string;
}

export function computeDisplayedTasks(options: ComputeOptions): Task[] {
  const {
    currentView,
    getTasksForView,
    showCompleted,
    showUnassigned = true,
    selectedProjectIds,
    selectedTagIds,
    selectedKanbanStatuses,
    selectedUserIds = null,
    searchQuery,
    sortBy,
    sortDirection,
  } = options;

  const views = VIEWS;

  // Get base task list for current view
  let result: Task[];
  if (currentView.type === views.PROJECT) {
    result = getTasksForView(views.PROJECT, currentView.id, true);
  } else if (currentView.type === views.USER) {
    result = getTasksForView(views.USER, currentView.id, true);
  } else {
    result = getTasksForView(currentView.type);
  }

  // Apply completed filter in ALL, PROJECT, and USER views.
  if (
    ([views.ALL, views.PROJECT, views.USER] as readonly ViewType[]).includes(currentView.type) &&
    !showCompleted
  ) {
    result = result.filter((t) => !t.completed);
  }

  // Apply unassigned filter
  if (!showUnassigned) {
    result = result.filter((t) => t.assignedUser != null);
  }

  // Apply project filter in views that show multiple projects.
  if (([views.ALL, views.TODAY, views.UPCOMING, views.USER, views.LOGBOOK] as readonly ViewType[]).includes(currentView.type)) {
    if (selectedProjectIds !== null) {
      result = result.filter(
        (t) => !t.projectId || selectedProjectIds.includes(t.projectId)
      );
    }
  }

  // Apply tag filter.
  if (selectedTagIds !== null) {
    result = result.filter((t) => {
      const taskTags = t.tagIds || [];
      return taskTags.length === 0 || taskTags.every((tagId: string) => selectedTagIds.includes(tagId));
    });
  }

  // Apply kanban status filter.
  if (selectedKanbanStatuses !== null) {
    result = result.filter((t) => {
      const taskStatus = t.kanbanStatus || 'backlog';
      return selectedKanbanStatuses.includes(taskStatus);
    });
  }

  // Apply user/assignee filter.
  if (selectedUserIds !== null && currentView.type !== views.USER) {
    result = result.filter((t) => {
      const assignedUserId = t.assignedUser?.id;
      return !assignedUserId || selectedUserIds.includes(assignedUserId);
    });
  }

  // Apply search filter.
  if (searchQuery && String(searchQuery).trim()) {
    const query = String(searchQuery).toLowerCase();
    result = result.filter((t) => {
      const titleMatch = String(t.title || '').toLowerCase().includes(query);
      const notesMatch = String(t.notes || '').toLowerCase().includes(query);
      return titleMatch || notesMatch;
    });
  }

  // Apply sorting.
  if (sortBy) {
    const sortKey = normalizeSortKey(sortBy);
    result = [...result].sort((a, b) => compareTasks(sortKey, sortDirection, a, b));
  }

  return result;
}
