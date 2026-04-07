import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Icon } from '../utils/icons';
import { styles } from '../utils/styles';
import {
  VIEWS, ViewState, Task, Project, Tag,
  ProjectTreeNode, TaskUser, WidgetUser, getUserColor,
} from '../constants';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  taskCounts: {
    all: { total: number; completed: number; uncompleted: number };
    today: { total: number; completed: number; uncompleted: number };
    upcoming: { total: number; completed: number; uncompleted: number };
    logbook: { total: number; completed: number; uncompleted: number };
    trash: { total: number; completed: number; uncompleted: number };
  };
  projectTree: ProjectTreeNode[];
  projects: Project[];
  tasksByProject: Record<string, Task[]>;
  tasksByUser: Record<string, { user: TaskUser; tasks: Task[] }>;
  tasks: Task[];
  unassignedTasksCount: number;
  onAddProject?: (parentId?: string | null) => void;
  onReorderProject?: (id: string, targetId: string, position: 'before' | 'after' | 'inside') => boolean;
  onEditProject?: (info: { id: string; title: string; color: string; totalTaskCount?: number; childCount?: number }) => void;
  onTaskDrop?: (taskId: string, projectId: string | null) => void;
  onTaskDropOnUser?: (taskId: string, userId: string | null) => void;
  onTaskDragEnd?: () => void;
  allUsers: WidgetUser[];
  currentUser: WidgetUser | null;
  onManageUsers?: () => void;
  width: number;
  getDisplayName: (user: WidgetUser | null) => string;
  isReadOnly: boolean;
  // Mobile props
  isMobile?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const NAV_ITEMS = [
  { type: VIEWS.ALL, icon: 'inbox', label: 'All Tasks', countKey: 'all' },
  { type: VIEWS.TODAY, icon: 'star', label: 'Today', countKey: 'today' },
  { type: VIEWS.UPCOMING, icon: 'calendar', label: 'Upcoming', countKey: 'upcoming' },
  { type: VIEWS.LOGBOOK, icon: 'check-circle', label: 'Logbook', countKey: 'logbook' },
  { type: VIEWS.TRASH, icon: 'trash-2', label: 'Trash', countKey: 'trash' },
] as const;

/**
 * Individual project tree node with hover action buttons, task drop support,
 * and project drag-and-drop reordering.
 * Matches the old widget's sidebar project items.
 */
function ProjectTreeItem({
  node,
  depth,
  isActive,
  isExpanded,
  onViewChange,
  onEditProject,
  onAddProject,
  toggleExpand,
  onTaskDrop,
  onTaskDragEnd,
  // Project drag-and-drop for reordering
  dragState,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isReadOnly,
  children,
}: {
  node: ProjectTreeNode;
  depth: number;
  isActive: boolean;
  isExpanded: boolean;
  onViewChange: (view: ViewState) => void;
  onEditProject?: (info: { id: string; title: string; color: string; totalTaskCount?: number; childCount?: number }) => void;
  onAddProject?: (parentId?: string | null) => void;
  toggleExpand: (id: string) => void;
  onTaskDrop?: (taskId: string, projectId: string) => void;
  onTaskDragEnd?: () => void;
  // Project drag state
  dragState: { draggingId: string | null; dropTargetId: string | null; dropPosition: string | null };
  onDragStart: (e: React.DragEvent | null, node: ProjectTreeNode | null) => void;
  onDragOver: (e: React.DragEvent, targetId: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  isReadOnly: boolean;
  children?: React.ReactNode;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isTaskDragOver, setIsTaskDragOver] = useState(false);

  const hasChildren = node.hasChildren || (node.children && node.children.length > 0);
  const isDragging = dragState.draggingId === node.id;
  const isDropTarget = dragState.dropTargetId === node.id;
  const dropPosition = isDropTarget ? dragState.dropPosition : null;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReadOnly && onEditProject) {
      onEditProject({
        id: node.id,
        title: node.title,
        color: node.color,
        totalTaskCount: node.totalTaskCount,
        childCount: node.children?.length || 0,
      });
    }
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReadOnly && onAddProject) {
      onAddProject(node.id);
    }
  };

  return (
    <div style={{ opacity: isDragging ? 0.5 : 1 }}>
      <div
        draggable={!isReadOnly}
        onDragStart={(e) => !isReadOnly && onDragStart(e, node)}
        onDragOver={(e) => {
          if (isReadOnly) return;
          // Check if this is a task being dragged
          const isTaskDrag = e.dataTransfer.types.includes('application/x-task');
          if (isTaskDrag) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            if (!isTaskDragOver) setIsTaskDragOver(true);
          } else {
            // Normal project drag
            onDragOver(e, node.id);
          }
        }}
        onDragLeave={(e) => {
          if (isReadOnly) return;
          if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
            setIsTaskDragOver(false);
            onDragLeave(e);
          }
        }}
        onDrop={(e) => {
          if (isReadOnly) return;
          // Check if this is a task drop
          const taskId = e.dataTransfer.getData('application/x-task');
          if (taskId && onTaskDrop) {
            e.preventDefault();
            e.stopPropagation();
            onTaskDrop(taskId, node.id);
            setIsTaskDragOver(false);
            if (onTaskDragEnd) onTaskDragEnd();
          } else {
            // Normal project drop
            onDrop(e, node.id);
          }
        }}
        onDragEnd={(e) => {
          setIsTaskDragOver(false);
          if (e.dataTransfer.types.includes('application/x-task') && onTaskDragEnd) {
            onTaskDragEnd();
          } else {
            // Signal end of project drag
            onDragStart(null, null);
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onViewChange({ type: VIEWS.PROJECT, id: node.id })}
        onContextMenu={e => { e.preventDefault(); handleEdit(e); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '5px 8px',
          paddingLeft: 8 + depth * 16,
          borderRadius: 6,
          cursor: 'grab',
          transition: 'background-color 0.15s ease',
          position: 'relative' as const,
          ...(isActive ? { backgroundColor: 'rgba(99,102,241,0.1)' } : {}),
          ...(isTaskDragOver ? { backgroundColor: 'rgba(99,102,241,0.1)' } : {}),
        }}
      >
        {/* Drop indicator lines for project reordering */}
        {dropPosition === 'before' && (
          <div style={{ position: 'absolute', left: 8, right: 8, top: 0, height: 2, backgroundColor: '#6366f1', borderRadius: 1, pointerEvents: 'none' }} />
        )}
        {dropPosition === 'after' && (
          <div style={{ position: 'absolute', left: 8, right: 8, bottom: 0, height: 2, backgroundColor: '#6366f1', borderRadius: 1, pointerEvents: 'none' }} />
        )}
        {dropPosition === 'inside' && (
          <div style={{ position: 'absolute', left: 4, right: 4, top: 4, bottom: 4, border: '2px dashed #6366f1', borderRadius: 4, pointerEvents: 'none' }} />
        )}

        {/* Expand/collapse button */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
          style={{
            width: 18, height: 18, border: 'none', background: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 0, flexShrink: 0,
          }}
        >
          {hasChildren ? (
            <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={12} color="#86868B" />
          ) : (
            <span style={{ width: 12 }} />
          )}
        </button>

        {/* Project color dot */}
        <span style={{ ...styles.projectDot, backgroundColor: node.color || '#6366f1' }} />

        {/* Click area for selecting */}
        <button
          onClick={(e) => { e.stopPropagation(); onViewChange({ type: VIEWS.PROJECT, id: node.id }); }}
          style={{
            flex: 1, border: 'none', background: 'none',
            cursor: 'pointer', textAlign: 'left' as const, padding: '2px 0', minWidth: 0,
          }}
        >
          <span style={{
            fontSize: 13, color: '#3C3C43',
            overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' as const, display: 'block',
          }}>
            {node.title}
          </span>
        </button>

        {/* Task count */}
        {node.totalTaskCount > 0 && !isHovered && (
          <span style={{ fontSize: 11, color: '#AEAEB2', flexShrink: 0 }}>
            {`${node.totalTaskCount - (node.totalCompleted || 0)}/${node.totalTaskCount}`}
          </span>
        )}

        {/* Action buttons - show on hover */}
        {!isReadOnly && isHovered && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2,
            marginLeft: 'auto', transition: 'opacity 0.15s ease',
          }}>
            {onAddProject && (
              <button
                onClick={handleAddChild}
                style={{
                  width: 20, height: 20, border: 'none', background: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', borderRadius: 4, flexShrink: 0, padding: 0,
                }}
                title="Add sub-project"
              >
                <Icon name="plus" size={12} color="#86868B" />
              </button>
            )}
            {onEditProject && (
              <button
                onClick={handleEdit}
                style={{
                  width: 20, height: 20, border: 'none', background: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', borderRadius: 4, flexShrink: 0, padding: 0,
                }}
                title="Edit project"
              >
                <Icon name="pencil" size={12} color="#86868B" />
              </button>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * User list item with task drop support (drag task → user to assign)
 */
function UserListItem({
  user,
  isActive,
  isYou,
  displayName,
  totalTasks,
  completedTasks,
  onViewChange,
  onTaskDropOnUser,
  onTaskDragEnd,
  isReadOnly,
}: {
  user: WidgetUser;
  isActive: boolean;
  isYou: boolean;
  displayName: string;
  totalTasks: number;
  completedTasks: number;
  onViewChange: (view: ViewState) => void;
  onTaskDropOnUser?: (taskId: string, userId: string | null) => void;
  onTaskDragEnd?: () => void;
  isReadOnly: boolean;
}) {
  const [isTaskDragOver, setIsTaskDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (isReadOnly) return;
    const isTaskDrag = e.dataTransfer.types.includes('application/x-task');
    if (isTaskDrag) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (!isTaskDragOver) setIsTaskDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (isReadOnly) return;
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsTaskDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isReadOnly) return;
    const taskId = e.dataTransfer.getData('application/x-task');
    if (taskId && onTaskDropOnUser) {
      e.preventDefault();
      e.stopPropagation();
      onTaskDropOnUser(taskId, user.id);
      setIsTaskDragOver(false);
      if (onTaskDragEnd) onTaskDragEnd();
    }
  };

  return (
    <button
      onClick={() => onViewChange({ type: VIEWS.USER, id: user.id })}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        ...sidebarStyles.listItem,
        ...(isActive ? sidebarStyles.listItemActive : {}),
        ...(isTaskDragOver ? sidebarStyles.listItemDragOver : {}),
      }}
    >
      <span style={{
        ...sidebarStyles.userAvatar,
        backgroundColor: user.isPending ? '#E5E5EA' : (user.color || '#6366f1'),
        color: user.isPending ? '#8E8E93' : 'white',
      }}>
        {user.isPending ? '✉' : (displayName?.charAt(0).toUpperCase() || '?')}
      </span>
      <span style={{
        ...sidebarStyles.listLabel,
        ...(user.isPending ? { color: '#8E8E93' } : {}),
      }}>{displayName}</span>
      {isYou && <span style={sidebarStyles.youBadge}>You</span>}
      {user.isPending && <span style={sidebarStyles.invitedBadge}>Invited</span>}
      {totalTasks > 0 && (
        <span style={sidebarStyles.listCount}>{`${totalTasks - completedTasks}/${totalTasks}`}</span>
      )}
    </button>
  );
}

/**
 * Unassigned tasks item with drop support (to unassign a task)
 */
function UnassignedListItem({
  isActive,
  unassignedTotal,
  unassignedCompleted,
  onViewChange,
  onTaskDropOnUser,
  onTaskDragEnd,
  isReadOnly,
}: {
  isActive: boolean;
  unassignedTotal: number;
  unassignedCompleted: number;
  onViewChange: (view: ViewState) => void;
  onTaskDropOnUser?: (taskId: string, userId: string | null) => void;
  onTaskDragEnd?: () => void;
  isReadOnly: boolean;
}) {
  const [isTaskDragOver, setIsTaskDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (isReadOnly) return;
    const isTaskDrag = e.dataTransfer.types.includes('application/x-task');
    if (isTaskDrag) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (!isTaskDragOver) setIsTaskDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (isReadOnly) return;
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsTaskDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isReadOnly) return;
    const taskId = e.dataTransfer.getData('application/x-task');
    if (taskId && onTaskDropOnUser) {
      e.preventDefault();
      e.stopPropagation();
      onTaskDropOnUser(taskId, null);
      setIsTaskDragOver(false);
      if (onTaskDragEnd) onTaskDragEnd();
    }
  };

  return (
    <button
      onClick={() => onViewChange({ type: VIEWS.USER, id: 'unassigned' })}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        ...sidebarStyles.listItem,
        ...(isActive ? sidebarStyles.listItemActive : {}),
        ...(isTaskDragOver ? sidebarStyles.listItemDragOver : {}),
      }}
    >
      <span style={sidebarStyles.userAvatar}>?</span>
      <span style={sidebarStyles.listLabel}>Unassigned</span>
      <span style={sidebarStyles.listCount}>{`${unassignedTotal - unassignedCompleted}/${unassignedTotal}`}</span>
    </button>
  );
}

// Local styles for sidebar sub-components (matching old widget)
const sidebarStyles: Record<string, React.CSSProperties> = {
  listItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '7px 10px', borderRadius: 6, border: 'none',
    backgroundColor: 'transparent', cursor: 'pointer',
    width: '100%', textAlign: 'left',
    transition: 'background-color 0.15s ease',
    outline: 'none', background: 'none',
  },
  listItemActive: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  listItemDragOver: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    boxShadow: 'inset 0 0 0 2px rgba(99,102,241,0.3)',
    borderRadius: 8,
  },
  userAvatar: {
    width: 20, height: 20, borderRadius: '50%',
    backgroundColor: '#C7C7CC', color: 'white',
    fontSize: 11, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  listLabel: {
    flex: 1, fontSize: 13, color: '#3C3C43',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  listCount: {
    fontSize: 12, color: '#AEAEB2',
  },
  youBadge: {
    fontSize: 10, fontWeight: 500,
    padding: '2px 8px', borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.12)', color: '#6366f1',
    letterSpacing: 0.2,
  },
  invitedBadge: {
    fontSize: 9, fontWeight: 500,
    padding: '1px 6px', borderRadius: 8,
    backgroundColor: 'rgba(255, 149, 0, 0.12)', color: '#FF9500',
    letterSpacing: 0.2,
    flexShrink: 0,
  },
};

function Sidebar(props: SidebarProps) {
  const {
    currentView, onViewChange, taskCounts,
    projectTree, projects, tasksByProject, tasksByUser,
    tasks,
    unassignedTasksCount,
    onAddProject, onReorderProject, onEditProject,
    onTaskDrop, onTaskDropOnUser, onTaskDragEnd,
    allUsers, currentUser, onManageUsers,
    width, getDisplayName, isReadOnly,
    isMobile, isMobileOpen, onMobileClose,
  } = props;

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => new Set());

  // Project drag-and-drop state for reordering
  const [projectDragState, setProjectDragState] = useState<{
    draggingId: string | null; dropTargetId: string | null; dropPosition: string | null;
  }>({ draggingId: null, dropTargetId: null, dropPosition: null });

  const toggleExpand = useCallback((projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }, []);

  // Project drag handlers
  const handleProjectDragStart = useCallback((e: React.DragEvent | null, node: ProjectTreeNode | null) => {
    if (!e || !node) {
      // Reset drag state
      setProjectDragState({ draggingId: null, dropTargetId: null, dropPosition: null });
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-project', node.id);
    setProjectDragState(prev => ({ ...prev, draggingId: node.id }));
  }, []);

  const handleProjectDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Determine position based on mouse Y within the element
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const height = rect.height;
    let position: string;
    if (relY < height * 0.25) position = 'before';
    else if (relY > height * 0.75) position = 'after';
    else position = 'inside'; // nest as child
    setProjectDragState(prev => ({ ...prev, dropTargetId: targetId, dropPosition: position }));
  }, []);

  const handleProjectDragLeave = useCallback((e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setProjectDragState(prev => ({ ...prev, dropTargetId: null, dropPosition: null }));
    }
  }, []);

  const handleProjectDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('application/x-project');
    if (projectId && projectId !== targetId && onReorderProject) {
      const position = projectDragState.dropPosition as 'before' | 'after' | 'inside';
      onReorderProject(projectId, targetId, position || 'after');
    }
    setProjectDragState({ draggingId: null, dropTargetId: null, dropPosition: null });
  }, [onReorderProject, projectDragState.dropPosition]);

  // On mobile, auto-close sidebar when a nav item is tapped
  const handleMobileViewChange = useCallback((view: ViewState) => {
    onViewChange(view);
    if (isMobile && onMobileClose) onMobileClose();
  }, [onViewChange, isMobile, onMobileClose]);

  // Render project tree recursively
  const renderProjectTree = useCallback((nodes: ProjectTreeNode[], depth = 0): React.ReactNode => {
    return nodes.map(node => {
      const isActive = currentView.type === VIEWS.PROJECT && currentView.id === node.id;
      const isExpanded = expandedProjects.has(node.id);

      return (
        <ProjectTreeItem
          key={node.id}
          data-testid={`project-${node.id}`}
          node={node}
          depth={depth}
          isActive={isActive}
          isExpanded={isExpanded}
          onViewChange={handleMobileViewChange}
          onEditProject={onEditProject}
          onAddProject={onAddProject}
          toggleExpand={toggleExpand}
          onTaskDrop={onTaskDrop}
          onTaskDragEnd={onTaskDragEnd}
          dragState={projectDragState}
          onDragStart={handleProjectDragStart}
          onDragOver={handleProjectDragOver}
          onDragLeave={handleProjectDragLeave}
          onDrop={handleProjectDrop}
          isReadOnly={isReadOnly}
        >
          {node.hasChildren && isExpanded && renderProjectTree(node.children, depth + 1)}
        </ProjectTreeItem>
      );
    });
  }, [currentView, expandedProjects, handleMobileViewChange, onEditProject, onAddProject, toggleExpand,
      onTaskDrop, onTaskDragEnd, projectDragState, handleProjectDragStart,
      handleProjectDragOver, handleProjectDragLeave, handleProjectDrop, isReadOnly]);

  // Build user list from allUsers + tasksByUser (with task counts)
  // allUsers already includes isFormerMember entries from HomePage's mergedAllUsers,
  // so we just need to compute task counts here.
  const userListItems = React.useMemo(() => {
    const userMap = new Map<string, { user: WidgetUser; totalTasks: number; completedTasks: number }>();

    (allUsers || []).forEach(u => {
      const userTasks = tasksByUser[u.id];
      const allTasks = userTasks ? userTasks.tasks.filter(t => !t.deleted) : [];
      userMap.set(u.id, {
        user: u,
        totalTasks: allTasks.length,
        completedTasks: allTasks.filter(t => t.completed).length,
      });
    });

    return Array.from(userMap.values());
  }, [allUsers, tasksByUser]);

  // Compute unassigned task counts
  const unassignedCounts = React.useMemo(() => {
    const unassigned = (tasks || []).filter(t => !t.assignedUser && !t.deleted);
    return {
      total: unassigned.length,
      completed: unassigned.filter(t => t.completed).length,
    };
  }, [tasks]);

  return (
    <div
      data-sidebar
      data-testid="sidebar"
      className={isMobileOpen ? 'mobile-sidebar-open' : ''}
      style={{ ...styles.sidebar, width: isMobile ? 280 : width }}
    >
      <div style={{ ...styles.sidebarHeader, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F' }}>Task Manager</span>
        {/* Close button — visible only on mobile via CSS */}
        {onMobileClose && (
          <button className="mobile-sidebar-close" onClick={onMobileClose} aria-label="Close sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>
      <div style={styles.sidebarNav}>
        {/* Nav items */}
        {NAV_ITEMS.map(item => {
          const isActive = currentView.type === item.type;
          const count = taskCounts[item.countKey as keyof typeof taskCounts];
          const displayCount = item.countKey === 'logbook' || item.countKey === 'trash'
            ? count.total
            : count.uncompleted;

          return (
            <button
              key={item.type}
              data-nav-item
              data-testid={`nav-${item.countKey}`}
              onClick={(e) => {
                (e.currentTarget as HTMLElement).blur();
                handleMobileViewChange({ type: item.type });
              }}
              style={{
                ...styles.sidebarItem,
                ...(isActive ? styles.sidebarItemActive : {}),
              }}
            >
              <Icon
                name={item.icon}
                size={16}
                color={isActive ? '#fff' : '#636366'}
              />
              <span style={{ flex: 1 }}>{item.label}</span>
              {displayCount > 0 && (
                <span style={{
                  ...styles.sidebarCount,
                  ...(isActive ? styles.sidebarCountActive : {}),
                }}>
                  {displayCount}
                </span>
              )}
            </button>
          );
        })}

        {/* Projects section */}
        <div style={styles.sidebarSection}>
          <div style={styles.sidebarSectionHeader}>
            <span>Projects</span>
            {!isReadOnly && onAddProject && (
              <button
                data-testid="add-project-btn"
                onClick={() => onAddProject(null)}
                style={styles.sidebarAddBtn}
              >
                <Icon name="plus" size={14} color="#8E8E93" />
              </button>
            )}
          </div>
          {renderProjectTree(projectTree)}
        </div>

        {/* Users section */}
        <div style={styles.sidebarSection}>
          <div style={styles.sidebarSectionHeader}>
            <span>People</span>
            {!isReadOnly && onManageUsers && (
              <button onClick={onManageUsers} style={styles.sidebarAddBtn}>
                <Icon name="settings" size={14} color="#8E8E93" />
              </button>
            )}
          </div>

          {/* Unassigned */}
          <UnassignedListItem
            isActive={currentView.type === VIEWS.USER && currentView.id === 'unassigned'}
            unassignedTotal={unassignedCounts.total}
            unassignedCompleted={unassignedCounts.completed}
            onViewChange={handleMobileViewChange}
            onTaskDropOnUser={onTaskDropOnUser}
            onTaskDragEnd={onTaskDragEnd}
            isReadOnly={isReadOnly}
          />

          {/* Users */}
          {userListItems.map(({ user, totalTasks, completedTasks }) => (
            <UserListItem
              key={user.id}
              user={user}
              isActive={currentView.type === VIEWS.USER && currentView.id === user.id}
              isYou={currentUser?.id === user.id}
              displayName={getDisplayName(user)}
              totalTasks={totalTasks}
              completedTasks={completedTasks}
              onViewChange={handleMobileViewChange}
              onTaskDropOnUser={onTaskDropOnUser}
              onTaskDragEnd={onTaskDragEnd}
              isReadOnly={isReadOnly}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default React.memo(Sidebar);
