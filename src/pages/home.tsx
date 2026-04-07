/**
 * Things-like Task Manager — Main Page
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { AuthOverlay, useUser, useUsers } from 'deepspace';

// Components
import Sidebar from '../components/Sidebar';
import TaskList from '../components/TaskList';
import ViewHeader from '../components/ViewHeader';
import Toolbar from '../components/Toolbar';
import QuickAdd from '../components/QuickAdd';
import TaskDetail from '../components/TaskDetail';
import BulkActionBar from '../components/BulkActionBar';
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
  useIsMobile,
} from '../hooks';

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

export default function HomePage() {
  useBodyBackground('#ffffff');

  const { user: platformUser, isLoading: userLoading } = useUser();
  const { users: roomUsers } = useUsers();

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

  const allUsers: WidgetUser[] = useMemo(() => {
    if (!roomUsers || roomUsers.length === 0) return currentUser ? [currentUser] : [];
    return roomUsers.map((u: any) => ({
      id: u.id,
      name: u.name || 'Unknown',
      email: u.email || '',
      imageUrl: u.imageUrl || '',
      color: getUserColor(u.id),
      role: u.role || 'member',
    }));
  }, [roomUsers, currentUser]);

  const getDisplayName = useCallback((user: WidgetUser | null) => {
    if (!user) return 'Unknown';
    return user.name || user.email || 'Unknown';
  }, []);

  const isReadOnly = !platformUser || platformUser.role === 'viewer';

  const {
    isLoading: dataLoading,
    tasks, projects, tags,
    taskCounts, tasksByUser, tasksByProject,
    unassignedTasksCount, projectTree,
    addTask, updateTask, deleteTask, restoreTask, permanentDeleteTask,
    completeTask, moveTask, reorderTask, getTasksForView,
    addProject, updateProject, deleteProject, reorderProject,
    addTag, deleteTag, addTagToTask, removeTagFromTask,
  } = useTaskData(currentUser);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const handleMobileSidebarOpen = useCallback(() => setMobileSidebarOpen(true), []);
  const handleMobileSidebarClose = useCallback(() => setMobileSidebarOpen(false), []);

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
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean; type: 'delete' | 'permanentDelete' | null;
    count: number; taskIds: string[]; taskTitle: string | null;
  }>({ isOpen: false, type: null, count: 0, taskIds: [], taskTitle: null });

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
  const [showReadOnlyAuth, setShowReadOnlyAuth] = useState(false);
  const [isDetailResizeHovered, setIsDetailResizeHovered] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  const clearSort = useCallback(() => { setSortBy(null); setSortDirection('asc'); }, []);

  const handleViewChange = useCallback((newView: ViewState) => {
    setCurrentView(newView);
    if (newView.type === VIEWS.ALL) {
      setSelectedProjectIds(null); setSelectedTagIds(null); setSelectedUserIds(null);
    }
    setShowSortDropdown(false); setShowFilterDropdown(false);
  }, []);

  const displayedTasks = useMemo(() => computeDisplayedTasks({
    currentView, getTasksForView, showCompleted, showUnassigned,
    selectedProjectIds, selectedTagIds, selectedKanbanStatuses, selectedUserIds,
    searchQuery, sortBy, sortDirection,
  }), [currentView, getTasksForView, showCompleted, showUnassigned,
    selectedProjectIds, selectedTagIds, selectedKanbanStatuses, selectedUserIds,
    searchQuery, sortBy, sortDirection]);

  const boardDisplayedTasks = useMemo(() => computeDisplayedTasks({
    currentView, getTasksForView, showCompleted: true, showUnassigned,
    selectedProjectIds, selectedTagIds, selectedKanbanStatuses, selectedUserIds,
    searchQuery, sortBy, sortDirection,
  }), [currentView, getTasksForView, showUnassigned,
    selectedProjectIds, selectedTagIds, selectedKanbanStatuses, selectedUserIds,
    searchQuery, sortBy, sortDirection]);

  const displayedTaskCounts = useMemo(() => {
    const completed = displayedTasks.filter((t: Task) => t.completed).length;
    const uncompleted = displayedTasks.filter((t: Task) => !t.completed).length;
    return { completed, uncompleted, total: displayedTasks.length };
  }, [displayedTasks]);

  const {
    selectedTaskIds, setSelectedTaskIds, setLastClickedTaskId,
    selectedTasks, selectedTask, clearSelection, handleSelectTask,
  } = useTaskSelection(tasks, displayedTasks);

  const handleViewModeChange = useCallback((mode: 'list' | 'board') => {
    setViewMode(mode); clearSelection();
  }, [clearSelection]);

  const { draggedItem, dragOverItem, handlers: dragHandlers } = useDragDrop(
    tasks, reorderTask, clearSort, selectedTaskIds
  );

  const sidebarResize = useMouseDragResize({
    initialWidth: 260, minWidth: 180, maxWidth: 400,
    getNextWidth: (e: MouseEvent) => e.clientX,
  });

  const detailResize = useMouseDragResize({
    initialWidth: 340,
    getNextWidth: (e: MouseEvent) => window.innerWidth - e.clientX,
    getMinWidth: () => window.innerWidth * 0.2,
    getMaxWidth: () => window.innerWidth * 0.5,
  });

  const handleSort = useCallback((type: string | null, direction?: string | null) => {
    setSortBy(type); setSortDirection((direction as 'asc' | 'desc') || 'asc');
  }, []);

  const getDescendantIds = useCallback((projectId: string): string[] => {
    const ids: string[] = [];
    const walk = (nodes: typeof projectTree) => {
      for (const node of nodes) {
        if (node.id === projectId) {
          const collectAll = (n: typeof node) => {
            (n.children || []).forEach(child => { ids.push(child.id); collectAll(child); });
          };
          collectAll(node); return true;
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
      if (prev === null) return allIds.filter(id => !allRelated.includes(id));
      const isCurrentlySelected = prev.includes(projectId);
      if (isCurrentlySelected) return prev.filter(id => !allRelated.includes(id));
      const merged = new Set([...prev, ...allRelated]);
      if (merged.size >= allIds.length) return null;
      return Array.from(merged);
    });
  }, [projects, getDescendantIds]);

  const handleToggleTag = useCallback((tagId: string) => {
    setSelectedTagIds(prev => toggleNullableMultiSelect(prev, (tags || []).map(t => t.id), tagId));
  }, [tags]);

  const handleSelectAllProjects = useCallback(() => setSelectedProjectIds(null), []);
  const handleSelectAllTags = useCallback(() => setSelectedTagIds(null), []);
  const handleToggleKanbanStatus = useCallback((statusId: string) => {
    setSelectedKanbanStatuses(prev => toggleNullableMultiSelect(prev, ALL_KANBAN_STATUS_IDS, statusId));
  }, []);
  const handleSelectAllKanbanStatuses = useCallback(() => setSelectedKanbanStatuses(null), []);
  const handleToggleUser = useCallback((userId: string) => {
    setSelectedUserIds(prev => toggleNullableMultiSelect(prev, (allUsers || []).map(u => u.id), userId));
  }, [allUsers]);
  const handleSelectAllUsers = useCallback(() => setSelectedUserIds(null), []);
  const handleResetFilters = useCallback(() => {
    setShowCompleted(false); setShowUnassigned(true);
    setSelectedProjectIds(null); setSelectedTagIds(null);
    setSelectedKanbanStatuses(null); setSelectedUserIds(null);
  }, []);

  const currentProject = currentView.type === VIEWS.PROJECT ? projects?.find(p => p.id === currentView.id) || null : null;
  const currentUserForView = useMemo(() => {
    if (currentView.type !== VIEWS.USER || currentView.id === 'unassigned') return null;
    return allUsers.find(u => u.id === currentView.id) || null;
  }, [currentView.type, currentView.id, allUsers]);

  const handleQuickAdd = useCallback(async (taskData: Partial<Task>) => {
    const today = new Date().toISOString().split('T')[0];
    const assignedUserData = currentUserForView ? {
      id: currentUserForView.id, name: currentUserForView.name,
      email: currentUserForView.email, color: currentUserForView.color,
    } : null;
    const newTask = await addTask({
      ...taskData,
      dueDate: currentView.type === VIEWS.TODAY ? today : null,
      projectId: currentView.type === VIEWS.PROJECT ? (currentView.id || null) : null,
      assignedUser: assignedUserData,
    });
    if (newTask) { setSelectedTaskIds([newTask.id]); setLastClickedTaskId(newTask.id); }
  }, [currentView, addTask, currentUserForView, setSelectedTaskIds, setLastClickedTaskId]);

  const handleAddProject = useCallback((parentId: string | null = null) => {
    setNewProjectParentId(parentId); setNewProjectName('');
    if (parentId) {
      const p = projects?.find(p => p.id === parentId);
      setNewProjectColor(p?.color || '#007AFF');
    } else { setNewProjectColor('#007AFF'); }
    setShowNewProjectInput(true);
  }, [projects]);

  const handleSaveNewProject = useCallback(async () => {
    if (newProjectName.trim()) {
      const project = await addProject({ title: newProjectName.trim(), parentId: newProjectParentId, color: newProjectColor });
      setNewProjectName(''); setNewProjectColor('#007AFF');
      setShowNewProjectInput(false); setNewProjectParentId(null);
      if (project) setCurrentView({ type: VIEWS.PROJECT, id: project.id });
    }
  }, [newProjectName, newProjectParentId, newProjectColor, addProject]);

  const handleEditProject = useCallback((info: { id: string; title: string; color: string }) => {
    setEditProjectModal(info); setEditProjectTitle(info.title || ''); setEditProjectColor(info.color || '#007AFF');
  }, []);

  const handleSaveEditProject = useCallback(() => {
    if (!editProjectModal || !editProjectTitle.trim()) return;
    updateProject(editProjectModal.id, { title: editProjectTitle.trim(), color: editProjectColor });
    setEditProjectModal(null); setEditProjectTitle(''); setEditProjectColor('#007AFF');
  }, [editProjectModal, editProjectTitle, editProjectColor, updateProject]);

  const handleDeleteFromEdit = useCallback(() => {
    if (!editProjectModal) return;
    setDeleteProjectConfirm({ id: editProjectModal.id, title: editProjectModal.title,
      taskCount: editProjectModal.totalTaskCount || 0, childCount: editProjectModal.childCount || 0 });
    setEditProjectModal(null);
  }, [editProjectModal]);

  const confirmDeleteProject = useCallback(() => {
    if (!deleteProjectConfirm) return;
    if (currentView.type === VIEWS.PROJECT && currentView.id === deleteProjectConfirm.id) setCurrentView({ type: VIEWS.ALL });
    deleteProject(deleteProjectConfirm.id); setDeleteProjectConfirm(null);
  }, [currentView, deleteProject, deleteProjectConfirm]);

  const handleBulkDelete = useCallback(() => {
    if (selectedTaskIds.length === 0) return;
    setDeleteConfirmModal({ isOpen: true, type: 'delete', count: selectedTaskIds.length, taskIds: [...selectedTaskIds], taskTitle: null });
  }, [selectedTaskIds]);

  const handleBulkRestore = useCallback(() => {
    selectedTaskIds.forEach(id => restoreTask(id)); clearSelection();
  }, [selectedTaskIds, restoreTask, clearSelection]);

  const handleBulkPermanentDelete = useCallback(() => {
    if (selectedTaskIds.length === 0) return;
    setDeleteConfirmModal({ isOpen: true, type: 'permanentDelete', count: selectedTaskIds.length, taskIds: [...selectedTaskIds], taskTitle: null });
  }, [selectedTaskIds]);

  const handleSinglePermanentDelete = useCallback((taskId: string, taskTitle?: string) => {
    setDeleteConfirmModal({ isOpen: true, type: 'permanentDelete', count: 1, taskIds: [taskId], taskTitle: taskTitle || 'this task' });
  }, []);

  const confirmDeleteAction = useCallback(() => {
    const { type, taskIds } = deleteConfirmModal;
    if (type === 'delete') taskIds.forEach(id => deleteTask(id));
    else if (type === 'permanentDelete') taskIds.forEach(id => permanentDeleteTask(id));
    clearSelection();
    setDeleteConfirmModal({ isOpen: false, type: null, count: 0, taskIds: [], taskTitle: null });
  }, [deleteConfirmModal, deleteTask, permanentDeleteTask, clearSelection]);

  const cancelDeleteAction = useCallback(() => {
    setDeleteConfirmModal({ isOpen: false, type: null, count: 0, taskIds: [], taskTitle: null });
  }, []);

  const handleBulkComplete = useCallback(() => {
    selectedTaskIds.forEach(id => completeTask(id)); clearSelection();
  }, [selectedTaskIds, completeTask, clearSelection]);

  const handleBulkUncomplete = useCallback(() => {
    selectedTaskIds.forEach(id => updateTask(id, { completed: false, completedAt: null })); clearSelection();
  }, [selectedTaskIds, updateTask, clearSelection]);

  const handleTaskDropOnProject = useCallback((taskId: string, projectId: string | null) => {
    if (selectedTaskIds.includes(taskId) && selectedTaskIds.length > 1) {
      selectedTaskIds.forEach(id => moveTask(id, { projectId })); clearSelection();
    } else { moveTask(taskId, { projectId }); }
  }, [moveTask, selectedTaskIds, clearSelection]);

  const handleTaskDropOnUser = useCallback((taskId: string, userId: string | null) => {
    const toUpdate = selectedTaskIds.includes(taskId) && selectedTaskIds.length > 1 ? selectedTaskIds : [taskId];
    if (userId === null) {
      toUpdate.forEach(id => updateTask(id, { assignedUser: null, assignedBy: null }));
    } else {
      const targetUser = allUsers.find(u => u.id === userId);
      if (!targetUser) return;
      const assignedUserData = { id: targetUser.id, name: targetUser.name, email: targetUser.email, color: targetUser.color };
      const assignerData = currentUser ? { id: currentUser.id, name: currentUser.name, email: currentUser.email, color: currentUser.color } : null;
      toUpdate.forEach(id => updateTask(id, { assignedUser: assignedUserData, assignedBy: assignerData }));
    }
    if (toUpdate.length > 1) clearSelection();
  }, [allUsers, currentUser, updateTask, selectedTaskIds, clearSelection]);

  useTaskHotkeys({ selectedTaskIds, displayedTasks, clearSelection, setSelectedTaskIds, onDeleteSelected: handleBulkDelete });

  const getPlaceholder = () => {
    const names: Record<string, string> = {
      [VIEWS.ALL]: 'Add a task...', [VIEWS.TODAY]: 'Add to today...', [VIEWS.UPCOMING]: 'Schedule a task...',
      [VIEWS.PROJECT]: `Add to ${currentProject?.title || 'project'}...`,
      [VIEWS.USER]: currentView.id === 'unassigned' ? 'Add task...' : `Add for ${getDisplayName(currentUserForView) || 'user'}...`,
    };
    return names[currentView.type] || 'New To-Do';
  };

  const getEmptyMessage = () => {
    const messages: Record<string, string> = {
      [VIEWS.ALL]: 'No tasks yet.\nCreate your first task!', [VIEWS.TODAY]: 'Nothing for today.\nEnjoy your free time!',
      [VIEWS.UPCOMING]: 'No upcoming tasks.', [VIEWS.LOGBOOK]: 'No completed tasks yet.', [VIEWS.TRASH]: 'Trash is empty.',
      [VIEWS.PROJECT]: `No tasks in ${currentProject?.title || 'this project'}.`,
      [VIEWS.USER]: currentView.id === 'unassigned' ? 'No unassigned tasks.' : `No tasks for ${currentUserForView?.name || 'user'}.`,
    };
    return messages[currentView.type] || 'No tasks';
  };

  const showProjectColumn = ([VIEWS.ALL, VIEWS.TODAY, VIEWS.UPCOMING, VIEWS.LOGBOOK, VIEWS.USER] as readonly ViewType[]).includes(currentView.type);

  const handleCloseReadOnlyBanner = useCallback(() => setShowReadOnlyBanner(false), []);
  const handleToggleShowCompleted = useCallback(() => setShowCompleted(prev => !prev), []);
  const handleToggleShowUnassigned = useCallback(() => setShowUnassigned(prev => !prev), []);
  const handleToggleSortDropdown = useCallback(() => setShowSortDropdown(prev => !prev), []);
  const handleToggleFilterDropdown = useCallback(() => setShowFilterDropdown(prev => !prev), []);
  const handleUncomplete = useCallback((id: string) => updateTask(id, { completed: false, completedAt: null }), [updateTask]);
  const noop = useCallback(() => {}, []);
  const handleDeleteAndClear = useCallback((id: string) => { deleteTask(id); clearSelection(); }, [deleteTask, clearSelection]);
  const handleRestoreAndClear = useCallback((id: string) => { restoreTask(id); clearSelection(); }, [restoreTask, clearSelection]);
  const handlePermanentDeleteAndClear = useCallback((id: string) => { permanentDeleteTask(id); clearSelection(); }, [permanentDeleteTask, clearSelection]);

  const selectedTaskRef = useRef(selectedTask);
  selectedTaskRef.current = selectedTask;

  const handleAddProjectFromDetail = useCallback((data: { title: string; color: string }) => {
    addProject(data).then(project => {
      if (project && selectedTaskRef.current) updateTask(selectedTaskRef.current.id, { projectId: project.id });
    });
    return null;
  }, [addProject, updateTask]);

  if (userLoading || dataLoading) return null;

  return (
    <div data-app-container data-testid="app-container" style={{
      ...styles.container,
      cursor: (sidebarResize.isResizing || detailResize.isResizing) ? 'col-resize' : 'default',
    }}>
      {isMobile && mobileSidebarOpen && <div className="mobile-sidebar-backdrop" onClick={handleMobileSidebarClose} />}

      <Sidebar currentView={currentView} onViewChange={handleViewChange} taskCounts={taskCounts}
        projectTree={projectTree} projects={projects} tasksByProject={tasksByProject} tasksByUser={tasksByUser}
        tasks={tasks} unassignedTasksCount={unassignedTasksCount}
        onAddProject={isReadOnly ? undefined : handleAddProject}
        onReorderProject={isReadOnly ? undefined : reorderProject}
        onEditProject={isReadOnly ? undefined : handleEditProject}
        onTaskDrop={isReadOnly ? undefined : handleTaskDropOnProject}
        onTaskDropOnUser={isReadOnly ? undefined : handleTaskDropOnUser}
        onTaskDragEnd={isReadOnly ? undefined : dragHandlers.onDragEnd}
        allUsers={allUsers} currentUser={currentUser} width={sidebarResize.width}
        getDisplayName={getDisplayName} isReadOnly={isReadOnly}
        onSignIn={!platformUser ? () => setShowReadOnlyAuth(true) : undefined}
        isMobile={isMobile} isMobileOpen={mobileSidebarOpen} onMobileClose={handleMobileSidebarClose} />

      <div data-resize-handle onMouseDown={sidebarResize.startResize}
        onMouseEnter={() => setIsResizeHovered(true)} onMouseLeave={() => setIsResizeHovered(false)}
        style={styles.resizeHandle}>
        <div style={{ ...styles.resizeHandleLine, ...((sidebarResize.isResizing || isResizeHovered) ? styles.resizeHandleLineActive : {}) }} />
      </div>

      <div style={styles.main}>
        <div style={styles.contentWrapper}>
          <div style={styles.taskListArea}>
            {isReadOnly && showReadOnlyBanner && (!platformUser ? (
              <ReadOnlyBanner
                mode="anonymous"
                onClose={handleCloseReadOnlyBanner}
                onSignIn={() => setShowReadOnlyAuth(true)}
              />
            ) : (
              <ReadOnlyBanner mode="viewer" onClose={handleCloseReadOnlyBanner} />
            ))}

            <ViewHeader view={currentView} project={currentProject} user={currentUserForView}
              taskCount={displayedTasks.length} taskCountData={displayedTaskCounts}
              getDisplayName={getDisplayName} onMenuClick={handleMobileSidebarOpen} />

            <Toolbar sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}
              showCompleted={showCompleted} onToggleShowCompleted={handleToggleShowCompleted}
              showUnassigned={showUnassigned} onToggleShowUnassigned={handleToggleShowUnassigned}
              availableProjects={projects || []} projectTree={projectTree}
              selectedProjectIds={selectedProjectIds} onToggleProject={handleToggleProject}
              onSelectAllProjects={handleSelectAllProjects} availableTags={tags || []}
              selectedTagIds={selectedTagIds} onToggleTag={handleToggleTag} onSelectAllTags={handleSelectAllTags}
              selectedKanbanStatuses={selectedKanbanStatuses} onToggleKanbanStatus={handleToggleKanbanStatus}
              onSelectAllKanbanStatuses={handleSelectAllKanbanStatuses}
              allUsers={allUsers} selectedUserIds={selectedUserIds} onToggleUser={handleToggleUser}
              onSelectAllUsers={handleSelectAllUsers} onResetFilters={handleResetFilters}
              isAllView={currentView.type === VIEWS.ALL} isProjectView={currentView.type === VIEWS.PROJECT}
              isUserView={currentView.type === VIEWS.USER}
              showSortDropdown={showSortDropdown} onToggleSortDropdown={handleToggleSortDropdown}
              showFilterDropdown={showFilterDropdown} onToggleFilterDropdown={handleToggleFilterDropdown}
              searchQuery={searchQuery} onSearchChange={setSearchQuery} getDisplayName={getDisplayName}
              viewMode={viewMode} onViewModeChange={handleViewModeChange} />

            {viewMode === 'list' && (<>
              {!isReadOnly && selectedTaskIds.length > 1 && (
                <BulkActionBar selectedCount={selectedTaskIds.length} selectedTasks={selectedTasks}
                  onDelete={handleBulkDelete} onRestore={handleBulkRestore} onPermanentDelete={handleBulkPermanentDelete}
                  onComplete={handleBulkComplete} onUncomplete={handleBulkUncomplete} onClearSelection={clearSelection}
                  isTrashView={currentView.type === VIEWS.TRASH} />
              )}
              <TaskList tasks={displayedTasks} projects={projects} tags={tags}
                onComplete={isReadOnly ? undefined : completeTask}
                onUncomplete={isReadOnly ? undefined : handleUncomplete}
                onSelect={handleSelectTask} onUpdate={isReadOnly ? undefined : updateTask}
                onRestore={isReadOnly ? undefined : (currentView.type === VIEWS.TRASH ? restoreTask : undefined)}
                onPermanentDelete={isReadOnly ? undefined : (currentView.type === VIEWS.TRASH ? handleSinglePermanentDelete : undefined)}
                selectedTaskIds={selectedTaskIds} showProject={showProjectColumn}
                currentViewProjectId={currentView.type === VIEWS.PROJECT ? (currentView.id || null) : null}
                emptyMessage={getEmptyMessage()} groupByDate={currentView.type === VIEWS.UPCOMING}
                draggedItem={draggedItem || null} dragOverItem={dragOverItem || null}
                dragHandlers={isReadOnly ? {} : dragHandlers}
                getDisplayName={getDisplayName} allUsers={allUsers} isReadOnly={isReadOnly} />
              {!isReadOnly && currentView.type !== VIEWS.LOGBOOK && currentView.type !== VIEWS.TRASH && (
                <QuickAdd onAdd={handleQuickAdd} placeholder={getPlaceholder()} />
              )}
            </>)}

            {viewMode === 'board' && (
              <KanbanBoard tasks={boardDisplayedTasks} projects={projects || []}
                onUpdateTask={isReadOnly ? noop : updateTask} onCompleteTask={isReadOnly ? noop : completeTask}
                isReadOnly={isReadOnly} />
            )}
          </div>

          {viewMode === 'list' && selectedTask && (<>
            {isMobile && <div className="mobile-detail-backdrop" onClick={clearSelection} />}
            <div data-resize-handle onMouseDown={detailResize.startResize}
              onMouseEnter={() => setIsDetailResizeHovered(true)} onMouseLeave={() => setIsDetailResizeHovered(false)}
              style={styles.detailResizeHandle}>
              <div style={{ ...styles.detailResizeHandleLine, ...((detailResize.isResizing || isDetailResizeHovered) ? styles.detailResizeHandleLineActive : {}) }} />
            </div>
            <TaskDetail task={selectedTask} projects={projects} allUsers={allUsers} tags={tags}
              onUpdate={isReadOnly ? undefined : updateTask} onDelete={isReadOnly ? undefined : handleDeleteAndClear}
              onRestore={isReadOnly ? undefined : handleRestoreAndClear}
              onPermanentDelete={isReadOnly ? undefined : handlePermanentDeleteAndClear}
              onClose={clearSelection} onAddProject={isReadOnly ? undefined : handleAddProjectFromDetail}
              onAddTag={isReadOnly ? undefined : addTag} onDeleteTag={isReadOnly ? undefined : deleteTag}
              onAddTagToTask={isReadOnly ? undefined : addTagToTask}
              onRemoveTagFromTask={isReadOnly ? undefined : removeTagFromTask}
              getDisplayName={getDisplayName} isReadOnly={isReadOnly}
              width={isMobile ? window.innerWidth : detailResize.width} isMobile={isMobile} />
          </>)}
        </div>
      </div>

      {showNewProjectInput && (
        <div style={styles.modal} onClick={() => setShowNewProjectInput(false)}>
          <div data-modal-content style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>New Project</h3>
              <button onClick={() => setShowNewProjectInput(false)} style={styles.modalClose}><Icon name="x" size={18} color="#8E8E93" /></button>
            </div>
            {newProjectParentId && <div style={styles.modalSubtitle}>Inside: {projects?.find(p => p.id === newProjectParentId)?.title || 'project'}</div>}
            <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newProjectName.trim()) handleSaveNewProject(); if (e.key === 'Escape') setShowNewProjectInput(false); }}
              placeholder="Project name" style={styles.modalInput} autoFocus />
            <div style={styles.colorPickerSection}><span style={styles.colorPickerLabel}>Color</span>
              <div style={styles.colorPickerRow}>{TAG_COLORS.map(color => (
                <button key={color} onClick={() => setNewProjectColor(color)} style={{ ...styles.colorOption, backgroundColor: color, ...(newProjectColor === color ? styles.colorOptionSelected : {}) }} />
              ))}</div></div>
            <div style={styles.modalActions}>
              <button onClick={() => setShowNewProjectInput(false)} style={styles.btnCancel}>Cancel</button>
              <button onClick={handleSaveNewProject} style={{ ...styles.btnSave, opacity: newProjectName.trim() ? 1 : 0.5 }} disabled={!newProjectName.trim()}>Create</button>
            </div>
          </div>
        </div>
      )}

      {editProjectModal && (
        <div style={styles.modal} onClick={() => setEditProjectModal(null)}>
          <div data-modal-content style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Edit Project</h3>
              <button onClick={() => setEditProjectModal(null)} style={styles.modalClose}><Icon name="x" size={18} color="#8E8E93" /></button>
            </div>
            <input type="text" value={editProjectTitle} onChange={e => setEditProjectTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && editProjectTitle.trim()) handleSaveEditProject(); if (e.key === 'Escape') setEditProjectModal(null); }}
              placeholder="Project name" style={styles.modalInput} autoFocus />
            <div style={styles.colorPickerSection}><span style={styles.colorPickerLabel}>Color</span>
              <div style={styles.colorPickerRow}>{TAG_COLORS.map(color => (
                <button key={color} onClick={() => setEditProjectColor(color)} style={{ ...styles.colorOption, backgroundColor: color, ...(editProjectColor === color ? styles.colorOptionSelected : {}) }} />
              ))}</div></div>
            <div style={styles.editModalActions}>
              <button onClick={handleDeleteFromEdit} style={styles.btnDeleteText}><Icon name="trash-2" size={14} color="#FF3B30" />Delete Project</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditProjectModal(null)} style={styles.btnCancel}>Cancel</button>
                <button onClick={handleSaveEditProject} style={{ ...styles.btnSave, opacity: editProjectTitle.trim() ? 1 : 0.5 }} disabled={!editProjectTitle.trim()}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteProjectConfirm && (
        <div style={styles.modal} onClick={() => setDeleteProjectConfirm(null)}>
          <div data-modal-content style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Delete Project</h3>
              <button onClick={() => setDeleteProjectConfirm(null)} style={styles.modalClose}><Icon name="x" size={18} color="#8E8E93" /></button>
            </div>
            <div style={styles.deleteModalBody}>
              <div style={styles.deleteWarningIcon}><Icon name="alert-triangle" size={32} color="#FF3B30" /></div>
              <p style={styles.deleteModalText}>Are you sure you want to delete <strong>"{deleteProjectConfirm.title}"</strong>?</p>
              {(deleteProjectConfirm.taskCount > 0 || deleteProjectConfirm.childCount > 0) && (
                <p style={styles.deleteModalWarning}>
                  This will also delete{' '}
                  {deleteProjectConfirm.taskCount > 0 && <span>{deleteProjectConfirm.taskCount} task{deleteProjectConfirm.taskCount > 1 ? 's' : ''}</span>}
                  {deleteProjectConfirm.taskCount > 0 && deleteProjectConfirm.childCount > 0 && ' and '}
                  {deleteProjectConfirm.childCount > 0 && <span>{deleteProjectConfirm.childCount} sub-project{deleteProjectConfirm.childCount > 1 ? 's' : ''}</span>}
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

      {showReadOnlyAuth && (
        <AuthOverlay onClose={() => setShowReadOnlyAuth(false)} />
      )}

      <ConfirmModal isOpen={deleteConfirmModal.isOpen}
        title={deleteConfirmModal.type === 'permanentDelete' ? 'Permanently Delete' : 'Delete Task'}
        message={deleteConfirmModal.type === 'permanentDelete' ? (
          deleteConfirmModal.taskTitle ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '15px', color: '#1D1D1F' }}>Permanently delete "<strong>{deleteConfirmModal.taskTitle}</strong>"?</p>
              <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>This action cannot be undone.</p>
            </div>
          ) : `Are you sure you want to permanently delete ${deleteConfirmModal.count} task${deleteConfirmModal.count > 1 ? 's' : ''}? This action cannot be undone.`
        ) : `Are you sure you want to delete ${deleteConfirmModal.count} task${deleteConfirmModal.count > 1 ? 's' : ''}?`}
        confirmLabel={deleteConfirmModal.type === 'permanentDelete' ? 'Delete Forever' : 'Delete'}
        cancelLabel="Cancel" confirmStyle="danger" onConfirm={confirmDeleteAction} onCancel={cancelDeleteAction} />
    </div>
  );
}
