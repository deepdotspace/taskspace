/**
 * TaskItem — Single task row in the list view.
 *
 * PERFORMANCE:
 * - Wrapped in React.memo to skip re-renders when props haven't changed.
 * - Static inline styles extracted to module-level constants (tiStyles)
 *   so they are allocated once instead of on every render.
 * - formatDate moved outside the component (pure function).
 */
import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../utils/icons';
import { styles, T } from '../utils/styles';
import {
  Task, Project, Tag, WidgetUser,
  KANBAN_STATUS_COLORS, KANBAN_STATUS_SOFT_COLORS, KANBAN_STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS,
} from '../constants';

// ── Pure helpers — live outside the component ──────────
interface DueMeta { label: string; overdue: boolean; isToday: boolean; }

function getDueMeta(dateStr: string | null | undefined): DueMeta | null {
  if (!dateStr) return null;
  let date: Date;
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateStr);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  const diff = Math.round((dateOnly.getTime() - today.getTime()) / 86400000);
  let label: string;
  if (diff === 0) label = 'Today';
  else if (diff === 1) label = 'Tomorrow';
  else if (diff === -1) label = 'Yesterday';
  else label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { label, overdue: diff < 0, isToday: diff === 0 };
}

/** Completion timestamp for Logbook: time if today, else short date. */
function formatCompletionTime(ts: number | null | undefined): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.getFullYear() === today.getFullYear()
    && d.getMonth() === today.getMonth()
    && d.getDate() === today.getDate();
  if (sameDay) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const PriorityFlagIcon = ({ color }: { color: string }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <path d="M4 22v-7" />
  </svg>
);

interface TaskItemProps {
  task: Task;
  projects: Project[];
  tags: Tag[];
  onComplete?: (id: string) => void;
  onUncomplete?: (id: string) => void;
  onSelect: (task: Task, opts: { metaKey: boolean; shiftKey: boolean; forceSelect?: boolean }) => void;
  onUpdate?: (id: string, updates: Partial<Task>) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string, title?: string) => void;
  isSelected: boolean;
  isMultiSelect: boolean;
  showProject: boolean;
  currentViewProjectId?: string | null;
  isDragging: boolean;
  isDragOver: boolean;
  dragHandlers: {
    onDragStart?: (e: React.DragEvent, task: Task) => void;
    onDragOver?: (e: React.DragEvent, task: Task) => void;
    onDragLeave?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent, task: Task) => void;
    onDragEnd?: (e?: React.DragEvent) => void;
  };
  getDisplayName: (user: WidgetUser | null) => string;
  allUsers: WidgetUser[];
  isReadOnly: boolean;
  isExiting?: boolean;
  isFrozen?: boolean;
  /** Logbook rows: completion timestamp + category tag, no dimming. */
  isLogbook?: boolean;
  /** Upcoming (date-grouped) rows show a priority chip instead of a status pill. */
  showPriorityChip?: boolean;
}

function TaskItem({
  task, projects, tags,
  onComplete, onUncomplete, onSelect, onUpdate, onRestore, onPermanentDelete,
  isSelected, isMultiSelect, showProject, currentViewProjectId,
  isDragging, isDragOver,
  dragHandlers, getDisplayName, allUsers, isReadOnly,
  isExiting = false, isFrozen = false,
  isLogbook = false, showPriorityChip = false,
}: TaskItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title || '');
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCompletedRef = useRef(Boolean(task.completed));
  const justCompletedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save for inline title editing
  useEffect(() => {
    if (!isEditingTitle || isReadOnly || !onUpdate) return;

    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle || trimmedTitle === task.title) return;

    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
    }

    titleDebounceRef.current = setTimeout(() => {
      if (trimmedTitle && trimmedTitle !== task.title) {
        onUpdate(task.id, { title: trimmedTitle });
      }
    }, 300);

    return () => {
      if (titleDebounceRef.current) {
        clearTimeout(titleDebounceRef.current);
      }
    };
  }, [editTitle, isEditingTitle, task.id, task.title, isReadOnly, onUpdate]);

  // Auto-resize textarea to fit content
  const autoResizeTextarea = () => {
    if (titleInputRef.current) {
      titleInputRef.current.style.height = 'auto';
      titleInputRef.current.style.height = titleInputRef.current.scrollHeight + 'px';
    }
  };

  // Sync editTitle when task.title changes externally
  useEffect(() => {
    if (task.title !== editTitle && !isEditingTitle) {
      setEditTitle(task.title || '');
    }
  }, [task.title]);

  // Focus and select when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
      setTimeout(autoResizeTextarea, 0);
    }
  }, [isEditingTitle]);

  // Auto-resize on content change
  useEffect(() => {
    if (isEditingTitle) {
      autoResizeTextarea();
    }
  }, [editTitle, isEditingTitle]);

  // Track completion animation
  useEffect(() => {
    const wasCompleted = prevCompletedRef.current;
    const isNowCompleted = Boolean(task.completed);
    prevCompletedRef.current = isNowCompleted;

    if (!wasCompleted && isNowCompleted) {
      setJustCompleted(true);
      justCompletedTimerRef.current = setTimeout(() => {
        setJustCompleted(false);
      }, 600);
    } else if (wasCompleted && !isNowCompleted) {
      setJustCompleted(false);
    }
  }, [task.completed]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
      if (justCompletedTimerRef.current) clearTimeout(justCompletedTimerRef.current);
    };
  }, []);

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return;

    if (isExiting && onUncomplete) {
      onUncomplete(task.id);
      return;
    }

    if (onComplete) {
      onComplete(task.id);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger selection if clicking on title textarea
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' || isEditingTitle) {
      return;
    }
    onSelect(task, {
      metaKey: e.metaKey || e.ctrlKey,
      shiftKey: e.shiftKey,
    });
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(task, {
      metaKey: e.metaKey || e.ctrlKey,
      shiftKey: e.shiftKey,
    });
  };

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReadOnly && !isMultiSelect && !task.completed && !task.deleted && onUpdate) {
      // Force select the task (bypasses toggle behavior) to ensure detail panel opens
      onSelect(task, { metaKey: false, shiftKey: false, forceSelect: true });
      setIsEditingTitle(true);
      setEditTitle(task.title || '');
    }
  };

  const handleTitleBlur = () => {
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
    }
    setIsEditingTitle(false);
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle && trimmedTitle !== task.title && onUpdate) {
      onUpdate(task.id, { title: trimmedTitle });
    } else if (!trimmedTitle) {
      setEditTitle(task.title || '');
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTitleBlur();
    }
    if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setEditTitle(task.title || '');
    }
  };

  const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;
  const taskTags = (task.tagIds || []).map(tid => tags.find(t => t.id === tid)).filter(Boolean) as Tag[];
  const isCompleted = Boolean(task.completed);

  const rowOpacity = isDragging ? 0.4 : (isCompleted && !isLogbook ? 0.5 : 1);

  const bg = isSelected ? T.bgSelected
    : isHovered ? T.bgSelected
    : '#fff';
  const leftBorder = isSelected ? `3px solid ${T.accent}` : '3px solid transparent';

  const animating = isFrozen || justCompleted || isExiting;

  // Subproject indicator (task belongs to a nested project shown from a parent view)
  const isSubproject = Boolean(task._isInSubproject);

  // ── Meta derivations ──
  const statusColor = KANBAN_STATUS_COLORS[task.kanbanStatus] || T.gray;
  const statusSoft = KANBAN_STATUS_SOFT_COLORS[task.kanbanStatus] || T.graySoft;
  const statusLabel = KANBAN_STATUS_LABELS[task.kanbanStatus] || task.kanbanStatus;

  const hasPriority = Boolean(task.priority && task.priority !== 'none');
  const prioColor = PRIORITY_COLORS[task.priority] || T.gray;
  const prioLabel = PRIORITY_LABELS[task.priority] || '';

  const showProjectChip = Boolean(
    (showProject && project)
    || (currentViewProjectId && task.projectId && task.projectId !== currentViewProjectId && project)
  );

  const dueMeta = getDueMeta(task.dueDate);
  const completionTime = formatCompletionTime(task.completedAt);

  const titleColor = isCompleted
    ? (isLogbook ? T.textMuted : '#8A8D98')
    : (task.deleted ? T.textMuted : T.textPrimary);

  // Which meta chips to show (per view/state)
  const showStatus = !isLogbook && !showPriorityChip;
  const showPriority = !isLogbook && !isCompleted && showPriorityChip && hasPriority;
  const showDue = !isLogbook && !isCompleted && !showPriorityChip && !!dueMeta;
  const showProj = !isLogbook && !isCompleted && showProjectChip;
  const showTags = (!isCompleted || isLogbook) && taskTags.length > 0;
  const showTime = isLogbook && !!completionTime;
  const showAvatar = (!isCompleted || isLogbook) && !!task.assignedUser;

  const dueColor = dueMeta?.overdue ? T.red : dueMeta?.isToday ? T.accent : T.textMuted;
  const dueBg = dueMeta?.overdue ? T.redSoft : dueMeta?.isToday ? T.accentTint : 'transparent';

  const matchedUser = task.assignedUser ? (allUsers || []).find(u => u.id === task.assignedUser!.id) : null;
  const assigneeName = task.assignedUser
    ? (matchedUser ? getDisplayName(matchedUser) : (task.assignedUser.name || 'Unknown'))
    : '';
  const assigneeColor = matchedUser?.color || task.assignedUser?.color || T.accentAvatar;

  return (
    <div
      data-testid={`task-item-${task.id}`}
      data-task-item
      draggable={!isExiting && !isFrozen && !isReadOnly && !task.deleted && !isEditingTitle}
      onDragStart={(e) => !isReadOnly && !isEditingTitle && dragHandlers?.onDragStart?.(e, task)}
      onDragOver={(e) => !isReadOnly && dragHandlers?.onDragOver?.(e, task)}
      onDragLeave={(e) => !isReadOnly && dragHandlers?.onDragLeave?.(e)}
      onDrop={(e) => !isReadOnly && dragHandlers?.onDrop?.(e, task)}
      onDragEnd={() => !isReadOnly && dragHandlers?.onDragEnd?.()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      style={{
        ...styles.taskItem,
        background: bg,
        opacity: rowOpacity,
        borderLeft: leftBorder,
        cursor: task.completed ? 'default' : 'pointer',
        position: 'relative',
        animation: animating
          ? (isExiting ? 'taskCompleteFadeOut 2s ease forwards' : 'taskCompleteHighlight 1.2s ease-out')
          : 'none',
        willChange: animating ? 'opacity, background-color' : 'auto',
      }}
    >
      {/* Drop indicator */}
      <div style={{
        ...tiStyles.dropIndicator,
        opacity: isDragOver ? 1 : 0,
      }} />

      {/* Checkbox - hidden for deleted tasks */}
      {!task.deleted && (
        <button
          data-testid={`task-checkbox-${task.id}`}
          onClick={handleComplete}
          disabled={isReadOnly}
          style={{
            ...styles.taskCheckbox,
            ...(task.completed ? styles.taskCheckboxChecked : {}),
            cursor: isReadOnly ? 'not-allowed' : 'pointer',
            opacity: isReadOnly ? 0.6 : 1,
          }}
        >
          {task.completed && <Icon name="check" size={10} color="#fff" strokeWidth={3.4} />}
        </button>
      )}

      {/* Title (single-line) */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        {isEditingTitle ? (
          <textarea
            ref={titleInputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            rows={1}
            style={tiStyles.titleInput}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            data-testid={`task-title-${task.id}`}
            onClick={handleTitleClick}
            onDoubleClick={handleTitleDoubleClick}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            style={{
              ...styles.taskTitle,
              color: titleColor,
              textDecoration: task.completed ? 'line-through' : 'none',
              cursor: task.completed || task.deleted || isReadOnly || isMultiSelect ? 'default' : 'text',
            }}
          >
            {task.title || 'Untitled'}
          </div>
        )}
        {isSubproject && <span style={styles.subprojectIndicator}>↳</span>}
      </div>

      {/* Meta cluster */}
      {!task.deleted && (
        <div style={tiStyles.meta}>
          {/* Status pill */}
          {showStatus && (
            <span style={{ ...styles.kanbanBadge, color: statusColor, backgroundColor: statusSoft }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: statusColor }} />
              {statusLabel}
            </span>
          )}

          {/* Priority chip (Upcoming) */}
          {showPriority && (
            <span style={{ ...tiStyles.priorityChip, color: prioColor }}>
              <PriorityFlagIcon color={prioColor} />
              {prioLabel}
            </span>
          )}

          {/* Due chip */}
          {showDue && dueMeta && (
            <span style={{
              ...tiStyles.dueChip,
              color: dueColor,
              backgroundColor: dueBg,
            }}>
              <Icon name="calendar" size={11} color={dueColor} />
              {dueMeta.label}
            </span>
          )}

          {/* Project chip */}
          {showProj && project && (
            <span style={styles.taskProject}>
              <span style={{ ...styles.taskProjectDot, background: project.color || T.accentAvatar }} />
              {project.title}
            </span>
          )}

          {/* Tags */}
          {showTags && taskTags.map(tag => (
            <span
              key={tag.id}
              style={{
                ...styles.taskTag,
                backgroundColor: (tag.color || T.accent) + '1F',
                color: tag.color || T.accent,
              }}
            >
              {tag.name}
            </span>
          ))}

          {/* Completion timestamp (Logbook) */}
          {showTime && (
            <span style={{ fontSize: '11.5px', color: T.textFaint, flexShrink: 0 }}>{completionTime}</span>
          )}

          {/* Assignee avatar */}
          {showAvatar && (
            <span
              style={{ ...styles.taskAssigneeAvatar, background: assigneeColor }}
              title={assigneeName}
            >
              {assigneeName?.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      )}

      {/* Restore/Delete buttons for trash view */}
      {task.deleted && (
        <div style={{
          ...tiStyles.trashActions,
          opacity: isHovered ? 1 : 0.85,
        }}>
          {onRestore && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRestore(task.id);
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#34C759';
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#34C75915';
                (e.currentTarget as HTMLButtonElement).style.color = '#34C759';
              }}
              style={tiStyles.restoreBtn}
              title="Restore task"
            >
              <Icon name="rotate-ccw" size={14} color="currentColor" />
              <span>Restore</span>
            </button>
          )}
          {onPermanentDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPermanentDelete(task.id, task.title);
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FF3B30';
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FF3B3015';
                (e.currentTarget as HTMLButtonElement).style.color = '#FF3B30';
              }}
              style={tiStyles.deleteBtn}
              title="Delete permanently"
            >
              <Icon name="trash-2" size={14} color="currentColor" />
              <span>Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(TaskItem);

// ── Static styles (allocated once at module level) ─────────

const tiStyles: Record<string, React.CSSProperties> = {
  dropIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    background: T.accent,
  },
  titleInput: {
    fontSize: '13.5px',
    fontWeight: 500,
    color: T.textPrimary,
    lineHeight: 1.4,
    border: `1px solid ${T.accent}`,
    borderRadius: 6,
    padding: '2px 6px',
    outline: 'none',
    width: '100%',
    backgroundColor: '#fff',
    boxSizing: 'border-box' as const,
    resize: 'none' as const,
    overflow: 'hidden',
    fontFamily: T.font,
    minHeight: '20px',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    marginLeft: 'auto',
    paddingLeft: 4,
  },
  priorityChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: '11.5px',
    fontWeight: 550,
    flexShrink: 0,
  },
  dueChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: '11.5px',
    fontWeight: 550,
    padding: '3px 8px',
    borderRadius: 6,
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
  },
  trashActions: {
    display: 'flex',
    gap: 6,
    marginLeft: 'auto',
    alignItems: 'center',
    flexShrink: 0,
    transition: 'opacity 0.15s ease',
  },
  restoreBtn: {
    padding: '5px 11px',
    fontSize: 12,
    fontWeight: 500,
    color: '#34C759',
    backgroundColor: '#34C75915',
    border: 'none',
    borderRadius: 7,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    transition: 'all 0.15s ease',
  },
  deleteBtn: {
    padding: '5px 11px',
    fontSize: 12,
    fontWeight: 500,
    color: '#FF3B30',
    backgroundColor: '#FF3B3015',
    border: 'none',
    borderRadius: 7,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    transition: 'all 0.15s ease',
  },
};
