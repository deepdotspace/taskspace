/**
 * Things-like Task Manager — Main Page
 * Ported from previous_task_widget/template.jsx
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useUser, useUserLookup } from '@spaces/sdk/storage';

// Components
import Sidebar from '../components/Sidebar';
import TaskList from '../components/TaskList';
import ViewHeader from '../components/ViewHeader';
import Toolbar from '../components/Toolbar';
import QuickAdd from '../components/QuickAdd';
import TaskDetail from '../components/TaskDetail';
import BulkActionBar from '../components/BulkActionBar';
import TeamSettings from '../components/TeamSettings';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import ConfirmModal from '../components/ConfirmModal';
import KanbanBoard from '../components/KanbanBoard';

// Hooks
import {
  useTaskData,
  useTaskSelection,
  useMouseDragResize,
  useTaskHotkeys,
  useDragDrop,
  useBodyBackground,
} from '../hooks';
import { useIsMobile } from '@spaces/sdk/mobile';

// Utils
import { Icon } from '../utils/icons';
import { toggleNullableMultiSelect } from '../utils/toggleNullableMultiSelect';
import { computeDisplayedTasks } from '../utils/computeDisplayedTasks';
import { styles } from '../utils/styles';

// Constants
import {
  VIEWS,
  TAG_COLORS,
  ALL_KANBAN_STATUS_IDS,
  ViewType,
  ViewState,
  WidgetUser,
  Task,
  getUserColor,
} from '../constants';

// ── Team types (mirroring SDK) ────────────────────
interface TeamMember {
  userId: string;
  roleInTeam: string;
  joinedAt: string;
  status?: string;   // 'active' | 'pending'
  email?: string;    // present for pending invites
}

interface Team {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  isOpen?: boolean;
  members?: TeamMember[];
}

/** Result from addMember — reflects the SDK's AddMemberResult */
interface AddMemberResult {
  status: 'added' | 'invited' | 'already_member' | 'error';
  /** Resolved userId (set when user was found and added) */
  userId?: string;
  /** Email used for pending invite */
  email?: string;
  /** Error message if status is 'error' */
  error?: string;
}

interface HomePageProps {
  teamId: string;
  teams: Team[];
  onSelectTeam: (teamId: string) => void;
  onAddMember?: (teamId: string, member: string | { email: string } | { username: string }, roleOrOptions?: string | { roleInTeam?: string; sendEmail?: boolean; teamName?: string }) => Promise<AddMemberResult>;
  onRemoveMember?: (teamId: string, userId: string) => void;
  onCancelInvite?: (teamId: string, inviteId: string) => void;
  onDeleteTeam?: (teamId: string) => void;
  onCreateTeam: () => void;
  onJoinTeam: () => void;
  onReady?: () => void;
}

export default function HomePage({ teamId, teams, onSelectTeam, onAddMember, onRemoveMember, onCancelInvite, onDeleteTeam, onCreateTeam, onJoinTeam, onReady }: HomePageProps) {

  // Ensure white background covers full scrollable area in iframe
  useBodyBackground('#ffffff');

  // ── Platform hooks ──────────────────────────────────
  const { user: platformUser, isLoading: userLoading } = useUser();
  const { getUser } = useUserLookup();

  // Map platform user → WidgetUser shape
  const currentUser: WidgetUser | null = useMemo(() => {
    if (!platformUser) return null;
    const userId = platformUser.id || '';
    return {
      id: userId,
      name: platformUser.name || 'Unknown',
      email: platformUser.email || '',
      imageUrl: platformUser.imageUrl || '',
      color: getUserColor(userId),
      role: platformUser.role || 'member',
    };
  }, [platformUser]);

  // ── Active team + team members ─────────────────────
  const activeTeam = useMemo(() => {
    return teams.find(t => t.id === teamId) || null;
  }, [teams, teamId]);

  // Cache emails for members not yet in useUserLookup (haven't visited the room).
  // Populated when addMember resolves so we can show email instead of "Unknown".
  const [memberEmailCache, setMemberEmailCache] = useState<Record<string, string>>({});

  // Wrap onAddMember to capture the resolved email for display purposes
  const wrappedAddMember = useCallback(async (
    tId: string,
    member: string | { email: string } | { username: string },
    roleOrOptions?: string | { roleInTeam?: string; sendEmail?: boolean; teamName?: string },
  ): Promise<AddMemberResult> => {
    if (!onAddMember) return { status: 'error', error: 'Add member not available' };
    const result = await onAddMember(tId, member, roleOrOptions);
    // Cache the email so we can display it for members not yet in the room
    if (result.status === 'added' && result.userId) {
      const email = result.email
        || (typeof member === 'object' && 'email' in member ? member.email : undefined);
      if (email) {
        setMemberEmailCache(prev => ({ ...prev, [result.userId!]: email }));
      }
    }
    return result;
  }, [onAddMember]);

  // Derive team members as WidgetUser[] from team.members + useUserLookup
  // Includes both active and pending (invited) members.
  // Falls back to cached email for members who haven't visited the room yet.
  const allUsers: WidgetUser[] = useMemo(() => {
    if (!activeTeam?.members) return currentUser ? [currentUser] : [];
    return activeTeam.members.map(m => {
      const isPending = m.status === 'pending';
      const userInfo = isPending ? null : getUser(m.userId);
      const cachedEmail = memberEmailCache[m.userId];
      return {
        id: m.userId,
        name: isPending
          ? (m.email || 'Invited User')
          : (userInfo?.name || cachedEmail || 'Unknown'),
        email: isPending
          ? (m.email || '')
          : (userInfo?.email || cachedEmail || ''),
        imageUrl: isPending ? '' : (userInfo?.imageUrl || ''),
        color: getUserColor(m.userId),
        role: m.roleInTeam || 'member',
        isPending,
      };
    });
  }, [activeTeam, getUser, currentUser, memberEmailCache]);

  // Helper to display user name
  const getDisplayName = useCallback((user: WidgetUser | null) => {
    if (!user) return 'Unknown';
    return user.name || user.email || 'Unknown';
  }, []);

  // Check if user is read-only (viewer role)
  const isReadOnly = !platformUser || platformUser.role === 'viewer';

  // ── Task data hook (collections) ──────────────────
  const {
    isLoading: dataLoading,
    tasks,
    projects,
    tags,
    taskCounts,
    tasksByUser,
    tasksByProject,
    unassignedTasksCount,
    projectTree,
    addTask,
    updateTask,
    deleteTask,
    restoreTask,
    permanentDeleteTask,
    completeTask,
    moveTask,
    reorderTask,
    getTasksForView,
    addProject,
    updateProject,
    deleteProject,
    reorderProject,
    addTag,
    deleteTag,
    addTagToTask,
    removeTagFromTask,
  } = useTaskData(currentUser, teamId);

  // Use team members directly — no longer merging in task-only (removed) users,
  // because removing a member also unassigns their tasks (see handleRemoveMember).
  const mergedAllUsers = allUsers;

  // ── Refs for stable callbacks ──────────────────────
  // Read from refs inside useCallback so `tasks` / `selectedTask` don't appear
  // in dependency arrays, keeping callbacks referentially stable.
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // When the owner removes a member, unassign all their tasks first so the
  // removed user disappears completely from the UI.
  const handleRemoveMember = useCallback((tId: string, userId: string) => {
    // 1. Unassign every task that belongs to this user
    (tasksRef.current || []).forEach(task => {
      if (task.assignedUser?.id === userId) {
        updateTask(task.id, { assignedUser: null, assignedBy: null });
      }
    });
    // 2. Then remove from the team
    onRemoveMember?.(tId, userId);
  }, [updateTask, onRemoveMember]);

  // When the owner cancels a pending invite, also unassign any tasks that
  // may have been pre-assigned to the invited user.
  const handleCancelInvite = useCallback((tId: string, inviteId: string) => {
    // Unassign tasks where the assignedUser ID matches the invite ID
    (tasksRef.current || []).forEach(task => {
      if (task.assignedUser?.id === inviteId) {
        updateTask(task.id, { assignedUser: null, assignedBy: null });
      }
    });
    onCancelInvite?.(tId, inviteId);
  }, [updateTask, onCancelInvite]);

  // ── Mobile detection ─────────────────────────────
  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleMobileSidebarOpen = useCallback(() => setMobileSidebarOpen(true), []);
  const handleMobileSidebarClose = useCallback(() => setMobileSidebarOpen(false), []);

  // ── UI State ──────────────────────────────────────
  const [currentView, setCurrentView] = useState<ViewState>({ type: VIEWS.ALL });
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#007AFF');
  const [newProjectParentId, setNewProjectParentId] = useState<string | null>(null);
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState<{
    id: string; title: string; taskCount: number; childCount: number;
  } | null>(null);
  const [editProjectModal, setEditProjectModal] = useState<{
    id: string; title: string; color: string; totalTaskCount?: number; childCount?: number;
  } | null>(null);
  const [editProjectTitle, setEditProjectTitle] = useState('');
  const [editProjectColor, setEditProjectColor] = useState('#007AFF');
  const [teamSettingsOpen, setTeamSettingsOpen] = useState(false);

  // Delete confirmation modal state
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'permanentDelete' | null;
    count: number;
    taskIds: string[];
    taskTitle: string | null;
  }>({ isOpen: false, type: null, count: 0, taskIds: [], taskTitle: null });

  // Sort & Filter State
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(true);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[] | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[] | null>(null);
  const [selectedKanbanStatuses, setSelectedKanbanStatuses] = useState<string[] | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[] | null>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isResizeHovered, setIsResizeHovered] = useState(false);
  const [showReadOnlyBanner, setShowReadOnlyBanner] = useState(true);
  const [isDetailResizeHovered, setIsDetailResizeHovered] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  // ── Clear sort callback ───────────────────────────
  const clearSort = useCallback(() => {
    setSortBy(null);
    setSortDirection('asc');
  }, []);

  // ── View change ──────────────────────────────────
  const handleViewChange = useCallback((newView: ViewState) => {
    setCurrentView(newView);
    if (newView.type === VIEWS.ALL) {
      setSelectedProjectIds(null);
      setSelectedTagIds(null);
      setSelectedUserIds(null);
    }
    setShowSortDropdown(false);
    setShowFilterDropdown(false);
  }, []);

  // ── Displayed tasks ──────────────────────────────
  const displayedTasks = useMemo(() => {
    return computeDisplayedTasks({
      currentView,
      getTasksForView,
      showCompleted,
      showUnassigned,
      selectedProjectIds,
      selectedTagIds,
      selectedKanbanStatuses,
      selectedUserIds,
      searchQuery,
      sortBy,
      sortDirection,
    });
  }, [
    currentView, getTasksForView, showCompleted, showUnassigned,
    selectedProjectIds, selectedTagIds, selectedKanbanStatuses, selectedUserIds,
    searchQuery, sortBy, sortDirection,
  ]);

  // Board view always includes completed tasks so the Done column isn't empty
  const boardDisplayedTasks = useMemo(() => {
    return computeDisplayedTasks({
      currentView,
      getTasksForView,
      showCompleted: true,
      showUnassigned,
      selectedProjectIds,
      selectedTagIds,
      selectedKanbanStatuses,
      selectedUserIds,
      searchQuery,
      sortBy,
      sortDirection,
    });
  }, [
    currentView, getTasksForView, showUnassigned,
    selectedProjectIds, selectedTagIds, selectedKanbanStatuses, selectedUserIds,
    searchQuery, sortBy, sortDirection,
  ]);

  const displayedTaskCounts = useMemo(() => {
    const completed = displayedTasks.filter((t: Task) => t.completed).length;
    const uncompleted = displayedTasks.filter((t: Task) => !t.completed).length;
    return { completed, uncompleted, total: displayedTasks.length };
  }, [displayedTasks]);

  // ── Multi-selection (must come before useDragDrop so selectedTaskIds is current) ──
  const {
    selectedTaskIds,
    setSelectedTaskIds,
    setLastClickedTaskId,
    selectedTasks,
    selectedTask,
    clearSelection,
    handleSelectTask,
  } = useTaskSelection(tasks, displayedTasks);

  // ── View mode handler (clears selection when switching) ──
  const handleViewModeChange = useCallback((mode: 'list' | 'board') => {
    setViewMode(mode);
    clearSelection();
  }, [clearSelection]);

  // ── Drag & drop (clears sort on reorder) ─────────
  const { draggedItem, dragOverItem, handlers: dragHandlers } = useDragDrop(
    tasks,
    reorderTask,
    clearSort,
    selectedTaskIds
  );

  // ── Sidebar & Detail resize ──────────────────────
  const sidebarResize = useMouseDragResize({
    initialWidth: 260,
    minWidth: 180,
    maxWidth: 400,
    getNextWidth: (e: MouseEvent) => e.clientX,
  });

  const detailResize = useMouseDragResize({
    initialWidth: 340,
    getNextWidth: (e: MouseEvent) => window.innerWidth - e.clientX,
    getMinWidth: () => window.innerWidth * 0.2,
    getMaxWidth: () => window.innerWidth * 0.5,
  });

  // ── Sort / Filter handlers ───────────────────────
  const handleSort = useCallback((type: string | null, direction?: string) => {
    setSortBy(type);
    setSortDirection((direction as 'asc' | 'desc') || 'asc');
  }, []);

  // Helper: get all descendant IDs of a project (for cascading filter)
  const getDescendantIds = useCallback((projectId: string): string[] => {
    const ids: string[] = [];
    const walk = (nodes: typeof projectTree) => {
      for (const node of nodes) {
        if (node.id === projectId) {
          // Found the root — collect all children recursively
          const collectAll = (n: typeof node) => {
            (n.children || []).forEach(child => {
              ids.push(child.id);
              collectAll(child);
            });
          };
          collectAll(node);
          return true;
        }
        if (node.children && walk(node.children)) return true;
      }
      return false;
    };
    walk(projectTree || []);
    return ids;
  }, [projectTree]);

  const handleToggleProject = useCallback((projectId: string) => {
    const descendantIds = getDescendantIds(projectId);
    const allRelated = [projectId, ...descendantIds];

    setSelectedProjectIds(prev => {
      const allIds = (projects || []).map(p => p.id);

      if (prev === null) {
        const remaining = allIds.filter(id => !allRelated.includes(id));
        return remaining;
      }

      const isCurrentlySelected = prev.includes(projectId);

      if (isCurrentlySelected) {
        return prev.filter(id => !allRelated.includes(id));
      } else {
        const merged = new Set([...prev, ...allRelated]);
        if (merged.size >= allIds.length) return null;
        return Array.from(merged);
      }
    });
  }, [projects, getDescendantIds]);

  const handleToggleTag = useCallback((tagId: string) => {
    setSelectedTagIds(prev =>
      toggleNullableMultiSelect(prev, (tags || []).map(t => t.id), tagId)
    );
  }, [tags]);

  const handleSelectAllProjects = useCallback(() => setSelectedProjectIds(null), []);
  const handleSelectAllTags = useCallback(() => setSelectedTagIds(null), []);

  const handleToggleKanbanStatus = useCallback((statusId: string) => {
    setSelectedKanbanStatuses(prev =>
      toggleNullableMultiSelect(prev, ALL_KANBAN_STATUS_IDS, statusId)
    );
  }, []);

  const handleSelectAllKanbanStatuses = useCallback(() => setSelectedKanbanStatuses(null), []);

  const handleToggleUser = useCallback((userId: string) => {
    setSelectedUserIds(prev =>
      toggleNullableMultiSelect(prev, (mergedAllUsers || []).map(u => u.id), userId)
    );
  }, [mergedAllUsers]);

  const handleSelectAllUsers = useCallback(() => setSelectedUserIds(null), []);

  const handleResetFilters = useCallback(() => {
    setShowCompleted(false);
    setShowUnassigned(true);
    setSelectedProjectIds(null);
    setSelectedTagIds(null);
    setSelectedKanbanStatuses(null);
    setSelectedUserIds(null);
  }, []);

  // ── Current project / user for header ────────────
  const currentProject = currentView.type === VIEWS.PROJECT
    ? projects?.find(p => p.id === currentView.id) : null;

  const currentUserForView = useMemo(() => {
    if (currentView.type !== VIEWS.USER || currentView.id === 'unassigned') return null;
    return mergedAllUsers.find(u => u.id === currentView.id) || null;
  }, [currentView.type, currentView.id, mergedAllUsers]);

  // ── Quick add ────────────────────────────────────
  const handleQuickAdd = useCallback(async (taskData: Partial<Task>) => {
    const today = new Date().toISOString().split('T')[0];
    const assignedUserData = currentUserForView ? {
      id: currentUserForView.id,
      name: currentUserForView.name,
      email: currentUserForView.email,
      color: currentUserForView.color,
    } : null;

    const newTask = await addTask({
      ...taskData,
      dueDate: currentView.type === VIEWS.TODAY ? today : null,
      projectId: currentView.type === VIEWS.PROJECT ? (currentView.id || null) : null,
      assignedUser: assignedUserData,
    });

    if (newTask) {
      setSelectedTaskIds([newTask.id]);
      setLastClickedTaskId(newTask.id);
    }
  }, [currentView, addTask, currentUserForView, setSelectedTaskIds, setLastClickedTaskId]);

  // ── Project management ───────────────────────────
  const handleAddProject = useCallback((parentId: string | null = null) => {
    setNewProjectParentId(parentId);
    setNewProjectName('');
    if (parentId) {
      const parentProject = projects?.find(p => p.id === parentId);
      setNewProjectColor(parentProject?.color || '#007AFF');
    } else {
      setNewProjectColor('#007AFF');
    }
    setShowNewProjectInput(true);
  }, [projects]);

  const handleSaveNewProject = useCallback(async () => {
    if (newProjectName.trim()) {
      const project = await addProject({
        title: newProjectName.trim(),
        parentId: newProjectParentId,
        color: newProjectColor,
      });
      setNewProjectName('');
      setNewProjectColor('#007AFF');
      setShowNewProjectInput(false);
      setNewProjectParentId(null);
      if (project) setCurrentView({ type: VIEWS.PROJECT, id: project.id });
    }
  }, [newProjectName, newProjectParentId, newProjectColor, addProject]);

  const handleEditProject = useCallback((projectInfo: { id: string; title: string; color: string }) => {
    setEditProjectModal(projectInfo);
    setEditProjectTitle(projectInfo.title || '');
    setEditProjectColor(projectInfo.color || '#007AFF');
  }, []);

  const handleSaveEditProject = useCallback(() => {
    if (!editProjectModal || !editProjectTitle.trim()) return;
    updateProject(editProjectModal.id, {
      title: editProjectTitle.trim(),
      color: editProjectColor,
    });
    setEditProjectModal(null);
    setEditProjectTitle('');
    setEditProjectColor('#007AFF');
  }, [editProjectModal, editProjectTitle, editProjectColor, updateProject]);

  const handleDeleteFromEdit = useCallback(() => {
    if (!editProjectModal) return;
    setDeleteProjectConfirm({
      id: editProjectModal.id,
      title: editProjectModal.title,
      taskCount: editProjectModal.totalTaskCount || 0,
      childCount: editProjectModal.childCount || 0,
    });
    setEditProjectModal(null);
  }, [editProjectModal]);

  const confirmDeleteProject = useCallback(() => {
    if (!deleteProjectConfirm) return;
    if (currentView.type === VIEWS.PROJECT && currentView.id === deleteProjectConfirm.id) {
      setCurrentView({ type: VIEWS.ALL });
    }
    deleteProject(deleteProjectConfirm.id);
    setDeleteProjectConfirm(null);
  }, [currentView, deleteProject, deleteProjectConfirm]);

  // ── Bulk operations ──────────────────────────────
  const handleBulkDelete = useCallback(() => {
    if (selectedTaskIds.length === 0) return;
    setDeleteConfirmModal({
      isOpen: true, type: 'delete',
      count: selectedTaskIds.length, taskIds: [...selectedTaskIds], taskTitle: null,
    });
  }, [selectedTaskIds]);

  const handleBulkRestore = useCallback(() => {
    if (selectedTaskIds.length === 0) return;
    selectedTaskIds.forEach(id => restoreTask(id));
    clearSelection();
  }, [selectedTaskIds, restoreTask, clearSelection]);

  const handleBulkPermanentDelete = useCallback(() => {
    if (selectedTaskIds.length === 0) return;
    setDeleteConfirmModal({
      isOpen: true, type: 'permanentDelete',
      count: selectedTaskIds.length, taskIds: [...selectedTaskIds], taskTitle: null,
    });
  }, [selectedTaskIds]);

  const handleSinglePermanentDelete = useCallback((taskId: string, taskTitle: string) => {
    setDeleteConfirmModal({
      isOpen: true, type: 'permanentDelete',
      count: 1, taskIds: [taskId], taskTitle: taskTitle || 'this task',
    });
  }, []);

  const confirmDeleteAction = useCallback(() => {
    const { type, taskIds } = deleteConfirmModal;
    if (type === 'delete') {
      taskIds.forEach(id => deleteTask(id));
    } else if (type === 'permanentDelete') {
      taskIds.forEach(id => permanentDeleteTask(id));
    }
    clearSelection();
    setDeleteConfirmModal({ isOpen: false, type: null, count: 0, taskIds: [], taskTitle: null });
  }, [deleteConfirmModal, deleteTask, permanentDeleteTask, clearSelection]);

  const cancelDeleteAction = useCallback(() => {
    setDeleteConfirmModal({ isOpen: false, type: null, count: 0, taskIds: [], taskTitle: null });
  }, []);

  const handleBulkComplete = useCallback(() => {
    selectedTaskIds.forEach(id => completeTask(id));
    clearSelection();
  }, [selectedTaskIds, completeTask, clearSelection]);

  const handleBulkUncomplete = useCallback(() => {
    selectedTaskIds.forEach(id => updateTask(id, { completed: false, completedAt: null }));
    clearSelection();
  }, [selectedTaskIds, updateTask, clearSelection]);

  const handleTaskDropOnProject = useCallback((taskId: string, projectId: string | null) => {
    if (selectedTaskIds.includes(taskId) && selectedTaskIds.length > 1) {
      selectedTaskIds.forEach(id => moveTask(id, { projectId }));
      clearSelection();
    } else {
      moveTask(taskId, { projectId });
    }
  }, [moveTask, selectedTaskIds, clearSelection]);

  const handleTaskDropOnUser = useCallback((taskId: string, userId: string | null) => {
    const tasksToUpdate = selectedTaskIds.includes(taskId) && selectedTaskIds.length > 1
      ? selectedTaskIds : [taskId];

    if (userId === null) {
      tasksToUpdate.forEach(id => {
        updateTask(id, { assignedUser: null, assignedBy: null });
      });
    } else {
      const targetUser = mergedAllUsers.find(u => u.id === userId);
      if (!targetUser) return;
      const assignedUserData = {
        id: targetUser.id, name: targetUser.name,
        email: targetUser.email, color: targetUser.color,
      };
      const assignerData = currentUser ? {
        id: currentUser.id, name: currentUser.name,
        email: currentUser.email, color: currentUser.color,
      } : null;
      tasksToUpdate.forEach(id => {
        updateTask(id, { assignedUser: assignedUserData, assignedBy: assignerData });
      });
    }
    if (tasksToUpdate.length > 1) clearSelection();
  }, [mergedAllUsers, currentUser, updateTask, selectedTaskIds, clearSelection]);

  // ── Keyboard shortcuts ───────────────────────────
  useTaskHotkeys({
    selectedTaskIds,
    displayedTasks,
    clearSelection,
    setSelectedTaskIds,
    onDeleteSelected: handleBulkDelete,
  });

  // ── View helpers ─────────────────────────────────
  const getPlaceholder = () => {
    const names: Record<string, string> = {
      [VIEWS.ALL]: 'Add a task...',
      [VIEWS.TODAY]: 'Add to today...',
      [VIEWS.UPCOMING]: 'Schedule a task...',
      [VIEWS.PROJECT]: `Add to ${currentProject?.title || 'project'}...`,
      [VIEWS.USER]: currentView.id === 'unassigned' ? 'Add task...' : `Add for ${getDisplayName(currentUserForView) || 'user'}...`,
    };
    return names[currentView.type] || 'New To-Do';
  };

  const getEmptyMessage = () => {
    const messages: Record<string, string> = {
      [VIEWS.ALL]: 'No tasks yet.\nCreate your first task!',
      [VIEWS.TODAY]: 'Nothing for today.\nEnjoy your free time!',
      [VIEWS.UPCOMING]: 'No upcoming tasks.',
      [VIEWS.LOGBOOK]: 'No completed tasks yet.',
      [VIEWS.TRASH]: 'Trash is empty.',
      [VIEWS.PROJECT]: `No tasks in ${currentProject?.title || 'this project'}.`,
      [VIEWS.USER]: currentView.id === 'unassigned' ? 'No unassigned tasks.' : `No tasks for ${currentUserForView?.name || 'user'}.`,
    };
    return messages[currentView.type] || 'No tasks';
  };

  const showProjectColumn = ([VIEWS.ALL, VIEWS.TODAY, VIEWS.UPCOMING, VIEWS.LOGBOOK, VIEWS.USER] as readonly ViewType[]).includes(currentView.type);

  // ── Extracted JSX callbacks (stable refs) ─────────
  // These were previously inline closures in JSX that defeated React.memo
  // on child components. Now they are useCallback-wrapped and referentially stable.

  const handleOpenTeamSettings = useCallback(() => {
    setTeamSettingsOpen(true);
    if (isMobile) setMobileSidebarOpen(false);
  }, [isMobile]);
  const handleCloseTeamSettings = useCallback(() => setTeamSettingsOpen(false), []);
  const handleCloseReadOnlyBanner = useCallback(() => setShowReadOnlyBanner(false), []);

  const handleToggleShowCompleted = useCallback(() => setShowCompleted(prev => !prev), []);
  const handleToggleShowUnassigned = useCallback(() => setShowUnassigned(prev => !prev), []);
  const handleToggleSortDropdown = useCallback(() => setShowSortDropdown(prev => !prev), []);
  const handleToggleFilterDropdown = useCallback(() => setShowFilterDropdown(prev => !prev), []);

  const handleUncomplete = useCallback((id: string) => {
    updateTask(id, { completed: false, completedAt: null });
  }, [updateTask]);

  /** Stable no-op for read-only board callbacks */
  const noop = useCallback(() => {}, []);

  const handleDeleteAndClear = useCallback((id: string) => {
    deleteTask(id);
    clearSelection();
  }, [deleteTask, clearSelection]);

  const handleRestoreAndClear = useCallback((id: string) => {
    restoreTask(id);
    clearSelection();
  }, [restoreTask, clearSelection]);

  const handlePermanentDeleteAndClear = useCallback((id: string) => {
    permanentDeleteTask(id);
    clearSelection();
  }, [permanentDeleteTask, clearSelection]);

  // Ref for selectedTask used inside the addProject-from-detail callback
  const selectedTaskRef = useRef(selectedTask);
  selectedTaskRef.current = selectedTask;

  const handleAddProjectFromDetail = useCallback((data: { title: string; color: string }) => {
    addProject(data).then(project => {
      if (project && selectedTaskRef.current) {
        updateTask(selectedTaskRef.current.id, { projectId: project.id });
      }
    });
    return null;
  }, [addProject, updateTask]);

  // ── Signal overlay dismissal when data is ready ──
  const readyFired = useRef(false);
  useEffect(() => {
    if (!userLoading && !dataLoading && !readyFired.current) {
      readyFired.current = true;
      onReady?.();
    }
  }, [userLoading, dataLoading, onReady]);

  if (userLoading || dataLoading) return null;

  // ── Render ───────────────────────────────────────
  return (
    <div data-app-container data-testid="app-container" style={{
      ...styles.container,
      cursor: (sidebarResize.isResizing || detailResize.isResizing) ? 'col-resize' : 'default',
    }}>
      {/* Mobile sidebar backdrop */}
      {isMobile && mobileSidebarOpen && (
        <div className="mobile-sidebar-backdrop" onClick={handleMobileSidebarClose} />
      )}

      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        taskCounts={taskCounts}
        projectTree={projectTree}
        projects={projects}
        tasksByProject={tasksByProject}
        tasksByUser={tasksByUser}
        tasks={tasks}
        unassignedTasksCount={unassignedTasksCount}
        onAddProject={isReadOnly ? undefined : handleAddProject}
        onReorderProject={isReadOnly ? undefined : reorderProject}
        onEditProject={isReadOnly ? undefined : handleEditProject}
        onTaskDrop={isReadOnly ? undefined : handleTaskDropOnProject}
        onTaskDropOnUser={isReadOnly ? undefined : handleTaskDropOnUser}
        onTaskDragEnd={isReadOnly ? undefined : dragHandlers.onDragEnd}
        allUsers={mergedAllUsers}
        currentUser={currentUser}
        onManageUsers={isReadOnly ? undefined : handleOpenTeamSettings}
        width={sidebarResize.width}
        getDisplayName={getDisplayName}
        isReadOnly={isReadOnly}
        teams={teams}
        selectedTeamId={teamId}
        onSelectTeam={onSelectTeam}
        onCreateTeam={onCreateTeam}
        onJoinTeam={onJoinTeam}
        onOpenSettings={handleOpenTeamSettings}
        isMobile={isMobile}
        isMobileOpen={mobileSidebarOpen}
        onMobileClose={handleMobileSidebarClose}
      />

      {/* Sidebar Resize Handle — hidden on mobile via CSS */}
      <div
        data-resize-handle
        onMouseDown={sidebarResize.startResize}
        onMouseEnter={() => setIsResizeHovered(true)}
        onMouseLeave={() => setIsResizeHovered(false)}
        style={styles.resizeHandle}
      >
        <div style={{
          ...styles.resizeHandleLine,
          ...((sidebarResize.isResizing || isResizeHovered) ? styles.resizeHandleLineActive : {}),
        }} />
      </div>

      <div style={styles.main}>
        {/* Task list and detail sidebar — contentWrapper is a flex row that spans full main height */}
        <div style={styles.contentWrapper}>
          <div style={styles.taskListArea}>
            {/* Read-Only Banner */}
            {isReadOnly && showReadOnlyBanner && (
              <ReadOnlyBanner onClose={handleCloseReadOnlyBanner} />
            )}

            <ViewHeader
              view={currentView}
              project={currentProject}
              user={currentUserForView}
              taskCount={displayedTasks.length}
              taskCountData={displayedTaskCounts}
              getDisplayName={getDisplayName}
              onMenuClick={handleMobileSidebarOpen}
            />

            <Toolbar
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={handleSort}
              showCompleted={showCompleted}
              onToggleShowCompleted={handleToggleShowCompleted}
              showUnassigned={showUnassigned}
              onToggleShowUnassigned={handleToggleShowUnassigned}
              availableProjects={projects || []}
              projectTree={projectTree}
              selectedProjectIds={selectedProjectIds}
              onToggleProject={handleToggleProject}
              onSelectAllProjects={handleSelectAllProjects}
              availableTags={tags || []}
              selectedTagIds={selectedTagIds}
              onToggleTag={handleToggleTag}
              onSelectAllTags={handleSelectAllTags}
              selectedKanbanStatuses={selectedKanbanStatuses}
              onToggleKanbanStatus={handleToggleKanbanStatus}
              onSelectAllKanbanStatuses={handleSelectAllKanbanStatuses}
              allUsers={mergedAllUsers}
              selectedUserIds={selectedUserIds}
              onToggleUser={handleToggleUser}
              onSelectAllUsers={handleSelectAllUsers}
              onResetFilters={handleResetFilters}
              isAllView={currentView.type === VIEWS.ALL}
              isProjectView={currentView.type === VIEWS.PROJECT}
              isUserView={currentView.type === VIEWS.USER}
              showSortDropdown={showSortDropdown}
              onToggleSortDropdown={handleToggleSortDropdown}
              showFilterDropdown={showFilterDropdown}
              onToggleFilterDropdown={handleToggleFilterDropdown}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              getDisplayName={getDisplayName}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />

            {/* ── List view ────────────────────────── */}
            {viewMode === 'list' && (
              <>
                {/* Bulk Action Bar */}
                {!isReadOnly && selectedTaskIds.length > 1 && (
                  <BulkActionBar
                    selectedCount={selectedTaskIds.length}
                    selectedTasks={selectedTasks}
                    onDelete={handleBulkDelete}
                    onRestore={handleBulkRestore}
                    onPermanentDelete={handleBulkPermanentDelete}
                    onComplete={handleBulkComplete}
                    onUncomplete={handleBulkUncomplete}
                    onClearSelection={clearSelection}
                    isTrashView={currentView.type === VIEWS.TRASH}
                  />
                )}
                <TaskList
                  tasks={displayedTasks}
                  projects={projects}
                  tags={tags}
                  onComplete={isReadOnly ? undefined : completeTask}
                  onUncomplete={isReadOnly ? undefined : handleUncomplete}
                  onSelect={handleSelectTask}
                  onUpdate={isReadOnly ? undefined : updateTask}
                  onRestore={isReadOnly ? undefined : (currentView.type === VIEWS.TRASH ? restoreTask : undefined)}
                  onPermanentDelete={isReadOnly ? undefined : (currentView.type === VIEWS.TRASH ? handleSinglePermanentDelete : undefined)}
                  selectedTaskIds={selectedTaskIds}
                  showProject={showProjectColumn}
                  currentViewProjectId={currentView.type === VIEWS.PROJECT ? (currentView.id || null) : null}
                  emptyMessage={getEmptyMessage()}
                  groupByDate={currentView.type === VIEWS.UPCOMING}
                  draggedItem={draggedItem || null}
                  dragOverItem={dragOverItem || null}
                  dragHandlers={isReadOnly ? {} : dragHandlers}
                  getDisplayName={getDisplayName}
                  allUsers={mergedAllUsers}
                  isReadOnly={isReadOnly}
                />

                {!isReadOnly && currentView.type !== VIEWS.LOGBOOK && currentView.type !== VIEWS.TRASH && (
                  <QuickAdd onAdd={handleQuickAdd} placeholder={getPlaceholder()} />
                )}
              </>
            )}

            {/* ── Board (Kanban) view ────────────────── */}
            {viewMode === 'board' && (
              <KanbanBoard
                tasks={boardDisplayedTasks}
                projects={projects || []}
                onUpdateTask={isReadOnly ? noop : updateTask}
                onCompleteTask={isReadOnly ? noop : completeTask}
                isReadOnly={isReadOnly}
              />
            )}
          </div>

          {viewMode === 'list' && selectedTask && (
            <>
              {/* Mobile detail backdrop */}
              {isMobile && <div className="mobile-detail-backdrop" onClick={clearSelection} />}
              {/* Detail Sidebar Resize Handle — hidden on mobile via CSS */}
              <div
                data-resize-handle
                onMouseDown={detailResize.startResize}
                onMouseEnter={() => setIsDetailResizeHovered(true)}
                onMouseLeave={() => setIsDetailResizeHovered(false)}
                style={styles.detailResizeHandle}
              >
                <div style={{
                  ...styles.detailResizeHandleLine,
                  ...((detailResize.isResizing || isDetailResizeHovered) ? styles.detailResizeHandleLineActive : {}),
                }} />
              </div>
              <TaskDetail
                task={selectedTask}
                projects={projects}
                allUsers={mergedAllUsers}
                tags={tags}
                onUpdate={isReadOnly ? undefined : updateTask}
                onDelete={isReadOnly ? undefined : handleDeleteAndClear}
                onRestore={isReadOnly ? undefined : handleRestoreAndClear}
                onPermanentDelete={isReadOnly ? undefined : handlePermanentDeleteAndClear}
                onClose={clearSelection}
                onAddProject={isReadOnly ? undefined : handleAddProjectFromDetail}
                onAddTag={isReadOnly ? undefined : addTag}
                onDeleteTag={isReadOnly ? undefined : deleteTag}
                onAddTagToTask={isReadOnly ? undefined : addTagToTask}
                onRemoveTagFromTask={isReadOnly ? undefined : removeTagFromTask}
                getDisplayName={getDisplayName}
                isReadOnly={isReadOnly}
                width={isMobile ? window.innerWidth : detailResize.width}
                isMobile={isMobile}
              />
            </>
          )}
        </div>
        </div>
        
      {/* New Project Modal */}
      {showNewProjectInput && (
        <div style={styles.modal} onClick={() => setShowNewProjectInput(false)}>
          <div data-modal-content style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>New Project</h3>
              <button onClick={() => setShowNewProjectInput(false)} style={styles.modalClose}>
                <Icon name="x" size={18} color="#8E8E93" />
              </button>
            </div>
            {newProjectParentId && (
              <div style={styles.modalSubtitle}>
                Inside: {projects?.find(p => p.id === newProjectParentId)?.title || 'project'}
              </div>
            )}
            <input
              type="text"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newProjectName.trim()) handleSaveNewProject();
                if (e.key === 'Escape') setShowNewProjectInput(false);
              }}
              placeholder="Project name"
              style={styles.modalInput}
              autoFocus
            />
            <div style={styles.colorPickerSection}>
              <span style={styles.colorPickerLabel}>Color</span>
              <div style={styles.colorPickerRow}>
                {TAG_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewProjectColor(color)}
                    style={{
                      ...styles.colorOption,
                      backgroundColor: color,
                      ...(newProjectColor === color ? styles.colorOptionSelected : {}),
                    }}
                  />
                ))}
              </div>
              </div>
            <div style={styles.modalActions}>
              <button onClick={() => setShowNewProjectInput(false)} style={styles.btnCancel}>Cancel</button>
              <button
                onClick={handleSaveNewProject}
                style={{ ...styles.btnSave, opacity: newProjectName.trim() ? 1 : 0.5 }}
                disabled={!newProjectName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editProjectModal && (
        <div style={styles.modal} onClick={() => setEditProjectModal(null)}>
          <div data-modal-content style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Edit Project</h3>
              <button onClick={() => setEditProjectModal(null)} style={styles.modalClose}>
                <Icon name="x" size={18} color="#8E8E93" />
              </button>
            </div>
            <input
              type="text"
              value={editProjectTitle}
              onChange={e => setEditProjectTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && editProjectTitle.trim()) handleSaveEditProject();
                if (e.key === 'Escape') setEditProjectModal(null);
              }}
              placeholder="Project name"
              style={styles.modalInput}
              autoFocus
            />
            <div style={styles.colorPickerSection}>
              <span style={styles.colorPickerLabel}>Color</span>
              <div style={styles.colorPickerRow}>
                {TAG_COLORS.map(color => (
            <button
                    key={color}
                    onClick={() => setEditProjectColor(color)}
                    style={{
                      ...styles.colorOption,
                      backgroundColor: color,
                      ...(editProjectColor === color ? styles.colorOptionSelected : {}),
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={styles.editModalActions}>
              <button onClick={handleDeleteFromEdit} style={styles.btnDeleteText}>
                <Icon name="trash-2" size={14} color="#FF3B30" />
                Delete Project
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditProjectModal(null)} style={styles.btnCancel}>Cancel</button>
                  <button
                  onClick={handleSaveEditProject}
                  style={{ ...styles.btnSave, opacity: editProjectTitle.trim() ? 1 : 0.5 }}
                  disabled={!editProjectTitle.trim()}
                >
                  Save
                  </button>
              </div>
                    </div>
                    </div>
                  </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {deleteProjectConfirm && (
        <div style={styles.modal} onClick={() => setDeleteProjectConfirm(null)}>
          <div data-modal-content style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Delete Project</h3>
              <button onClick={() => setDeleteProjectConfirm(null)} style={styles.modalClose}>
                <Icon name="x" size={18} color="#8E8E93" />
                  </button>
                </div>
            <div style={styles.deleteModalBody}>
              <div style={styles.deleteWarningIcon}>
                <Icon name="alert-triangle" size={32} color="#FF3B30" />
              </div>
              <p style={styles.deleteModalText}>
                Are you sure you want to delete <strong>"{deleteProjectConfirm.title}"</strong>?
              </p>
              {(deleteProjectConfirm.taskCount > 0 || deleteProjectConfirm.childCount > 0) && (
                <p style={styles.deleteModalWarning}>
                  This will also delete{' '}
                  {deleteProjectConfirm.taskCount > 0 && (
                    <span>{deleteProjectConfirm.taskCount} task{deleteProjectConfirm.taskCount > 1 ? 's' : ''}</span>
                  )}
                  {deleteProjectConfirm.taskCount > 0 && deleteProjectConfirm.childCount > 0 && ' and '}
                  {deleteProjectConfirm.childCount > 0 && (
                    <span>{deleteProjectConfirm.childCount} sub-project{deleteProjectConfirm.childCount > 1 ? 's' : ''}</span>
                  )}
                  .
                </p>
          )}
        </div>
            <div style={styles.modalActions}>
              <button onClick={() => setDeleteProjectConfirm(null)} style={styles.btnCancel}>Cancel</button>
              <button onClick={confirmDeleteProject} style={styles.btnDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Team Settings Modal — only show actual team members, not former members from tasks */}
      {activeTeam && (
        <TeamSettings
          isOpen={teamSettingsOpen}
          onClose={handleCloseTeamSettings}
          team={activeTeam}
          currentUser={currentUser}
          teamMembers={allUsers}
          onAddMember={wrappedAddMember}
          onRemoveMember={handleRemoveMember}
          onCancelInvite={handleCancelInvite}
          onDeleteTeam={onDeleteTeam}
          getDisplayName={getDisplayName}
        />
      )}


      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        title={deleteConfirmModal.type === 'permanentDelete' ? 'Permanently Delete' : 'Delete Task'}
        message={
          deleteConfirmModal.type === 'permanentDelete' ? (
            deleteConfirmModal.taskTitle ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ margin: 0, fontSize: '15px', color: '#1D1D1F' }}>
                  Permanently delete "<strong>{deleteConfirmModal.taskTitle}</strong>"?
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
                  This action cannot be undone.
                </p>
      </div>
            ) : (
              `Are you sure you want to permanently delete ${deleteConfirmModal.count} task${deleteConfirmModal.count > 1 ? 's' : ''}? This action cannot be undone.`
            )
          ) : (
            `Are you sure you want to delete ${deleteConfirmModal.count} task${deleteConfirmModal.count > 1 ? 's' : ''}?`
          )
        }
        confirmLabel={deleteConfirmModal.type === 'permanentDelete' ? 'Delete Forever' : 'Delete'}
        cancelLabel="Cancel"
        confirmStyle="danger"
        onConfirm={confirmDeleteAction}
        onCancel={cancelDeleteAction}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }
        [data-lucide] { stroke-width: 1.75; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
