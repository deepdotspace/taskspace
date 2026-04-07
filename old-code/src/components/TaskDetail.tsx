/**
 * Task Detail Sidebar Panel with user assignment and tags
 * Ported from previous_task_widget/components/TaskDetail.jsx
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Task, Project, Tag, WidgetUser,
  PRIORITIES, TAG_COLORS, KANBAN_STATUS_CONFIG,
} from '../constants';
import { DatePicker } from './ui';
import { Icon } from '../utils/icons';
import CustomDropdown from './CustomDropdown';
import ConfirmModal from './ConfirmModal';

function formatDateTime(isoString: string | number | null | undefined): string | null {
  if (isoString == null) return null;
  let ms: number;
  if (typeof isoString === 'number') {
    ms = isoString;
  } else {
    ms = Date.parse(isoString);
  }
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

// Helper to build hierarchical project options for CustomDropdown
function buildProjectOptions(
  projects: Project[],
  parentId: string | null = null,
  depth = 0
): Array<{ value: string; label: string; indent: number; color?: string }> {
  const children = projects
    .filter(p => p.parentId === parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const result: Array<{ value: string; label: string; indent: number; color?: string }> = [];

  children.forEach(project => {
    result.push({
      value: project.id,
      label: project.title,
      indent: depth,
      color: project.color,
    });
    result.push(...buildProjectOptions(projects, project.id, depth + 1));
  });

  return result;
}

interface TaskDetailProps {
  task: Task;
  projects: Project[];
  allUsers: WidgetUser[];
  tags: Tag[];
  onUpdate?: (id: string, updates: Partial<Task>) => void;
  onDelete?: (id: string) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  onClose: () => void;
  onAddProject?: (data: { title: string; color: string }) => Project | null;
  onAddTag?: (data: Partial<Tag>) => Promise<Tag> | Tag | null;
  onDeleteTag?: (tagId: string) => void;
  onAddTagToTask?: (taskId: string, tagId: string) => void;
  onRemoveTagFromTask?: (taskId: string, tagId: string) => void;
  getDisplayName: (user: WidgetUser | null) => string;
  isReadOnly: boolean;
  width?: number;
  fullHeight?: boolean;
  isMobile?: boolean;
}

function TaskDetail({
  task, projects, allUsers, tags,
  onUpdate, onDelete, onRestore, onPermanentDelete, onClose,
  onAddProject, onAddTag, onDeleteTag, onAddTagToTask, onRemoveTagFromTask,
  getDisplayName, isReadOnly, width = 340, fullHeight = false, isMobile = false,
}: TaskDetailProps) {
  // Local state for debounced fields
  const [title, setTitle] = useState(task?.title || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [localDueDate, setLocalDueDate] = useState(task?.dueDate || '');
  const [showTagInput, setShowTagInput] = useState(false);
  const [showTagManagement, setShowTagManagement] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[5] || '#007AFF');
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#007AFF');

  // Confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: string | null;
    data: { taskId?: string; taskTitle?: string; tagId?: string; tagName?: string; userId?: string; userName?: string } | null;
  }>({ isOpen: false, type: null, data: null });

  const assignDropdownRef = useRef<HTMLDivElement>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleFocusedRef = useRef(false);
  const notesFocusedRef = useRef(false);

  // Debounced save for title
  useEffect(() => {
    if (!task || isReadOnly || title === task.title) return;

    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);

    titleDebounceRef.current = setTimeout(() => {
      if (title !== task.title && onUpdate) {
        onUpdate(task.id, { title });
      }
    }, 300);

    return () => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    };
  }, [title, task?.id, task?.title, isReadOnly, onUpdate]);

  // Debounced save for notes
  useEffect(() => {
    if (!task || isReadOnly || notes === task.notes) return;

    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);

    notesDebounceRef.current = setTimeout(() => {
      if (notes !== task.notes && onUpdate) {
        onUpdate(task.id, { notes });
      }
    }, 300);

    return () => {
      if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    };
  }, [notes, task?.id, task?.notes, isReadOnly, onUpdate]);

  // Auto-resize title textarea
  const autoResizeTitleTextarea = () => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = 'auto';
      const maxHeight = 150;
      const newHeight = Math.min(titleTextareaRef.current.scrollHeight, maxHeight);
      titleTextareaRef.current.style.height = newHeight + 'px';
    }
  };

  useEffect(() => {
    autoResizeTitleTextarea();
  }, [title]);

  // Close assign dropdown when clicking outside
  useEffect(() => {
    if (!showAssignDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(e.target as Node)) {
        setShowAssignDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAssignDropdown]);

  // Sync title/notes/dueDate when task changes.
  // Skip overwriting a field while the user is actively typing in it to avoid
  // a race where a debounced save round-trips from the server and clobbers
  // characters the user typed after the save was dispatched.
  useEffect(() => {
    if (task) {
      if (!titleFocusedRef.current) setTitle(task.title || '');
      if (!notesFocusedRef.current) setNotes(task.notes || '');
      setLocalDueDate(task.dueDate || '');
      setTimeout(autoResizeTitleTextarea, 0);
    }
  }, [task?.id, task?.title, task?.notes, task?.dueDate]);

  const createdAtLabel = useMemo(() => formatDateTime(task?.createdAt), [task?.createdAt]);
  const completedAtLabel = useMemo(() => formatDateTime(task?.completedAt), [task?.completedAt]);

  const handleTitleBlur = () => {
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    if (!isReadOnly && title !== task.title && onUpdate) {
      onUpdate(task.id, { title });
    }
  };

  const handleNotesBlur = () => {
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    if (!isReadOnly && notes !== task.notes && onUpdate) {
      onUpdate(task.id, { notes });
    }
  };

  if (!task) return null;

  const sidebarStyle: React.CSSProperties = {
    ...dtStyles.sidebar,
    width: isMobile ? '100%' : width,
    minWidth: isMobile ? '100%' : width,
    maxWidth: isMobile ? '100%' : width,
    ...(fullHeight ? {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      height: '100%',
      zIndex: 10,
    } : {}),
  };

  return (
    <div data-task-detail data-testid="task-detail" className={isMobile ? 'mobile-detail-overlay' : ''} style={sidebarStyle}>
      {/* Header */}
      <div style={dtStyles.header}>
        {isMobile && (
          <button onClick={onClose} style={dtStyles.mobileBackButton}>
            <Icon name="chevron-left" size={20} color="#007AFF" />
            <span style={{ fontSize: 16, color: '#007AFF', fontWeight: 400 }}>Back</span>
          </button>
        )}
        {!isMobile && <h3 style={dtStyles.headerTitle}>{isReadOnly ? 'Task Details' : 'Details'}</h3>}
        <div style={dtStyles.headerActions}>
          {!isReadOnly && (task.deleted ? (
            <>
              <button onClick={() => onRestore?.(task.id)} style={dtStyles.restoreButton}>
                <Icon name="rotate-ccw" size={14} />
              </button>
              <button onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  type: 'permanentDelete',
                  data: { taskId: task.id, taskTitle: task.title },
                });
              }} style={dtStyles.deleteHeaderButton}>
                <Icon name="trash-2" size={14} />
              </button>
            </>
          ) : onDelete && (
            <button data-testid="task-detail-delete" onClick={() => onDelete(task.id)} style={dtStyles.deleteHeaderButton}>
              <Icon name="trash-2" size={14} />
            </button>
          ))}
          {!isMobile && (
            <button data-testid="task-detail-close" onClick={onClose} style={dtStyles.closeButton}>
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={dtStyles.scrollableContent}>
        {/* Title */}
        <textarea
          ref={titleTextareaRef}
          data-testid="task-detail-title"
          value={title}
          onChange={(e) => !isReadOnly && setTitle(e.target.value)}
          onFocus={() => { titleFocusedRef.current = true; }}
          onBlur={() => { titleFocusedRef.current = false; handleTitleBlur(); }}
          placeholder="Task title"
          disabled={isReadOnly || task.deleted}
          rows={1}
          style={{
            ...dtStyles.titleInput,
            ...((isReadOnly || task.deleted) ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
          }}
        />

        {/* Notes */}
        <textarea
          data-testid="task-detail-notes"
          value={notes}
          onChange={(e) => !isReadOnly && setNotes(e.target.value)}
          onFocus={() => { notesFocusedRef.current = true; }}
          onBlur={() => { notesFocusedRef.current = false; handleNotesBlur(); }}
          placeholder="Add notes..."
          disabled={isReadOnly || task.deleted}
          style={{
            ...dtStyles.notesInput,
            ...((isReadOnly || task.deleted) ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
          }}
          rows={4}
        />

        {/* Due Date */}
        {!task.deleted && !isReadOnly && (
          <div style={dtStyles.section}>
            <div style={dtStyles.sectionHeader}>
              <Icon name="calendar" size={13} color="#9ca3af" />
              <span style={dtStyles.sectionTitle}>Due Date</span>
            </div>
            <DatePicker
              value={localDueDate}
              onChange={(val) => {
                const newVal = val || '';
                setLocalDueDate(newVal);
                onUpdate?.(task.id, { dueDate: val || null });
              }}
            />
          </div>
        )}

        {/* Project */}
        {!task.deleted && !isReadOnly && (
          <div style={dtStyles.section}>
            <div style={dtStyles.sectionHeader}>
              <Icon name="folder" size={13} color="#9ca3af" />
              <span style={dtStyles.sectionTitle}>Project</span>
            </div>

            {showNewProjectForm ? (
              <div style={dtStyles.newProjectForm}>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newProjectName.trim() && onAddProject) {
                      const newProject = onAddProject({
                        title: newProjectName.trim(),
                        color: newProjectColor,
                      });
                      if (newProject) {
                        onUpdate?.(task.id, { projectId: newProject.id });
                      }
                      setNewProjectName('');
                      setNewProjectColor('#007AFF');
                      setShowNewProjectForm(false);
                    }
                    if (e.key === 'Escape') {
                      setNewProjectName('');
                      setNewProjectColor('#007AFF');
                      setShowNewProjectForm(false);
                    }
                  }}
                  placeholder="Project name"
                  style={dtStyles.newProjectInput}
                  autoFocus
                />
                <div style={dtStyles.colorPickerRow}>
                  {TAG_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewProjectColor(color)}
                      style={{
                        ...dtStyles.colorOption,
                        backgroundColor: color,
                        ...(newProjectColor === color ? dtStyles.colorOptionSelected : {}),
                      }}
                    />
                  ))}
                </div>
                <div style={dtStyles.newProjectActions}>
                  <button
                    onClick={() => {
                      setNewProjectName('');
                      setNewProjectColor('#007AFF');
                      setShowNewProjectForm(false);
                    }}
                    style={dtStyles.newProjectCancelBtn}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (newProjectName.trim() && onAddProject) {
                        const newProject = onAddProject({
                          title: newProjectName.trim(),
                          color: newProjectColor,
                        });
                        if (newProject) {
                          onUpdate?.(task.id, { projectId: newProject.id });
                        }
                        setNewProjectName('');
                        setNewProjectColor('#007AFF');
                        setShowNewProjectForm(false);
                      }
                    }}
                    disabled={!newProjectName.trim()}
                    style={{
                      ...dtStyles.newProjectSaveBtn,
                      opacity: newProjectName.trim() ? 1 : 0.5,
                    }}
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <CustomDropdown
                options={[
                  { value: '', label: 'No Project' },
                  ...buildProjectOptions(projects || []),
                  ...(onAddProject ? [{ value: '__new__', label: '+ New Project', isAction: true }] : []),
                ]}
                value={task.projectId || ''}
                onChange={(val) => {
                  if (val === '__new__') {
                    setShowNewProjectForm(true);
                  } else {
                    onUpdate?.(task.id, { projectId: val || null });
                  }
                }}
                placeholder="No Project"
                searchable={(projects || []).length > 5}
              />
            )}
          </div>
        )}

        {/* Assigned To */}
        {!task.deleted && !isReadOnly && (
          <div style={dtStyles.section}>
            <div style={dtStyles.sectionHeader}>
              <Icon name="user" size={13} color="#9ca3af" />
              <span style={dtStyles.sectionTitle}>Assign To</span>
            </div>
            <div ref={assignDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                style={dtStyles.assignButton}
              >
                {task.assignedUser ? (() => {
                  const matchedUser = (allUsers || []).find(u => u.id === task.assignedUser!.id);
                  const displayName = matchedUser
                    ? getDisplayName(matchedUser)
                    : (task.assignedUser!.name || 'Unknown');
                  const userColor = matchedUser?.color || task.assignedUser!.color || '#6366f1';
                  const isPending = matchedUser?.isPending;
                  return (
                    <>
                      <span style={{
                        ...dtStyles.assignAvatar,
                        backgroundColor: isPending ? '#E5E5EA' : userColor,
                        color: isPending ? '#8E8E93' : 'white',
                      }}>
                        {isPending ? '✉' : (displayName?.charAt(0).toUpperCase() || '?')}
                      </span>
                      <span style={dtStyles.assignName}>
                        {displayName}
                        {isPending && <span style={dtStyles.pendingLabel}> (invited)</span>}
                      </span>
                    </>
                  );
                })() : (
                  <>
                    <span style={{ ...dtStyles.assignAvatar, backgroundColor: '#d1d5db' }}>?</span>
                    <span style={dtStyles.assignNameEmpty}>Unassigned</span>
                  </>
                )}
                <Icon
                  name={showAssignDropdown ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color="#d1d5db"
                />
              </button>

              {/* Dropdown Panel */}
              {showAssignDropdown && (
                <div style={dtStyles.assignDropdownPanel}>
                  {/* Unassigned option */}
                  <div style={{
                    ...dtStyles.assignDropdownItemWrapper,
                    backgroundColor: !task.assignedUser ? '#f9fafb' : 'transparent',
                  }}>
                    <button
                      onClick={() => {
                        onUpdate?.(task.id, { assignedUser: null });
                        setShowAssignDropdown(false);
                      }}
                      style={dtStyles.assignDropdownItemBtn}
                    >
                      <span style={{ ...dtStyles.assignAvatar, backgroundColor: '#d1d5db' }}>?</span>
                      <span style={dtStyles.assignDropdownItemName}>Unassigned</span>
                      {!task.assignedUser && (
                        <Icon name="check" size={14} color="#6366f1" />
                      )}
                    </button>
                  </div>

                  {/* Active team members */}
                  {(allUsers || []).filter(u => !u.isPending).map(user => {
                    const displayName = getDisplayName ? getDisplayName(user) : user.name;
                    const isSelected = task.assignedUser?.id === user.id;

                    return (
                      <div
                        key={user.id}
                        style={{
                          ...dtStyles.assignDropdownItemWrapper,
                          backgroundColor: isSelected ? '#f9fafb' : 'transparent',
                        }}
                      >
                        <button
                          onClick={() => {
                            onUpdate?.(task.id, {
                              assignedUser: {
                                id: user.id,
                                name: user.name,
                                email: user.email,
                                color: user.color,
                              },
                            });
                            setShowAssignDropdown(false);
                          }}
                          style={dtStyles.assignDropdownItemBtn}
                        >
                          <span style={{
                            ...dtStyles.assignAvatar,
                            backgroundColor: user.color || '#6366f1',
                          }}>
                            {displayName?.charAt(0).toUpperCase() || '?'}
                          </span>
                          <div style={dtStyles.assignDropdownItemInfo}>
                            <span style={dtStyles.assignDropdownItemName}>
                              {displayName}
                            </span>
                            {user.email && (
                              <span style={dtStyles.assignDropdownItemEmail}>{user.email}</span>
                            )}
                          </div>
                          {isSelected && (
                            <Icon name="check" size={14} color="#6366f1" />
                          )}
                        </button>
                      </div>
                    );
                  })}

                  {/* Pending invited members */}
                  {(allUsers || []).filter(u => u.isPending).length > 0 && (
                    <>
                      <div style={dtStyles.assignDropdownDivider} />
                      <div style={dtStyles.assignDropdownSectionLabel}>
                        Invited
                      </div>
                      {(allUsers || []).filter(u => u.isPending).map(user => {
                        const displayName = user.email || user.name || 'Invited User';
                        const isSelected = task.assignedUser?.id === user.id;

                        return (
                          <div
                            key={user.id}
                            style={{
                              ...dtStyles.assignDropdownItemWrapper,
                              backgroundColor: isSelected ? '#f9fafb' : 'transparent',
                            }}
                          >
                            <button
                              onClick={() => {
                                onUpdate?.(task.id, {
                                  assignedUser: {
                                    id: user.id,
                                    name: displayName,
                                    email: user.email,
                                    color: user.color,
                                  },
                                });
                                setShowAssignDropdown(false);
                              }}
                              style={dtStyles.assignDropdownItemBtn}
                            >
                              <span style={{
                                ...dtStyles.assignAvatar,
                                backgroundColor: '#E5E5EA',
                                color: '#8E8E93',
                                fontSize: 10,
                              }}>
                                ✉
                              </span>
                              <div style={dtStyles.assignDropdownItemInfo}>
                                <span style={{ ...dtStyles.assignDropdownItemName, color: '#6B7280' }}>
                                  {displayName}
                                </span>
                              </div>
                              {isSelected && (
                                <Icon name="check" size={14} color="#6366f1" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assigned By */}
        {!task.deleted && task.assignedBy && (
          <div style={dtStyles.section}>
            <div style={dtStyles.sectionHeader}>
              <Icon name="user-check" size={13} color="#9ca3af" />
              <span style={dtStyles.sectionTitle}>Assigned By</span>
            </div>
            {(() => {
              const matchedAssigner = (allUsers || []).find(u => u.id === task.assignedBy!.id);
              const assignerDisplayName = matchedAssigner
                ? getDisplayName(matchedAssigner)
                : (task.assignedBy!.name || 'Unknown');
              const assignerColor = matchedAssigner?.color || task.assignedBy!.color || '#6366f1';
              return (
                <div style={dtStyles.assignedByContainer}>
                  <span style={{
                    ...dtStyles.assignAvatar,
                    backgroundColor: assignerColor,
                  }}>
                    {assignerDisplayName?.charAt(0).toUpperCase() || '?'}
                  </span>
                  <div style={dtStyles.assignedByInfo}>
                    <span style={dtStyles.assignedByName}>{assignerDisplayName}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Priority */}
        {!task.deleted && !isReadOnly && (
          <div data-testid="task-detail-priority" style={dtStyles.section}>
            <div style={dtStyles.sectionHeader}>
              <Icon name="alert-circle" size={13} color="#9ca3af" />
              <span style={dtStyles.sectionTitle}>Priority</span>
            </div>
            <CustomDropdown
              options={[
                { value: 'none', label: 'None', color: '#9ca3af' },
                { value: PRIORITIES.LOW, label: 'Low', color: '#22c55e' },
                { value: PRIORITIES.MEDIUM, label: 'Medium', color: '#f59e0b' },
                { value: PRIORITIES.HIGH, label: 'High', color: '#ef4444' },
              ]}
              value={task.priority || 'none'}
              onChange={(val) => onUpdate?.(task.id, { priority: val })}
            />
          </div>
        )}

        {/* Kanban Status */}
        {!task.deleted && !isReadOnly && (
          <div style={dtStyles.section}>
            <div style={dtStyles.sectionHeader}>
              <Icon name="columns" size={13} color="#6366f1" />
              <span style={dtStyles.sectionTitle}>Kanban Status</span>
            </div>
            <div style={dtStyles.kanbanStatusGrid}>
              {KANBAN_STATUS_CONFIG.map(status => {
                const isSelected = task.kanbanStatus === status.id || (!task.kanbanStatus && status.id === 'backlog');
                const isBacklog = status.id === 'backlog';
                const selectedBg = isBacklog ? '#f3f4f6' : status.color + '15';
                const selectedColor = isBacklog ? '#4b5563' : status.color;

                return (
                  <button
                    key={status.id}
                    type="button"
                    onClick={() => onUpdate?.(task.id, {
                      kanbanStatus: status.id,
                      ...(status.id === 'done' && !task.completed ? { completed: true, completedAt: Date.now() } : {}),
                      ...(status.id !== 'done' && task.completed ? { completed: false, completedAt: null } : {}),
                    })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '8px 8px',
                      fontSize: 11,
                      fontWeight: isSelected ? 600 : 500,
                      border: 'none',
                      borderRadius: 8,
                      backgroundColor: isSelected ? selectedBg : '#fafafa',
                      color: isSelected ? selectedColor : '#9ca3af',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      outline: 'none',
                      whiteSpace: 'nowrap' as const,
                    }}
                  >
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: 2,
                      backgroundColor: status.color,
                      flexShrink: 0,
                    }} />
                    {status.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tags */}
        {!task.deleted && !isReadOnly && (
          <div style={dtStyles.section}>
            <div style={{ ...dtStyles.sectionHeader, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="tag" size={13} color="#9ca3af" />
                <span style={dtStyles.sectionTitle}>Tags</span>
              </div>
              {(tags || []).length > 0 && (
                <button
                  onClick={() => setShowTagManagement(!showTagManagement)}
                  style={dtStyles.manageLink}
                >
                  {showTagManagement ? 'Done' : 'Manage'}
                </button>
              )}
            </div>

            {/* Current tags on task */}
            <div style={dtStyles.tagList}>
              {(task.tagIds || []).map(tagId => {
                const tag = (tags || []).find(t => t.id === tagId);
                if (!tag) return null;
                return (
                  <span key={tagId} style={{ ...dtStyles.tag, backgroundColor: tag.color + '15', color: tag.color }}>
                    {tag.name}
                    <button
                      onClick={() => onRemoveTagFromTask?.(task.id, tagId)}
                      style={dtStyles.tagRemove}
                    >
                      ×
                    </button>
                  </span>
                );
              })}

              {/* Add tag button/dropdown */}
              {!showTagInput ? (
                <button onClick={() => setShowTagInput(true)} style={dtStyles.addTagButton}>
                  <Icon name="plus" size={11} />
                  Add
                </button>
              ) : (
                <div style={dtStyles.tagInputContainer}>
                  {/* Available tags to add */}
                  {(tags || []).filter(t => !(task.tagIds || []).includes(t.id)).length > 0 && (
                    <div style={dtStyles.existingTags}>
                      <span style={dtStyles.tagInputLabel}>Add existing:</span>
                      <div style={dtStyles.existingTagList}>
                        {(tags || []).filter(t => !(task.tagIds || []).includes(t.id)).map(tag => (
                          <button
                            key={tag.id}
                            onClick={() => {
                              onAddTagToTask?.(task.id, tag.id);
                              setShowTagInput(false);
                            }}
                            style={{ ...dtStyles.existingTagButton, backgroundColor: tag.color + '12' }}
                          >
                            <span style={{ ...dtStyles.tagColorDot, backgroundColor: tag.color }} />
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Create new tag */}
                  <div style={dtStyles.newTagForm}>
                    <span style={dtStyles.tagInputLabel}>Create new:</span>
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Tag name"
                      style={dtStyles.tagInput}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTagName.trim()) {
                          const newTag = onAddTag?.({ name: newTagName.trim(), color: newTagColor });
                          if (newTag && 'id' in newTag) onAddTagToTask?.(task.id, (newTag as Tag).id);
                          setNewTagName('');
                          setShowTagInput(false);
                        }
                        if (e.key === 'Escape') {
                          setShowTagInput(false);
                          setNewTagName('');
                        }
                      }}
                    />
                    <div style={dtStyles.colorPicker}>
                      {TAG_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setNewTagColor(color)}
                          style={{
                            ...dtStyles.colorOption,
                            backgroundColor: color,
                            ...(newTagColor === color ? dtStyles.colorOptionSelected : {}),
                          }}
                        />
                      ))}
                    </div>
                    <div style={dtStyles.tagActions}>
                      <button onClick={() => { setShowTagInput(false); setNewTagName(''); }} style={dtStyles.cancelTagBtn}>
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (newTagName.trim()) {
                            const newTag = onAddTag?.({ name: newTagName.trim(), color: newTagColor });
                            if (newTag && 'id' in newTag) onAddTagToTask?.(task.id, (newTag as Tag).id);
                            setNewTagName('');
                            setShowTagInput(false);
                          }
                        }}
                        disabled={!newTagName.trim()}
                        style={{ ...dtStyles.createTagBtn, opacity: newTagName.trim() ? 1 : 0.5 }}
                      >
                        Create
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tag Management - Delete tags */}
            {showTagManagement && (tags || []).length > 0 && (
              <div style={dtStyles.tagManagementSection}>
                <span style={dtStyles.tagManagementLabel}>All Tags:</span>
                <div style={dtStyles.tagManagementList}>
                  {(tags || []).map(tag => (
                    <div key={tag.id} style={dtStyles.tagManagementItem}>
                      <span style={{ ...dtStyles.tagColorDot, backgroundColor: tag.color }} />
                      <span style={dtStyles.tagManagementName}>{tag.name}</span>
                      <button
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            type: 'deleteTag',
                            data: { tagId: tag.id, tagName: tag.name },
                          });
                        }}
                        style={dtStyles.tagDeleteBtn}
                      >
                        <Icon name="trash-2" size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Meta */}
        <div style={dtStyles.meta}>
          <div style={dtStyles.metaItem}>
            <Icon name="clock" size={11} color="#d1d5db" />
            <span>Created {createdAtLabel || '—'}</span>
          </div>
          {task.completedAt && (
            <div style={dtStyles.metaItem}>
              <Icon name="check-circle" size={11} color="#22c55e" />
              <span>Completed {completedAtLabel || '—'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={
          confirmModal.type === 'permanentDelete' ? 'Permanently Delete Task' :
          confirmModal.type === 'deleteTag' ? 'Delete Tag' : 'Confirm'
        }
        message={
          confirmModal.type === 'permanentDelete'
            ? `Permanently delete "${confirmModal.data?.taskTitle}"? This action cannot be undone.`
            : confirmModal.type === 'deleteTag'
            ? `Delete tag "${confirmModal.data?.tagName}"? It will be removed from all tasks.`
            : 'Are you sure?'
        }
        confirmLabel={confirmModal.type === 'permanentDelete' ? 'Delete Forever' : 'Delete'}
        onConfirm={() => {
          if (confirmModal.type === 'permanentDelete') {
            onPermanentDelete?.(confirmModal.data?.taskId);
          } else if (confirmModal.type === 'deleteTag') {
            onDeleteTag?.(confirmModal.data?.tagId);
          }
          setConfirmModal({ isOpen: false, type: null, data: null });
        }}
        onCancel={() => setConfirmModal({ isOpen: false, type: null, data: null })}
      />
    </div>
  );
}

// ── TaskDetail Styles (from old TaskDetail.jsx) ──────────────
const dtStyles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 340,
    minWidth: 340,
    maxWidth: 340,
    height: '100%',
    backgroundColor: '#ffffff',
    borderLeft: '1px solid #f0f0f0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  headerTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: '#1f2937',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    letterSpacing: '-0.01em',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  mobileBackButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    border: 'none',
    background: 'none',
    padding: 0,
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
    WebkitTapHighlightColor: 'transparent',
  },
  deleteHeaderButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#ef4444',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  restoreButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#22c55e',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  scrollableContent: {
    overflow: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  titleInput: {
    width: '100%',
    padding: '20px 24px',
    fontSize: 16,
    fontWeight: 500,
    border: 'none',
    backgroundColor: 'transparent',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#1f2937',
    borderBottom: '1px solid #f0f0f0',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    letterSpacing: '-0.01em',
    resize: 'none',
    overflow: 'auto',
    lineHeight: 1.4,
    minHeight: '56px',
    maxHeight: '150px',
  },
  notesInput: {
    width: '100%',
    padding: '16px 24px',
    fontSize: 13,
    border: 'none',
    backgroundColor: 'transparent',
    outline: 'none',
    resize: 'none',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    color: '#6b7280',
    boxSizing: 'border-box',
    lineHeight: 1.6,
    minHeight: 140,
    borderBottom: '1px solid #f0f0f0',
  },
  section: {
    padding: '16px 24px',
    borderBottom: '1px solid #f0f0f0',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 13,
    border: '1px solid #f0f0f0',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    transition: 'border-color 0.15s ease',
  },
  assignButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    border: '1px solid #f0f0f0',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    transition: 'all 0.15s ease',
    outline: 'none',
  },
  assignAvatar: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    color: 'white',
    fontSize: 11,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  assignName: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: 500,
    flex: 1,
  },
  assignNameEmpty: {
    fontSize: 13,
    color: '#9ca3af',
    flex: 1,
  },
  assignDropdownPanel: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#ffffff',
    border: '1px solid #f0f0f0',
    borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
    zIndex: 100,
    maxHeight: 240,
    overflowY: 'auto',
    padding: 4,
  },
  assignDropdownItemWrapper: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: 8,
    transition: 'background-color 0.15s ease',
  },
  assignDropdownItemBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    border: 'none',
    borderRadius: 8,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    outline: 'none',
  },
  assignDropdownItemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    flex: 1,
    minWidth: 0,
  },
  assignDropdownItemName: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: 500,
  },
  assignDropdownItemEmail: {
    fontSize: 11,
    color: '#9ca3af',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  assignDropdownDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    margin: '4px 8px',
  },
  assignDropdownSectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#FF9500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '4px 12px 2px',
  },
  pendingLabel: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: 400,
  },
  assignedByContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    backgroundColor: '#fafafa',
    borderRadius: 10,
  },
  assignedByInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  assignedByName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#1f2937',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  kanbanStatusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
  },
  meta: {
    padding: '20px 24px',
    marginTop: 'auto',
    backgroundColor: '#fafafa',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 6,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  // Tag styles
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'flex-start',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
  },
  tagRemove: {
    background: 'none',
    border: 'none',
    padding: '0 2px',
    fontSize: 13,
    cursor: 'pointer',
    opacity: 0.6,
    color: 'inherit',
  },
  addTagButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px dashed #e5e7eb',
    background: 'transparent',
    color: '#9ca3af',
    fontSize: 11,
    cursor: 'pointer',
  },
  tagInputContainer: {
    width: '100%',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 10,
  },
  existingTags: {
    marginBottom: 12,
  },
  tagInputLabel: {
    display: 'block',
    fontSize: 10,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  existingTagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  existingTagButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 6,
    border: 'none',
    fontSize: 11,
    cursor: 'pointer',
  },
  tagColorDot: {
    width: 6,
    height: 6,
    borderRadius: 2,
  },
  newTagForm: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: 12,
  },
  tagInput: {
    width: '100%',
    padding: '8px 10px',
    fontSize: 12,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    outline: 'none',
    marginBottom: 8,
    boxSizing: 'border-box',
  },
  colorPicker: {
    display: 'flex',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 18,
    height: 18,
    borderRadius: 4,
    border: '2px solid transparent',
    cursor: 'pointer',
    padding: 0,
  },
  colorOptionSelected: {
    border: '2px solid #1f2937',
    boxShadow: '0 0 0 1px white inset',
  },
  tagActions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
  },
  cancelTagBtn: {
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 500,
    color: '#9ca3af',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  createTagBtn: {
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 500,
    color: '#fff',
    background: '#6366f1',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  manageLink: {
    fontSize: 11,
    color: '#6366f1',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontWeight: 500,
  },
  tagManagementSection: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#fafafa',
    borderRadius: 8,
  },
  tagManagementLabel: {
    display: 'block',
    fontSize: 10,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tagManagementList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  tagManagementItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  tagManagementName: {
    flex: 1,
    fontSize: 12,
    color: '#1f2937',
  },
  tagDeleteBtn: {
    width: 22,
    height: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    color: '#ef4444',
    cursor: 'pointer',
    borderRadius: 4,
  },
  // New project form styles
  newProjectForm: {
    padding: 16,
    backgroundColor: '#fafafa',
    borderRadius: 10,
    border: '1px solid #f0f0f0',
  },
  newProjectInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    outline: 'none',
    marginBottom: 12,
    boxSizing: 'border-box',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  colorPickerRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  newProjectActions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
  },
  newProjectCancelBtn: {
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 500,
    color: '#6b7280',
    background: 'transparent',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  newProjectSaveBtn: {
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    background: '#6366f1',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
  },
};

export default React.memo(TaskDetail);
