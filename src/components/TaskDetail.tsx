/**
 * Task Detail Panel — "Momentum" design (calm Studio layout).
 *
 * A restyle only: every prop, handler and edit mechanism (title/notes editing,
 * due-date picker, priority/status/assignee/project/tag pickers, delete,
 * complete, restore) is preserved. Mobile overlay path kept intact — the
 * root's first child must be the header, the second child the scrollable body
 * (src/styles.css targets `.mobile-detail-overlay > div:first-child` and
 * `> div:nth-child(2)`).
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Flag } from 'lucide-react';
import {
  Task, Project, Tag, WidgetUser,
  PRIORITIES, PRIORITY_LABELS, PRIORITY_COLORS, PRIORITY_SOFT_COLORS,
  KANBAN_STATUS_CONFIG, KANBAN_STATUS_COLORS, KANBAN_STATUS_SOFT_COLORS,
  KANBAN_STATUS_LABELS, TAG_COLORS,
} from '../constants';
import { Popover, PopoverTrigger, PopoverContent } from './ui/Popover';
import { Calendar } from './ui/Calendar';
import { parseDateString, toDateString } from './ui/date-utils';
import { Icon } from '../utils/icons';
import { styles, T, monoLabel } from '../utils/styles';
import ConfirmModal from './ConfirmModal';

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDateTime(isoString: string | number | null | undefined): string | null {
  if (isoString == null) return null;
  const ms = typeof isoString === 'number' ? isoString : Date.parse(isoString);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

/** Format a "YYYY-MM-DD" due date into a friendly label + overdue flag. */
function formatDue(value: string | null | undefined): { label: string; overdue: boolean } | null {
  const d = parseDateString(value || '');
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  const md = `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
  let prefix = '';
  if (diffDays === 0) prefix = 'Today, ';
  else if (diffDays === 1) prefix = 'Tomorrow, ';
  else if (diffDays === -1) prefix = 'Yesterday, ';
  return { label: prefix + md, overdue: diffDays < 0 };
}

// Helper to build hierarchical project options
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
    result.push({ value: project.id, label: project.title, indent: depth, color: project.color });
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

type MenuKey = 'project' | 'due' | 'status' | 'priority' | 'assign' | null;

function TaskDetail({
  task, projects, allUsers, tags,
  onUpdate, onDelete, onRestore, onPermanentDelete, onClose,
  onAddProject, onAddTag, onDeleteTag, onAddTagToTask, onRemoveTagFromTask,
  getDisplayName, isReadOnly, width = 340, fullHeight = false, isMobile = false,
}: TaskDetailProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [localDueDate, setLocalDueDate] = useState(task?.dueDate || '');
  const [notesFocused, setNotesFocused] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);

  const [showTagInput, setShowTagInput] = useState(false);
  const [showTagManagement, setShowTagManagement] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[6] || '#6B4CE6');
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#7C5CFC');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: string | null;
    data: { taskId?: string; taskTitle?: string; tagId?: string; tagName?: string } | null;
  }>({ isOpen: false, type: null, data: null });

  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleFocusedRef = useRef(false);
  const notesFocusedRef = useRef(false);

  const editable = !isReadOnly && !task?.deleted;

  // Debounced save for title
  useEffect(() => {
    if (!task || isReadOnly || title === task.title) return;
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      if (title !== task.title && onUpdate) onUpdate(task.id, { title });
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
      if (notes !== task.notes && onUpdate) onUpdate(task.id, { notes });
    }, 300);
    return () => {
      if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    };
  }, [notes, task?.id, task?.notes, isReadOnly, onUpdate]);

  // Auto-resize title textarea
  const autoResizeTitleTextarea = () => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = 'auto';
      const newHeight = Math.min(titleTextareaRef.current.scrollHeight, 150);
      titleTextareaRef.current.style.height = newHeight + 'px';
    }
  };
  useEffect(() => { autoResizeTitleTextarea(); }, [title]);

  // Sync local fields when task changes (skip fields being actively typed).
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
    if (!isReadOnly && title !== task.title && onUpdate) onUpdate(task.id, { title });
  };
  const handleNotesBlur = () => {
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    if (!isReadOnly && notes !== task.notes && onUpdate) onUpdate(task.id, { notes });
  };

  const toggleComplete = () => {
    if (!editable || !onUpdate) return;
    const isCompleting = !task.completed;
    onUpdate(task.id, {
      completed: isCompleting,
      completedAt: isCompleting ? Date.now() : null,
      kanbanStatus: isCompleting ? 'done' : 'in_progress',
    });
  };

  const changeStatus = (statusId: string) => {
    onUpdate?.(task.id, {
      kanbanStatus: statusId,
      ...(statusId === 'done' && !task.completed ? { completed: true, completedAt: Date.now() } : {}),
      ...(statusId !== 'done' && task.completed ? { completed: false, completedAt: null } : {}),
    });
    setOpenMenu(null);
  };

  if (!task) return null;

  const project = task.projectId ? (projects || []).find(p => p.id === task.projectId) : null;
  const projectColor = project?.color || T.accent;
  const projectName = project?.title || 'No project';

  const due = formatDue(localDueDate);
  const priorityKey = task.priority && task.priority !== 'none' ? task.priority : 'none';
  const statusKey = task.kanbanStatus || 'backlog';
  const taskTags = (task.tagIds || [])
    .map(id => (tags || []).find(t => t.id === id))
    .filter((t): t is Tag => !!t);

  const sidebarStyle: React.CSSProperties = {
    ...styles.taskDetail,
    height: '100%',
    minHeight: 0,
    width: isMobile ? '100%' : width,
    minWidth: isMobile ? '100%' : width,
    maxWidth: isMobile ? '100%' : width,
    ...(fullHeight ? { position: 'absolute', top: 0, right: 0, bottom: 0, height: '100%', zIndex: 10 } : {}),
  };

  const assignedMatched = task.assignedUser
    ? (allUsers || []).find(u => u.id === task.assignedUser!.id)
    : null;

  // ── Reusable bits ─────────────────────────────────
  const metaRow = (label: string, value: React.ReactNode, withBottomBorder = false): React.ReactNode => (
    <div style={{ ...dt.metaRow, ...(withBottomBorder ? { borderBottom: `1px solid ${T.borderRowLight}` } : {}) }}>
      <span style={dt.metaLabel}>{label}</span>
      <div style={dt.metaValue}>{value}</div>
    </div>
  );

  const menuItem = (active: boolean, onClick: () => void, content: React.ReactNode): React.ReactNode => (
    <button
      type="button"
      onClick={onClick}
      style={{ ...styles.dropdownItem, ...(active ? styles.dropdownItemActive : {}) }}
    >
      {content}
    </button>
  );

  const avatar = (name: string, color: string, size = 20, pending = false): React.ReactNode => (
    <span
      style={{
        ...dt.avatar,
        width: size,
        height: size,
        fontSize: size <= 20 ? 9.5 : 11,
        backgroundColor: pending ? '#E5E5EA' : color,
        color: pending ? '#8E8E93' : '#fff',
      }}
    >
      {pending ? '✉' : (name?.charAt(0).toUpperCase() || '?')}
    </span>
  );

  const statusPill = (
    <span
      style={{
        ...dt.pill,
        color: KANBAN_STATUS_COLORS[statusKey] || T.gray,
        backgroundColor: KANBAN_STATUS_SOFT_COLORS[statusKey] || T.graySoft,
      }}
    >
      {KANBAN_STATUS_LABELS[statusKey] || statusKey}
    </span>
  );

  const priorityPill = (
    <span
      style={{
        ...dt.pill,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        color: priorityKey === 'none' ? T.textMuted : PRIORITY_COLORS[priorityKey],
        backgroundColor: priorityKey === 'none' ? T.graySoft : PRIORITY_SOFT_COLORS[priorityKey],
      }}
    >
      {priorityKey !== 'none' && <Flag size={11} strokeWidth={2.4} />}
      {PRIORITY_LABELS[priorityKey] || 'None'}
    </span>
  );

  return (
    <div
      data-task-detail
      data-testid="task-detail"
      className={isMobile ? 'mobile-detail-overlay' : ''}
      style={sidebarStyle}
    >
      {/* Header — MUST remain the first child div (mobile overlay hook) */}
      <div style={styles.detailHeader}>
        {editable && (projects || []).length >= 0 ? (
          <Popover open={openMenu === 'project'} onOpenChange={(o: boolean) => setOpenMenu(o ? 'project' : null)}>
            <PopoverTrigger asChild>
              <button type="button" style={dt.projectTrigger}>
                <span style={{ ...dt.projectDot, backgroundColor: task.projectId ? projectColor : T.accent }} />
                <span style={dt.projectName}>{projectName}</span>
                <Icon name="chevron-down" size={13} color={T.textFaintest} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto min-w-[200px] p-1">
              {showNewProjectForm ? (
                <div style={{ padding: 8 }}>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newProjectName.trim() && onAddProject) {
                        const np = onAddProject({ title: newProjectName.trim(), color: newProjectColor });
                        if (np) onUpdate?.(task.id, { projectId: np.id });
                        setNewProjectName(''); setNewProjectColor('#7C5CFC');
                        setShowNewProjectForm(false); setOpenMenu(null);
                      }
                      if (e.key === 'Escape') { setNewProjectName(''); setShowNewProjectForm(false); }
                    }}
                    placeholder="Project name"
                    style={dt.textInput}
                    autoFocus
                  />
                  <div style={dt.swatchRow}>
                    {TAG_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewProjectColor(color)}
                        style={{
                          ...dt.swatch,
                          backgroundColor: color,
                          ...(newProjectColor === color ? dt.swatchSelected : {}),
                        }}
                      />
                    ))}
                  </div>
                  <div style={dt.formActions}>
                    <button
                      type="button"
                      onClick={() => { setNewProjectName(''); setShowNewProjectForm(false); }}
                      style={styles.btnCancel}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newProjectName.trim()}
                      onClick={() => {
                        if (newProjectName.trim() && onAddProject) {
                          const np = onAddProject({ title: newProjectName.trim(), color: newProjectColor });
                          if (np) onUpdate?.(task.id, { projectId: np.id });
                          setNewProjectName(''); setNewProjectColor('#7C5CFC');
                          setShowNewProjectForm(false); setOpenMenu(null);
                        }
                      }}
                      style={{ ...styles.btnSave, opacity: newProjectName.trim() ? 1 : 0.5 }}
                    >
                      Create
                    </button>
                  </div>
                </div>
              ) : (
                <div style={dt.menuList}>
                  {menuItem(!task.projectId, () => { onUpdate?.(task.id, { projectId: null }); setOpenMenu(null); }, (
                    <>
                      <span style={{ ...dt.projectDot, backgroundColor: T.textFaintest }} />
                      <span style={{ flex: 1 }}>No project</span>
                      {!task.projectId && <Icon name="check" size={14} color={T.accent} />}
                    </>
                  ))}
                  {buildProjectOptions(projects || []).map(opt => menuItem(
                    task.projectId === opt.value,
                    () => { onUpdate?.(task.id, { projectId: opt.value }); setOpenMenu(null); },
                    (
                      <>
                        <span style={{ ...dt.projectDot, marginLeft: (opt.indent || 0) * 12, backgroundColor: opt.color || T.accent }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                        {task.projectId === opt.value && <Icon name="check" size={14} color={T.accent} />}
                      </>
                    ),
                  ))}
                  {onAddProject && (
                    <>
                      <div style={styles.dropdownDivider} />
                      {menuItem(false, () => setShowNewProjectForm(true), (
                        <span style={{ color: T.accent, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon name="plus" size={13} color={T.accent} /> New project
                        </span>
                      ))}
                    </>
                  )}
                </div>
              )}
            </PopoverContent>
          </Popover>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...dt.projectDot, backgroundColor: task.projectId ? projectColor : T.accent }} />
            <span style={dt.projectName}>{projectName}</span>
          </div>
        )}

        <button data-testid="task-detail-close" onClick={onClose} style={styles.detailClose} aria-label="Close">
          <Icon name="x" size={17} />
        </button>
      </div>

      {/* Scrollable body — MUST remain the second child div (mobile overlay hook) */}
      <div style={styles.detailBody}>
        {/* Title row: checkbox + editable title */}
        <div style={dt.titleRow}>
          <button
            type="button"
            onClick={toggleComplete}
            disabled={!editable}
            aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
            style={{
              ...dt.checkbox,
              ...(task.completed ? dt.checkboxChecked : {}),
              cursor: editable ? 'pointer' : 'default',
            }}
          >
            {task.completed && <Icon name="check" size={12} color="#fff" />}
          </button>
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
              ...styles.detailTitleInput,
              marginBottom: 0,
              resize: 'none',
              overflow: 'hidden',
              lineHeight: '1.35',
              ...(task.completed ? { textDecoration: 'line-through', color: T.textFaint } : {}),
              ...((isReadOnly || task.deleted) ? { opacity: 0.7, cursor: 'not-allowed' } : {}),
            }}
          />
        </div>

        {/* Notes — calm body text, indented under the title */}
        <textarea
          data-testid="task-detail-notes"
          value={notes}
          onChange={(e) => !isReadOnly && setNotes(e.target.value)}
          onFocus={() => { notesFocusedRef.current = true; setNotesFocused(true); }}
          onBlur={() => { notesFocusedRef.current = false; setNotesFocused(false); handleNotesBlur(); }}
          placeholder="Add notes..."
          disabled={isReadOnly || task.deleted}
          rows={notes ? 4 : 2}
          style={{
            ...dt.notes,
            backgroundColor: notesFocused ? '#fff' : 'transparent',
            boxShadow: notesFocused ? `inset 0 0 0 1px ${T.borderCard}` : 'none',
            ...((isReadOnly || task.deleted) ? { opacity: 0.7, cursor: 'not-allowed' } : {}),
          }}
        />

        {/* Meta rows */}
        <div style={{ marginTop: 6 }}>
          {/* DUE */}
          {metaRow('Due', editable ? (
            <Popover open={openMenu === 'due'} onOpenChange={(o: boolean) => setOpenMenu(o ? 'due' : null)}>
              <PopoverTrigger asChild>
                <button type="button" style={dt.valueTrigger}>
                  {due ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: due.overdue ? T.red : T.textSecondary, fontWeight: 500 }}>
                      <Icon name="calendar" size={13} color={due.overdue ? T.red : T.accent} />
                      {due.label}
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.textFaint, fontWeight: 500 }}>
                      <Icon name="calendar" size={13} color={T.textFaint} />
                      No due date
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  selected={parseDateString(localDueDate)}
                  onSelect={(date) => {
                    const v = toDateString(date);
                    setLocalDueDate(v);
                    onUpdate?.(task.id, { dueDate: v });
                    setOpenMenu(null);
                  }}
                />
                {localDueDate && (
                  <div style={{ padding: 8, borderTop: `1px solid ${T.borderRowLight}` }}>
                    <button
                      type="button"
                      onClick={() => { setLocalDueDate(''); onUpdate?.(task.id, { dueDate: null }); setOpenMenu(null); }}
                      style={{ ...styles.detailActionBtn, width: '100%', justifyContent: 'center' }}
                    >
                      Clear date
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: due?.overdue ? T.red : T.textSecondary, fontWeight: 500 }}>
              <Icon name="calendar" size={13} color={due?.overdue ? T.red : T.accent} />
              {due ? due.label : 'No due date'}
            </span>
          ))}

          {/* STATUS */}
          {metaRow('Status', editable ? (
            <Popover open={openMenu === 'status'} onOpenChange={(o: boolean) => setOpenMenu(o ? 'status' : null)}>
              <PopoverTrigger asChild>
                <button type="button" style={dt.valueTrigger}>{statusPill}</button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto min-w-[180px] p-1">
                <div style={dt.menuList}>
                  {KANBAN_STATUS_CONFIG.map(s => menuItem(
                    statusKey === s.id,
                    () => changeStatus(s.id),
                    (
                      <>
                        <span style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: s.color, flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{s.label}</span>
                        {statusKey === s.id && <Icon name="check" size={14} color={T.accent} />}
                      </>
                    ),
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : statusPill)}

          {/* PRIORITY */}
          <div data-testid="task-detail-priority">
            {metaRow('Priority', editable ? (
              <Popover open={openMenu === 'priority'} onOpenChange={(o: boolean) => setOpenMenu(o ? 'priority' : null)}>
                <PopoverTrigger asChild>
                  <button type="button" style={dt.valueTrigger}>{priorityPill}</button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto min-w-[180px] p-1">
                  <div style={dt.menuList}>
                    {[PRIORITIES.NONE, PRIORITIES.LOW, PRIORITIES.MEDIUM, PRIORITIES.HIGH].map(p => menuItem(
                      priorityKey === p,
                      () => { onUpdate?.(task.id, { priority: p }); setOpenMenu(null); },
                      (
                        <>
                          <span style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: PRIORITY_COLORS[p], flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>{PRIORITY_LABELS[p]}</span>
                          {priorityKey === p && <Icon name="check" size={14} color={T.accent} />}
                        </>
                      ),
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            ) : priorityPill)}
          </div>

          {/* ASSIGNEE */}
          {metaRow('Assignee', editable ? (
            <Popover open={openMenu === 'assign'} onOpenChange={(o: boolean) => setOpenMenu(o ? 'assign' : null)}>
              <PopoverTrigger asChild>
                <button type="button" style={dt.valueTrigger}>
                  {task.assignedUser ? (
                    <span style={dt.assigneeValue}>
                      {avatar(
                        assignedMatched ? getDisplayName(assignedMatched) : (task.assignedUser.name || '?'),
                        assignedMatched?.color || task.assignedUser.color || T.accentAvatar,
                        20,
                        assignedMatched?.isPending,
                      )}
                      {assignedMatched ? getDisplayName(assignedMatched) : (task.assignedUser.name || 'Unknown')}
                    </span>
                  ) : (
                    <span style={{ ...dt.assigneeValue, color: T.textFaint }}>
                      <span style={{ ...dt.avatar, width: 20, height: 20, border: `1.5px dashed ${T.checkboxBorder}`, background: 'transparent', color: T.textFaint }}>?</span>
                      Unassigned
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto min-w-[220px] p-1">
                <div style={{ ...dt.menuList, maxHeight: 260, overflowY: 'auto' }}>
                  {menuItem(!task.assignedUser, () => { onUpdate?.(task.id, { assignedUser: null }); setOpenMenu(null); }, (
                    <>
                      <span style={{ ...dt.avatar, width: 22, height: 22, backgroundColor: T.textFaintest }}>?</span>
                      <span style={{ flex: 1 }}>Unassigned</span>
                      {!task.assignedUser && <Icon name="check" size={14} color={T.accent} />}
                    </>
                  ))}
                  {(allUsers || []).filter(u => !u.isPending).map(user => {
                    const name = getDisplayName ? getDisplayName(user) : user.name;
                    const selected = task.assignedUser?.id === user.id;
                    return (
                      <React.Fragment key={user.id}>
                        {menuItem(selected, () => {
                          onUpdate?.(task.id, { assignedUser: { id: user.id, name: user.name, email: user.email, color: user.color } });
                          setOpenMenu(null);
                        }, (
                          <>
                            {avatar(name, user.color || T.accentAvatar, 22)}
                            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                              {user.email && <span style={{ fontSize: 11, color: T.textFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>}
                            </span>
                            {selected && <Icon name="check" size={14} color={T.accent} />}
                          </>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  {(allUsers || []).filter(u => u.isPending).length > 0 && (
                    <>
                      <div style={styles.dropdownDivider} />
                      <div style={{ ...monoLabel, color: T.orange, padding: '4px 10px 2px' }}>Invited</div>
                      {(allUsers || []).filter(u => u.isPending).map(user => {
                        const name = user.email || user.name || 'Invited User';
                        const selected = task.assignedUser?.id === user.id;
                        return (
                          <React.Fragment key={user.id}>
                            {menuItem(selected, () => {
                              onUpdate?.(task.id, { assignedUser: { id: user.id, name, email: user.email, color: user.color } });
                              setOpenMenu(null);
                            }, (
                              <>
                                {avatar('', '#E5E5EA', 22, true)}
                                <span style={{ flex: 1, minWidth: 0, color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                {selected && <Icon name="check" size={14} color={T.accent} />}
                              </>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            task.assignedUser ? (
              <span style={dt.assigneeValue}>
                {avatar(
                  assignedMatched ? getDisplayName(assignedMatched) : (task.assignedUser.name || '?'),
                  assignedMatched?.color || task.assignedUser.color || T.accentAvatar,
                  20,
                  assignedMatched?.isPending,
                )}
                {assignedMatched ? getDisplayName(assignedMatched) : (task.assignedUser.name || 'Unknown')}
              </span>
            ) : (
              <span style={{ color: T.textFaint, fontWeight: 500 }}>Unassigned</span>
            )
          ))}

          {/* TAGS (bottom border on the row) */}
          {metaRow('Tags', (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {taskTags.map(tag => (
                  <span key={tag.id} style={{ ...styles.detailTag, color: tag.color, backgroundColor: tag.color + '1F' }}>
                    {tag.name}
                    {editable && (
                      <button
                        type="button"
                        onClick={() => onRemoveTagFromTask?.(task.id, tag.id)}
                        style={dt.tagRemove}
                        aria-label={`Remove ${tag.name}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {editable && !showTagInput && (
                  <button type="button" onClick={() => setShowTagInput(true)} style={styles.detailAddTag}>
                    <Icon name="plus" size={11} /> Add
                  </button>
                )}
                {taskTags.length === 0 && !editable && (
                  <span style={{ color: T.textFaint, fontSize: 13 }}>—</span>
                )}
              </div>

              {editable && showTagInput && (
                <div style={dt.tagPanel}>
                  {(tags || []).filter(t => !(task.tagIds || []).includes(t.id)).length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ ...monoLabel, display: 'block', marginBottom: 6 }}>Add existing</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(tags || []).filter(t => !(task.tagIds || []).includes(t.id)).map(tag => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => { onAddTagToTask?.(task.id, tag.id); setShowTagInput(false); }}
                            style={{ ...styles.detailTag, color: tag.color, backgroundColor: tag.color + '14' }}
                          >
                            <span style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: tag.color }} />
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <span style={{ ...monoLabel, display: 'block', marginBottom: 6 }}>Create new</span>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Tag name"
                    style={dt.textInput}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTagName.trim()) {
                        const nt = onAddTag?.({ name: newTagName.trim(), color: newTagColor });
                        if (nt && 'id' in nt) onAddTagToTask?.(task.id, (nt as Tag).id);
                        setNewTagName(''); setShowTagInput(false);
                      }
                      if (e.key === 'Escape') { setShowTagInput(false); setNewTagName(''); }
                    }}
                  />
                  <div style={dt.swatchRow}>
                    {TAG_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewTagColor(color)}
                        style={{ ...dt.swatch, backgroundColor: color, ...(newTagColor === color ? dt.swatchSelected : {}) }}
                      />
                    ))}
                  </div>
                  <div style={dt.formActions}>
                    {(tags || []).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowTagManagement(!showTagManagement)}
                        style={{ ...styles.detailActionBtn, marginRight: 'auto' }}
                      >
                        {showTagManagement ? 'Done' : 'Manage'}
                      </button>
                    )}
                    <button type="button" onClick={() => { setShowTagInput(false); setNewTagName(''); }} style={styles.btnCancel}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newTagName.trim()}
                      onClick={() => {
                        if (newTagName.trim()) {
                          const nt = onAddTag?.({ name: newTagName.trim(), color: newTagColor });
                          if (nt && 'id' in nt) onAddTagToTask?.(task.id, (nt as Tag).id);
                          setNewTagName(''); setShowTagInput(false);
                        }
                      }}
                      style={{ ...styles.btnSave, opacity: newTagName.trim() ? 1 : 0.5 }}
                    >
                      Create
                    </button>
                  </div>

                  {showTagManagement && (tags || []).length > 0 && (
                    <div style={{ marginTop: 12, borderTop: `1px solid ${T.borderRowLight}`, paddingTop: 10 }}>
                      <span style={{ ...monoLabel, display: 'block', marginBottom: 8 }}>All tags</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(tags || []).map(tag => (
                          <div key={tag.id} style={dt.tagManageItem}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: tag.color }} />
                            <span style={{ flex: 1, fontSize: 12.5, color: T.textSecondary }}>{tag.name}</span>
                            <button
                              type="button"
                              onClick={() => setConfirmModal({ isOpen: true, type: 'deleteTag', data: { tagId: tag.id, tagName: tag.name } })}
                              style={dt.tagDeleteBtn}
                              aria-label={`Delete ${tag.name}`}
                            >
                              <Icon name="trash-2" size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ), true)}
        </div>

        {/* Timestamps (kept, subtle) */}
        <div style={dt.timestamps}>
          <div style={dt.timestampItem}>
            <Icon name="clock" size={11} color={T.textFaintest} />
            <span>Created {createdAtLabel || '—'}</span>
          </div>
          {task.completedAt && (
            <div style={dt.timestampItem}>
              <Icon name="check-circle" size={11} color={T.green} />
              <span>Completed {completedAtLabel || '—'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions footer */}
      {!isReadOnly && (
        <div style={styles.detailActions}>
          {task.deleted ? (
            <>
              <button type="button" onClick={() => onRestore?.(task.id)} style={styles.detailActionBtn}>
                <Icon name="rotate-ccw" size={13} /> Restore
              </button>
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: true, type: 'permanentDelete', data: { taskId: task.id, taskTitle: task.title } })}
                style={{ ...styles.detailActionBtn, ...styles.detailActionBtnDanger }}
              >
                <Icon name="trash-2" size={13} /> Delete forever
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={toggleComplete} style={styles.detailActionBtn}>
                <Icon name={task.completed ? 'rotate-ccw' : 'check-circle'} size={13} />
                {task.completed ? 'Reopen' : 'Complete'}
              </button>
              {onDelete && (
                <button
                  type="button"
                  data-testid="task-detail-delete"
                  onClick={() => onDelete(task.id)}
                  style={{ ...styles.detailActionBtn, ...styles.detailActionBtnDanger, marginLeft: 'auto' }}
                >
                  <Icon name="trash-2" size={13} /> Delete
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={
          confirmModal.type === 'permanentDelete' ? 'Permanently delete task' :
          confirmModal.type === 'deleteTag' ? 'Delete tag' : 'Confirm'
        }
        message={
          confirmModal.type === 'permanentDelete'
            ? `Permanently delete "${confirmModal.data?.taskTitle}"? This action cannot be undone.`
            : confirmModal.type === 'deleteTag'
            ? `Delete tag "${confirmModal.data?.tagName}"? It will be removed from all tasks.`
            : 'Are you sure?'
        }
        confirmLabel={confirmModal.type === 'permanentDelete' ? 'Delete forever' : 'Delete'}
        confirmStyle="danger"
        onConfirm={() => {
          if (confirmModal.type === 'permanentDelete') onPermanentDelete?.(confirmModal.data?.taskId || '');
          else if (confirmModal.type === 'deleteTag') onDeleteTag?.(confirmModal.data?.tagId || '');
          setConfirmModal({ isOpen: false, type: null, data: null });
        }}
        onCancel={() => setConfirmModal({ isOpen: false, type: null, data: null })}
      />
    </div>
  );
}

// ── Local styles (Momentum tokens) ─────────────────────
const dt: Record<string, React.CSSProperties> = {
  // Header project trigger
  projectTrigger: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontFamily: T.font,
    minWidth: 0,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 2.5,
    flexShrink: 0,
  },
  projectName: {
    fontSize: 12.5,
    fontWeight: 500,
    color: T.textMuted,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // Title row
  titleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 11,
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: `2px solid ${T.checkboxBorder}`,
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
    padding: 0,
    transition: 'all 0.15s ease',
  },
  checkboxChecked: {
    backgroundColor: T.green,
    borderColor: T.green,
  },

  // Notes
  notes: {
    width: 'calc(100% - 23px)',
    border: 'none',
    outline: 'none',
    fontSize: 13.5,
    lineHeight: 1.6,
    color: T.textMuted,
    background: 'transparent',
    resize: 'none',
    padding: '6px 8px',
    marginLeft: 23,
    marginBottom: 8,
    boxSizing: 'border-box',
    borderRadius: 6,
    fontFamily: T.font,
    transition: 'box-shadow 0.15s ease, background-color 0.15s ease',
  },

  // Meta rows
  metaRow: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '9px 0',
    borderTop: `1px solid ${T.borderRowLight}`,
    minHeight: 20,
  },
  metaLabel: {
    ...monoLabel,
    width: 96,
    flexShrink: 0,
    lineHeight: '22px',
  },
  metaValue: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    fontSize: 13,
    color: T.textSecondary,
    minHeight: 22,
  },
  valueTrigger: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontFamily: T.font,
    fontSize: 13,
    color: T.textSecondary,
    textAlign: 'left',
    maxWidth: '100%',
  },

  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 10.5,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 20,
    lineHeight: 1.3,
  },

  avatar: {
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    flexShrink: 0,
    overflow: 'hidden',
  },
  assigneeValue: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    fontSize: 13,
    fontWeight: 500,
    color: T.textSecondary,
  },

  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },

  tagRemove: {
    background: 'none',
    border: 'none',
    padding: '0 0 0 2px',
    fontSize: 13,
    lineHeight: 1,
    cursor: 'pointer',
    color: 'inherit',
    opacity: 0.65,
  },
  tagPanel: {
    padding: 12,
    backgroundColor: T.bgSecondary,
    border: `1px solid ${T.borderRowLight}`,
    borderRadius: 10,
    width: '100%',
    boxSizing: 'border-box',
  },
  tagManageItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    backgroundColor: '#fff',
    borderRadius: 6,
    border: `1px solid ${T.borderRowLight}`,
  },
  tagDeleteBtn: {
    width: 22,
    height: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    color: T.red,
    cursor: 'pointer',
    borderRadius: 5,
  },

  textInput: {
    width: '100%',
    padding: '8px 10px',
    fontSize: 13,
    border: `1px solid ${T.borderCard}`,
    borderRadius: 8,
    outline: 'none',
    marginBottom: 8,
    boxSizing: 'border-box',
    fontFamily: T.font,
    color: T.textPrimary,
  },
  swatchRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 5,
    border: '2px solid transparent',
    cursor: 'pointer',
    padding: 0,
  },
  swatchSelected: {
    border: `2px solid ${T.textPrimary}`,
    boxShadow: '0 0 0 1px #fff inset',
  },
  formActions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  timestamps: {
    marginTop: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  timestampItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: T.textFaint,
    fontFamily: T.font,
  },
};

export default React.memo(TaskDetail);
