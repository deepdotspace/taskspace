/**
 * Main data hook — useQuery/useMutations for team-scoped collection data.
 *
 * Data lives in workspace:default with PascalCase column names.
 * This hook maps between PascalCase (wire format) and the app's
 * camelCase Task/Project/Tag interfaces.
 *
 * The server enforces team membership via teamField + SQL pushdown;
 * client-side we additionally filter by the selected teamId for
 * multi-team users.
 *
 * PERFORMANCE: CRUD callbacks use refs for record/data lookups so they
 * remain stable across real-time updates. Without this, every WebSocket
 * update would recreate every callback and cascade re-renders through
 * the entire component tree.
 */
import { useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutations } from '@spaces/sdk/storage';
import {
  Task,
  Project,
  Tag,
  TaskUser,
  TaskCounts,
  ProjectTreeNode,
  DEFAULT_TASK,
  VIEWS,
  WidgetUser,
  TaskRecord,
  ProjectRecord,
  TagRecord,
} from '../constants';

// ── Helpers ─────────────────────────────────────────

function getTodayString(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function compareTasksStable(a: Task, b: Task): number {
  const aHasOrder = typeof a?.order === 'number';
  const bHasOrder = typeof b?.order === 'number';
  if (aHasOrder && bHasOrder) return (a.order ?? 0) - (b.order ?? 0);
  if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;
  const aTime = a?.createdAt || 0;
  const bTime = b?.createdAt || 0;
  if (aTime !== bTime) return aTime - bTime;
  return String(a?.id || '').localeCompare(String(b?.id || ''));
}

function getDescendantIds(projects: Project[], parentId: string): string[] {
  const children = projects.filter(p => p.parentId === parentId);
  let ids = children.map(c => c.id);
  children.forEach(child => {
    ids = [...ids, ...getDescendantIds(projects, child.id)];
  });
  return ids;
}

function wouldCreateCycle(projects: Project[], projectId: string, newParentId: string | null): boolean {
  if (!newParentId) return false;
  if (newParentId === projectId) return true;
  const descendants = getDescendantIds(projects, projectId);
  return descendants.includes(newParentId);
}

// ── Main Hook ───────────────────────────────────────

export function useTaskData(currentUser: WidgetUser | null, teamId: string) {
  // ── Query workspace:default collections (PascalCase columns) ──
  const { records: taskRecords, status: taskStatus } = useQuery<TaskRecord>('tasks');
  const { records: projectRecords, status: projectStatus } = useQuery<ProjectRecord>('projects');
  const { records: tagRecords, status: tagStatus } = useQuery<TagRecord>('tags');

  const { create: createTask, put: putTask, remove: removeTask } = useMutations<TaskRecord>('tasks');
  const { create: createProject, put: putProject, remove: removeProject } = useMutations<ProjectRecord>('projects');
  const { create: createTag, put: putTag, remove: removeTag } = useMutations<TagRecord>('tags');

  const isLoading = taskStatus === 'loading' || projectStatus === 'loading' || tagStatus === 'loading';

  // ── Refs for CRUD callback lookups ────────────────
  const taskRecordsRef = useRef(taskRecords);
  taskRecordsRef.current = taskRecords;

  const projectRecordsRef = useRef(projectRecords);
  projectRecordsRef.current = projectRecords;

  // ── Map PascalCase records → camelCase app objects (filtered by teamId) ──
  const tasks: Task[] = useMemo(() => {
    return (taskRecords || [])
      .filter(r => r.data.TeamId === teamId)
      .map(r => ({
        id: r.recordId,
        title: r.data.Title || '',
        notes: r.data.Notes || '',
        completed: !!r.data.Completed,
        completedAt: r.data.CompletedAt ?? null,
        deleted: !!r.data.Deleted,
        deletedAt: r.data.DeletedAt ?? null,
        priority: r.data.Priority || 'none',
        dueDate: r.data.DueDate || null,
        projectId: r.data.ProjectId || null,
        kanbanStatus: r.data.KanbanStatus || 'backlog',
        order: r.data.Order ?? 0,
        assignedUser: r.data.AssignedUser || null,
        assignedBy: r.data.AssignedBy || null,
        tagIds: r.data.TagIds || [],
        createdAt: r.data.CreatedAt || 0,
      }));
  }, [taskRecords, teamId]);

  const projects: Project[] = useMemo(() => {
    return (projectRecords || [])
      .filter(r => r.data.TeamId === teamId)
      .map(r => ({
        id: r.recordId,
        title: r.data.Title || '',
        notes: r.data.Notes || '',
        color: r.data.Color || '#007AFF',
        parentId: r.data.ParentId || null,
        order: r.data.Order ?? 0,
        createdAt: r.data.CreatedAt || 0,
      }));
  }, [projectRecords, teamId]);

  const tags: Tag[] = useMemo(() => {
    return (tagRecords || [])
      .filter(r => r.data.TeamId === teamId)
      .map(r => ({
        id: r.recordId,
        name: r.data.Name || '',
        color: r.data.Color || '#007AFF',
        createdAt: r.data.CreatedAt || 0,
      }));
  }, [tagRecords, teamId]);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  // ── Derived data ──────────────────────────────────

  /** Task counts by view */
  const taskCounts: TaskCounts = useMemo(() => {
    const counts: TaskCounts = {
      all: { total: 0, completed: 0, uncompleted: 0 },
      today: { total: 0, completed: 0, uncompleted: 0 },
      upcoming: { total: 0, completed: 0, uncompleted: 0 },
      logbook: { total: 0, completed: 0, uncompleted: 0 },
      trash: { total: 0, completed: 0, uncompleted: 0 },
    };
    const todayStr = getTodayString();

    tasks.forEach(task => {
      if (task.deleted) {
        counts.trash.total++;
        task.completed ? counts.trash.completed++ : counts.trash.uncompleted++;
        return;
      }
      counts.all.total++;
      if (task.completed) {
        counts.all.completed++;
        counts.logbook.total++;
        counts.logbook.completed++;
        return;
      } else {
        counts.all.uncompleted++;
      }
      const taskDate = task.dueDate;
      if (taskDate === todayStr) {
        counts.today.total++;
        task.completed ? counts.today.completed++ : counts.today.uncompleted++;
      }
      if (taskDate && taskDate > todayStr) {
        counts.upcoming.total++;
        task.completed ? counts.upcoming.completed++ : counts.upcoming.uncompleted++;
      }
    });
    return counts;
  }, [tasks]);

  /** Tasks grouped by user */
  const tasksByUser = useMemo(() => {
    const userMap: Record<string, { user: TaskUser; tasks: Task[] }> = {};
    tasks
      .filter(t => !t.deleted && t.assignedUser && typeof t.assignedUser.id === 'string')
      .forEach(task => {
        const userId = task.assignedUser!.id;
        if (!userMap[userId]) {
          userMap[userId] = { user: task.assignedUser!, tasks: [] };
        }
        userMap[userId].tasks.push(task);
      });
    return userMap;
  }, [tasks]);

  /** Tasks grouped by project */
  const tasksByProject = useMemo(() => {
    const projectMap: Record<string, Task[]> = {};
    tasks
      .filter(t => !t.completed && !t.deleted && t.projectId)
      .forEach(task => {
        if (!projectMap[task.projectId!]) {
          projectMap[task.projectId!] = [];
        }
        projectMap[task.projectId!].push(task);
      });
    return projectMap;
  }, [tasks]);

  /** Unassigned task count */
  const unassignedTasksCount = useMemo(() => {
    return tasks.filter(t => !t.completed && !t.deleted && !t.assignedUser).length;
  }, [tasks]);

  /** Project tree with counts */
  const projectTree: ProjectTreeNode[] = useMemo(() => {
    const allTasksByProject: Record<string, Task[]> = {};
    tasks.forEach(task => {
      if (task.deleted || !task.projectId) return;
      if (!allTasksByProject[task.projectId]) {
        allTasksByProject[task.projectId] = [];
      }
      allTasksByProject[task.projectId].push(task);
    });

    const buildTree = (parentId: string | null = null): ProjectTreeNode[] => {
      return projects
        .filter(p => p.parentId === parentId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(project => {
          const children = buildTree(project.id);
          const directTasks = allTasksByProject[project.id] || [];
          const directUncompleted = directTasks.filter(t => !t.completed).length;
          const directCompleted = directTasks.filter(t => t.completed).length;
          const directTotal = directTasks.length;
          const childUncompleted = children.reduce((sum, c) => sum + (c.totalUncompleted || 0), 0);
          const childCompleted = children.reduce((sum, c) => sum + (c.totalCompleted || 0), 0);
          const childTotal = children.reduce((sum, c) => sum + (c.totalTaskCount || 0), 0);
          return {
            ...project,
            children,
            taskCount: directUncompleted,
            totalTaskCount: directTotal + childTotal,
            totalUncompleted: directUncompleted + childUncompleted,
            totalCompleted: directCompleted + childCompleted,
            hasChildren: children.length > 0,
            childCount: children.length,
          };
        });
    };
    return buildTree(null);
  }, [projects, tasks]);

  // ── Get tasks for view (filtering) ────────────────

  const getTasksForView = useCallback(
    (view: string, viewId: string | null = null, includeCompleted = false): Task[] => {
      const todayStr = getTodayString();
      return tasks
        .filter(task => {
          const taskDate = task.dueDate;
          if (view === VIEWS.TRASH) return task.deleted === true;
          if (task.deleted) return false;
          if (view === VIEWS.ALL) return true;
          if (view === VIEWS.LOGBOOK) return task.completed;
          if (task.completed && !includeCompleted) return false;
          if (view === VIEWS.PROJECT && viewId) {
            const subtreeIds = [viewId, ...getDescendantIds(projects, viewId)];
            return subtreeIds.includes(task.projectId || '');
          }
          if (view === VIEWS.USER && viewId) {
            if (viewId === 'unassigned') return !task.assignedUser;
            return task.assignedUser?.id === viewId;
          }
          switch (view) {
            case VIEWS.TODAY:
              return taskDate === todayStr;
            case VIEWS.UPCOMING:
              return !!taskDate && taskDate > todayStr;
            default:
              return true;
          }
        })
        .map(task => {
          if (view === VIEWS.PROJECT && viewId && task.projectId) {
            return { ...task, _isInSubproject: task.projectId !== viewId };
          }
          return task;
        })
        .sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          if (a.completed && b.completed) {
            return (b.completedAt || 0) - (a.completedAt || 0);
          }
          const aDate = a.dueDate || '';
          const bDate = b.dueDate || '';
          if (aDate !== bDate) return aDate.localeCompare(bDate);
          return compareTasksStable(a, b);
        });
    },
    [tasks, projects]
  );

  // ── CRUD: Tasks ───────────────────────────────────
  // All mutations write PascalCase TaskRecord to workspace:default.

  const addTask = useCallback(
    async (taskData: Partial<Task>) => {
      const now = Date.now();
      const { id: _id, _isInSubproject: _sub, ...taskFields } = {
        ...{
          title: '',
          notes: '',
          completed: false,
          completedAt: null as number | null,
          deleted: false,
          deletedAt: null as number | null,
          priority: 'none',
          dueDate: null as string | null,
          projectId: null as string | null,
          kanbanStatus: 'backlog',
          order: 0,
          assignedUser: null as TaskUser | null,
          assignedBy: null as TaskUser | null,
          tagIds: [] as string[],
          createdAt: 0,
        },
        ...taskData,
        order: now,
        createdAt: now,
      };

      // Build PascalCase record
      const data: TaskRecord = {
        TeamId: teamId,
        Title: taskFields.title,
        Notes: taskFields.notes,
        Completed: taskFields.completed ? 1 : 0,
        CompletedAt: taskFields.completedAt ?? null,
        Deleted: taskFields.deleted ? 1 : 0,
        DeletedAt: taskFields.deletedAt ?? null,
        Priority: taskFields.priority,
        DueDate: taskFields.dueDate ?? null,
        ProjectId: taskFields.projectId ?? null,
        KanbanStatus: taskFields.kanbanStatus,
        Order: taskFields.order,
        AssignedUser: taskFields.assignedUser ?? null,
        AssignedBy: taskFields.assignedBy ?? null,
        TagIds: taskFields.tagIds ?? [],
        CreatedAt: taskFields.createdAt,
      };

      // Handle assignedBy
      if (taskData.assignedUser && currentUser) {
        const isAssigningToOther = taskData.assignedUser.id !== currentUser.id;
        if (isAssigningToOther) {
          data.AssignedBy = {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            color: currentUser.color,
          };
        }
      }

      const recordId = await createTask(data);
      return {
        id: recordId,
        title: data.Title,
        notes: data.Notes,
        completed: !!data.Completed,
        completedAt: data.CompletedAt,
        deleted: !!data.Deleted,
        deletedAt: data.DeletedAt,
        priority: data.Priority,
        dueDate: data.DueDate,
        projectId: data.ProjectId,
        kanbanStatus: data.KanbanStatus,
        order: data.Order,
        assignedUser: data.AssignedUser,
        assignedBy: data.AssignedBy,
        tagIds: data.TagIds,
        createdAt: data.CreatedAt,
      } as Task;
    },
    [createTask, currentUser, teamId]
  );

  /** Convert an existing record's PascalCase data + camelCase partial updates into a full TaskRecord */
  function mergeTaskUpdate(existing: { data: TaskRecord }, updates: Partial<Task>): TaskRecord {
    const { id: _id, _isInSubproject: _sub, ...cleanUpdates } = updates;
    return {
      TeamId: existing.data.TeamId,
      Title: cleanUpdates.title ?? existing.data.Title,
      Notes: cleanUpdates.notes ?? existing.data.Notes,
      Completed: cleanUpdates.completed !== undefined ? (cleanUpdates.completed ? 1 : 0) : existing.data.Completed,
      CompletedAt: cleanUpdates.completedAt !== undefined ? cleanUpdates.completedAt : existing.data.CompletedAt,
      Deleted: cleanUpdates.deleted !== undefined ? (cleanUpdates.deleted ? 1 : 0) : existing.data.Deleted,
      DeletedAt: cleanUpdates.deletedAt !== undefined ? cleanUpdates.deletedAt : existing.data.DeletedAt,
      Priority: cleanUpdates.priority ?? existing.data.Priority,
      DueDate: cleanUpdates.dueDate !== undefined ? cleanUpdates.dueDate : existing.data.DueDate,
      ProjectId: cleanUpdates.projectId !== undefined ? cleanUpdates.projectId : existing.data.ProjectId,
      KanbanStatus: cleanUpdates.kanbanStatus ?? existing.data.KanbanStatus,
      Order: cleanUpdates.order ?? existing.data.Order,
      AssignedUser: cleanUpdates.assignedUser !== undefined ? cleanUpdates.assignedUser : existing.data.AssignedUser,
      AssignedBy: cleanUpdates.assignedBy !== undefined ? cleanUpdates.assignedBy : existing.data.AssignedBy,
      TagIds: cleanUpdates.tagIds ?? existing.data.TagIds,
      CreatedAt: existing.data.CreatedAt,
    };
  }

  const updateTask = useCallback(
    (taskId: string, updates: Partial<Task>) => {
      const existing = (taskRecordsRef.current || []).find(r => r.recordId === taskId);
      if (!existing) return;

      const merged = mergeTaskUpdate(existing, updates);

      // Track who assigned the task
      if ('assignedUser' in updates && currentUser) {
        const oldUserId = existing.data.AssignedUser?.id;
        const newUserId = updates.assignedUser?.id;
        if (oldUserId !== newUserId) {
          merged.AssignedBy = {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            color: currentUser.color,
          };
        }
      }

      putTask(taskId, merged);
    },
    [putTask, currentUser]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      const existing = (taskRecordsRef.current || []).find(r => r.recordId === taskId);
      if (!existing) return;
      putTask(taskId, {
        ...existing.data,
        Deleted: 1,
        DeletedAt: Date.now(),
      });
    },
    [putTask]
  );

  const restoreTask = useCallback(
    (taskId: string) => {
      const existing = (taskRecordsRef.current || []).find(r => r.recordId === taskId);
      if (!existing) return;
      putTask(taskId, {
        ...existing.data,
        Deleted: 0,
        DeletedAt: null,
      });
    },
    [putTask]
  );

  const permanentDeleteTask = useCallback(
    (taskId: string) => {
      removeTask(taskId);
    },
    [removeTask]
  );

  const completeTask = useCallback(
    (taskId: string) => {
      const existing = (taskRecordsRef.current || []).find(r => r.recordId === taskId);
      if (!existing) return;
      const isCompleting = !existing.data.Completed;
      putTask(taskId, {
        ...existing.data,
        Completed: isCompleting ? 1 : 0,
        CompletedAt: isCompleting ? Date.now() : null,
        KanbanStatus: isCompleting ? 'done' : (existing.data.KanbanStatus || 'backlog'),
      });
    },
    [putTask]
  );

  const moveTask = useCallback(
    (taskId: string, moveTo: { dueDate?: string | null; projectId?: string | null }) => {
      const existing = (taskRecordsRef.current || []).find(r => r.recordId === taskId);
      if (!existing) return;
      const updates: Partial<TaskRecord> = {};
      if (moveTo.dueDate !== undefined) updates.DueDate = moveTo.dueDate;
      if (moveTo.projectId !== undefined) updates.ProjectId = moveTo.projectId;
      putTask(taskId, { ...existing.data, ...updates });
    },
    [putTask]
  );

  /**
   * Reorder a task (drag-drop).
   * Scoped to current team's task records.
   */
  const reorderTask = useCallback(
    (draggedId: string, targetId: string) => {
      const teamTaskRecords = (taskRecordsRef.current || []).filter(r => r.data.TeamId === teamId);
      const sorted = [...teamTaskRecords]
        .sort((a, b) => ((a.data.Order ?? 0) - (b.data.Order ?? 0)));

      const fromIndex = sorted.findIndex(r => r.recordId === draggedId);
      const toIndex = sorted.findIndex(r => r.recordId === targetId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);

      sorted.forEach((record, idx) => {
        const newOrder = idx;
        if ((record.data.Order ?? 0) !== newOrder) {
          putTask(record.recordId, { ...record.data, Order: newOrder });
        }
      });
    },
    [putTask, teamId]
  );

  // ── CRUD: Projects ────────────────────────────────

  const addProject = useCallback(
    async (projectData: Partial<Project>) => {
      const currentProjects = projectsRef.current;
      const siblings = currentProjects.filter(p => p.parentId === (projectData.parentId || null));
      const maxOrder = Math.max(0, ...siblings.map(p => p.order ?? 0));
      const data: ProjectRecord = {
        TeamId: teamId,
        Title: projectData.title || 'New Project',
        Notes: projectData.notes || '',
        Color: projectData.color || '#007AFF',
        ParentId: projectData.parentId || null,
        Order: maxOrder + 1,
        CreatedAt: Date.now(),
      };
      const recordId = await createProject(data);
      return {
        id: recordId,
        title: data.Title,
        notes: data.Notes,
        color: data.Color,
        parentId: data.ParentId,
        order: data.Order,
        createdAt: data.CreatedAt,
      } as Project;
    },
    [createProject, teamId]
  );

  const updateProject = useCallback(
    (projectId: string, updates: Partial<Project>) => {
      const existing = (projectRecordsRef.current || []).find(r => r.recordId === projectId);
      if (!existing) return;
      const { id: _id, ...cleanUpdates } = updates;
      const merged: ProjectRecord = {
        TeamId: existing.data.TeamId,
        Title: cleanUpdates.title ?? existing.data.Title,
        Notes: cleanUpdates.notes ?? existing.data.Notes,
        Color: cleanUpdates.color ?? existing.data.Color,
        ParentId: cleanUpdates.parentId !== undefined ? cleanUpdates.parentId : existing.data.ParentId,
        Order: cleanUpdates.order ?? existing.data.Order,
        CreatedAt: existing.data.CreatedAt,
      };
      putProject(projectId, merged);
    },
    [putProject]
  );

  const deleteProject = useCallback(
    (projectId: string) => {
      const currentProjects = projectsRef.current;
      const currentTasks = tasksRef.current;
      const allIds = [projectId, ...getDescendantIds(currentProjects, projectId)];
      // Soft-delete tasks in affected projects
      currentTasks.forEach(task => {
        if (allIds.includes(task.projectId || '')) {
          const existing = taskRecordsRef.current?.find(r => r.recordId === task.id);
          if (existing) {
            putTask(task.id, {
              ...existing.data,
              Deleted: 1,
              DeletedAt: Date.now(),
              ProjectId: null,
            });
          }
        }
      });
      allIds.forEach(id => removeProject(id));
    },
    [putTask, removeProject]
  );

  const reorderProject = useCallback(
    (projectId: string, targetProjectId: string, position: 'before' | 'after' | 'inside') => {
      const currentProjects = projectsRef.current;
      const project = currentProjects.find(p => p.id === projectId);
      const target = currentProjects.find(p => p.id === targetProjectId);
      if (!project || !target) return false;

      let newParentId = target.parentId;
      let newOrder = target.order;

      if (position === 'inside') {
        if (wouldCreateCycle(currentProjects, projectId, targetProjectId)) return false;
        newParentId = targetProjectId;
        const children = currentProjects.filter(p => p.parentId === targetProjectId);
        newOrder = Math.max(0, ...children.map(p => p.order ?? 0)) + 1;
      } else {
        if (wouldCreateCycle(currentProjects, projectId, newParentId)) return false;
        newOrder = position === 'after' ? target.order + 0.5 : target.order - 0.5;
      }

      const projectRecord = (projectRecordsRef.current || []).find(r => r.recordId === projectId);
      if (!projectRecord) return false;
      putProject(projectId, { ...projectRecord.data, ParentId: newParentId, Order: newOrder });

      const siblings = currentProjects
        .filter(p => p.parentId === newParentId)
        .map(p => ({
          id: p.id,
          order: p.id === projectId ? newOrder : p.order,
        }))
        .sort((a, b) => a.order - b.order);

      siblings.forEach((item, idx) => {
        const record = (projectRecordsRef.current || []).find(r => r.recordId === item.id);
        if (record && item.order !== idx + 1) {
          putProject(item.id, { ...record.data, Order: idx + 1 });
        }
      });

      return true;
    },
    [putProject]
  );

  // ── CRUD: Tags ────────────────────────────────────

  const addTag = useCallback(
    async (tagData: Partial<Tag>) => {
      const data: TagRecord = {
        TeamId: teamId,
        Name: tagData.name || '',
        Color: tagData.color || '#007AFF',
        CreatedAt: Date.now(),
      };
      const recordId = await createTag(data);
      return {
        id: recordId,
        name: data.Name,
        color: data.Color,
        createdAt: data.CreatedAt,
      } as Tag;
    },
    [createTag, teamId]
  );

  const deleteTag = useCallback(
    (tagId: string) => {
      const currentTasks = tasksRef.current;
      currentTasks.forEach(task => {
        if (task.tagIds.includes(tagId)) {
          const record = (taskRecordsRef.current || []).find(r => r.recordId === task.id);
          if (record) {
            putTask(task.id, {
              ...record.data,
              TagIds: (record.data.TagIds || []).filter((id: string) => id !== tagId),
            });
          }
        }
      });
      removeTag(tagId);
    },
    [putTask, removeTag]
  );

  const addTagToTask = useCallback(
    (taskId: string, tagId: string) => {
      const existing = (taskRecordsRef.current || []).find(r => r.recordId === taskId);
      if (!existing) return;
      const currentTagIds: string[] = existing.data.TagIds || [];
      if (currentTagIds.includes(tagId)) return;
      putTask(taskId, { ...existing.data, TagIds: [...currentTagIds, tagId] });
    },
    [putTask]
  );

  const removeTagFromTask = useCallback(
    (taskId: string, tagId: string) => {
      const existing = (taskRecordsRef.current || []).find(r => r.recordId === taskId);
      if (!existing) return;
      const currentTagIds: string[] = existing.data.TagIds || [];
      putTask(taskId, { ...existing.data, TagIds: currentTagIds.filter(id => id !== tagId) });
    },
    [putTask]
  );

  return {
    // Status
    isLoading,
    // Data
    tasks,
    projects,
    tags,
    // Derived
    taskCounts,
    tasksByUser,
    tasksByProject,
    unassignedTasksCount,
    projectTree,
    // Task CRUD
    addTask,
    updateTask,
    deleteTask,
    restoreTask,
    permanentDeleteTask,
    completeTask,
    moveTask,
    reorderTask,
    getTasksForView,
    // Project CRUD
    addProject,
    updateProject,
    deleteProject,
    reorderProject,
    // Tag CRUD
    addTag,
    deleteTag,
    addTagToTask,
    removeTagFromTask,
  };
}
