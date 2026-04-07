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
import {
  Task, Project, Tag, WidgetUser,
} from '../constants';

// ── Pure helper — lives outside the component ──────────
function formatDate(dateStr: string | null | undefined): string | null {
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
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

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
}

function TaskItem({
  task, projects, tags,
  onComplete, onUncomplete, onSelect, onUpdate, onRestore, onPermanentDelete,
  isSelected, isMultiSelect, showProject, currentViewProjectId,
  isDragging, isDragOver,
  dragHandlers, getDisplayName, allUsers, isReadOnly,
  isExiting = false, isFrozen = false,
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
  const contentOpacity = task.completed || task.deleted ? 0.5 : 1;
  const rowOpacity = isDragging ? 0.4 : 1;

  const bg = isDragOver ? '#E8F0FE'
    : isSelected ? 'rgba(0,122,255,0.12)'
    : isHovered ? 'rgba(0,0,0,0.02)'
    : '#fff';
  const leftBorder = isSelected ? '3px solid #007AFF' : '3px solid transparent';

  const animating = isFrozen || justCompleted || isExiting;

  return (
    <div
      data-testid={`task-item-${task.id}`}
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
        ...tiStyles.row,
        background: bg,
        opacity: rowOpacity,
        borderLeft: leftBorder,
        cursor: task.completed ? 'default' : 'pointer',
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
            ...tiStyles.checkbox,
            border: `2px solid ${task.completed ? '#34C759' : '#D1D1D6'}`,
            background: task.completed ? '#34C759' : 'transparent',
            cursor: isReadOnly ? 'not-allowed' : 'pointer',
            opacity: isReadOnly ? 0.5 : contentOpacity,
          }}
        >
          {task.completed && <Icon name="check" size={10} color="#fff" strokeWidth={3} />}
        </button>
      )}

      {/* Content */}
      <div style={{ ...tiStyles.content, opacity: contentOpacity }}>
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
              ...tiStyles.titleDisplay,
              color: task.completed ? '#8E8E93' : '#1C1C1E',
              textDecoration: task.completed ? 'line-through' : 'none',
              cursor: task.completed || task.deleted || isReadOnly || isMultiSelect ? 'default' : 'text',
            }}
          >
            {task.title || 'Untitled'}
          </div>
        )}

        <div style={tiStyles.metaRow}>
          {/* Due date */}
          {formatDate(task.dueDate) && (
            <span style={tiStyles.metaItem}>
              <Icon name="calendar" size={12} color="#8E8E93" />
              {formatDate(task.dueDate)}
            </span>
          )}

          {/* Project badge */}
          {((showProject && project) || (currentViewProjectId && task.projectId && task.projectId !== currentViewProjectId && project)) && (
            <span style={tiStyles.metaItem}>
              <span style={{ ...tiStyles.projectDot, background: project!.color || '#007AFF' }} />
              {project!.title}
            </span>
          )}

          {/* Assigned user */}
          {task.assignedUser && (() => {
            const matchedUser = (allUsers || []).find(u => u.id === task.assignedUser!.id);
            const displayName = matchedUser
              ? getDisplayName(matchedUser)
              : (task.assignedUser!.name || 'Unknown');
            const userColor = matchedUser?.color || task.assignedUser!.color || '#007AFF';
            return (
              <span style={tiStyles.metaItem}>
                <span style={{ ...tiStyles.userAvatar, background: userColor }}>
                  {displayName?.charAt(0).toUpperCase()}
                </span>
                {displayName}
              </span>
            );
          })()}

          {/* Tags */}
          {taskTags.length > 0 && (
            <div style={tiStyles.tagContainer}>
              {taskTags.map(tag => (
                <span
                  key={tag.id}
                  style={{
                    ...tiStyles.tagBadge,
                    backgroundColor: tag.color + '20',
                    color: tag.color,
                    border: `1px solid ${tag.color}40`,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

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
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 12px',
    paddingLeft: 9,
    borderBottom: '1px solid #F0F0F0',
    position: 'relative',
    transition: 'background-color 0.1s ease, border-left-color 0.1s ease',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    pointerEvents: 'auto',
  },
  dropIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    background: '#007AFF',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
    padding: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleInput: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 1.4,
    border: '1px solid #007AFF',
    borderRadius: 4,
    padding: '2px 6px',
    outline: 'none',
    width: '100%',
    backgroundColor: '#fff',
    boxSizing: 'border-box' as const,
    resize: 'none' as const,
    overflow: 'hidden',
    fontFamily: 'inherit',
    minHeight: '22px',
  },
  titleDisplay: {
    fontSize: 14,
    lineHeight: 1.4,
    padding: '2px 6px',
    marginLeft: -6,
    borderRadius: 4,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  metaRow: {
    display: 'flex',
    gap: 12,
    marginTop: 4,
    flexWrap: 'wrap' as const,
  },
  metaItem: {
    fontSize: 12,
    color: '#8E8E93',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  userAvatar: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    color: '#fff',
    fontSize: 9,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagContainer: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  tagBadge: {
    fontSize: 10,
    fontWeight: 500,
    padding: '2px 6px',
    borderRadius: 4,
  },
  trashActions: {
    display: 'flex',
    gap: 6,
    marginRight: 12,
    alignItems: 'center',
    transition: 'opacity 0.15s ease',
  },
  restoreBtn: {
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: '#34C759',
    backgroundColor: '#34C75915',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  deleteBtn: {
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: '#FF3B30',
    backgroundColor: '#FF3B3015',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
};
