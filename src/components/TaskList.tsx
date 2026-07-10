/**
 * Task List - Stable rendering with completion animation
 * Ported from previous_task_widget/components/TaskList.jsx
 */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { styles, T } from '../utils/styles';
import { Task, Project, Tag, WidgetUser } from '../constants';
import TaskItem from './TaskItem';

interface ExitingTask {
  task: Task;
  index: number;
  group: GroupMeta | null;
  startedAt: number;
}

interface FrozenTask {
  task: Task;
  index: number;
  group: GroupMeta | null;
}

interface GroupMeta {
  key: string;
  title: string;
  subtitle: string | null;
  order: number;
}

interface TaskListProps {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  onComplete?: (id: string) => void;
  onUncomplete?: (id: string) => void;
  onSelect: (task: Task, opts: { metaKey: boolean; shiftKey: boolean; forceSelect?: boolean }) => void;
  onUpdate?: (id: string, updates: Partial<Task>) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string, title?: string) => void;
  selectedTaskIds: string[];
  showProject: boolean;
  currentViewProjectId: string | null;
  emptyMessage: string;
  groupByDate: boolean;
  draggedItem: Task | null;
  dragOverItem: Task | null;
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
  /** Logbook view — completed rows show a completion timestamp, no dimming. */
  isLogbook?: boolean;
  /** Empty-state primary action — focuses the existing QuickAdd entry point. */
  onNewTask?: () => void;
  /** Empty-state secondary action — switches to board via existing viewMode. */
  onOpenBoard?: () => void;
}

/** Compute date-group metadata for a task */
function getGroupMeta(task: Task, today: Date): GroupMeta {
  if (!task.dueDate) return { key: 'no-date', title: 'No Date', subtitle: null, order: 99999 };
  const parts = task.dueDate.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const key = task.dueDate;
  const longDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  let title: string;
  let subtitle: string | null = null;
  let order: number;

  if (diff === 0) { title = 'Today'; subtitle = longDate; order = 0; }
  else if (diff === 1) { title = 'Tomorrow'; subtitle = longDate; order = 1; }
  else if (diff < 0) {
    title = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    order = diff; // negative = past
  } else if (diff < 7) {
    title = d.toLocaleDateString('en-US', { weekday: 'long' });
    subtitle = longDate;
    order = diff;
  } else {
    title = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    order = diff;
  }

  return { key, title, subtitle, order };
}

function TaskList(props: TaskListProps) {
  const {
    tasks, projects, tags,
    onComplete, onUncomplete, onSelect, onUpdate, onRestore, onPermanentDelete,
    selectedTaskIds, showProject, currentViewProjectId, emptyMessage,
    groupByDate, draggedItem, dragOverItem, dragHandlers,
    getDisplayName, allUsers, isReadOnly,
    isLogbook = false, onNewTask, onOpenBoard,
  } = props;

  const isMultiSelect = selectedTaskIds.length > 1;

  // ── Completion animation state ─────────────────────
  // exitingTasks: short-lived visual copies of tasks fading out after completion
  const [exitingTasks, setExitingTasks] = useState<ExitingTask[]>([]);
  const exitTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // frozenTasks: tasks that stay in-place during highlight animation
  // (prevents jumping when showCompleted is true)
  const [frozenTasks, setFrozenTasks] = useState<Map<string, FrozenTask>>(new Map());
  const frozenTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Ref for tasks so handleComplete is stable across data updates
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      exitTimersRef.current.forEach(t => clearTimeout(t));
      exitTimersRef.current.clear();
      frozenTimersRef.current.forEach(t => clearTimeout(t));
      frozenTimersRef.current.clear();
    };
  }, []);

  // Handle complete with animation
  // Reads from tasksRef so the callback stays stable across data changes,
  // which lets React.memo on TaskItem skip re-renders.
  const handleComplete = useCallback((taskId: string) => {
    if (!onComplete) return;

    const currentTasks = tasksRef.current;
    const t = (currentTasks || []).find(x => x.id === taskId);
    if (t && !t.deleted && !t.completed) {
      const index = Math.max(0, (currentTasks || []).findIndex(x => x.id === taskId));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const group = groupByDate ? getGroupMeta(t, today) : null;

      // Create a frozen snapshot marked as completed for visual state
      const frozenTask = { ...t, completed: true };

      // CRITICAL: Set exitingTasks SYNCHRONOUSLY before calling onComplete.
      // Prevents the brief glitch where task disappears before animation starts.
      setExitingTasks(prev => {
        if (prev.some(x => x.task?.id === taskId)) return prev;
        return [...prev, { task: frozenTask, index, group, startedAt: Date.now() }];
      });

      // Timer to remove exiting task after animation (2s + buffer)
      if (!exitTimersRef.current.has(taskId)) {
        const exitTimeoutId = setTimeout(() => {
          setExitingTasks(prev => prev.filter(x => x.task?.id !== taskId));
          exitTimersRef.current.delete(taskId);
        }, 2050);
        exitTimersRef.current.set(taskId, exitTimeoutId);
      }

      // Freeze task in place (for showCompleted=true scenarios)
      if (frozenTimersRef.current.has(taskId)) {
        clearTimeout(frozenTimersRef.current.get(taskId)!);
      }

      setFrozenTasks(prev => {
        const next = new Map(prev);
        next.set(taskId, { task: frozenTask, index, group });
        return next;
      });

      // Unfreeze after highlight animation (1.2s + buffer)
      const timeoutId = setTimeout(() => {
        setFrozenTasks(prev => {
          const next = new Map(prev);
          next.delete(taskId);
          return next;
        });
        frozenTimersRef.current.delete(taskId);
      }, 1400);
      frozenTimersRef.current.set(taskId, timeoutId);
    }

    onComplete(taskId);
  }, [onComplete, groupByDate]);

  // Handle uncomplete during fade - cancels exit animation
  const handleUncomplete = useCallback((taskId: string) => {
    // Cancel exit timer
    const exitTimer = exitTimersRef.current.get(taskId);
    if (exitTimer) {
      clearTimeout(exitTimer);
      exitTimersRef.current.delete(taskId);
    }

    // Remove from exiting tasks immediately
    setExitingTasks(prev => prev.filter(x => x.task?.id !== taskId));

    // Cancel frozen timer
    const frozenTimer = frozenTimersRef.current.get(taskId);
    if (frozenTimer) {
      clearTimeout(frozenTimer);
      frozenTimersRef.current.delete(taskId);
    }

    // Remove from frozen tasks
    setFrozenTasks(prev => {
      const next = new Map(prev);
      next.delete(taskId);
      return next;
    });

    // Call actual uncomplete handler
    if (onUncomplete) {
      onUncomplete(taskId);
    }
  }, [onUncomplete]);

  // ── Build display groups with exiting/frozen task merging ──
  const groups = useMemo(() => {
    if (!groupByDate) {
      let merged = [...(tasks || [])];

      // Reposition frozen tasks back to original indices
      frozenTasks.forEach(({ task: frozenTask, index: originalIndex }, taskId) => {
        const currentIndex = merged.findIndex(t => t.id === taskId);

        if (currentIndex !== -1 && currentIndex !== originalIndex) {
          merged.splice(currentIndex, 1);
          const insertAt = Math.min(originalIndex, merged.length);
          merged.splice(insertAt, 0, frozenTask);
        } else if (currentIndex !== -1) {
          merged[currentIndex] = frozenTask;
        }
      });

      // Insert exiting tasks near their original index
      const exits = [...(exitingTasks || [])]
        .filter(x => x?.task)
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

      exits.forEach(x => {
        if (merged.some(t => t.id === x.task.id)) return;
        const insertAt = Math.max(0, Math.min(
          Number.isFinite(x.index) ? x.index : 0,
          merged.length
        ));
        merged.splice(insertAt, 0, x.task);
      });

      return [{ key: 'all', title: null as string | null, subtitle: null as string | null, tasks: merged }];
    }

    // Grouped by date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const grouped: Record<string, { key: string; title: string | null; subtitle: string | null; tasks: Task[]; order: number }> = {};

    (tasks || []).forEach(task => {
      const meta = getGroupMeta(task, today);
      if (!grouped[meta.key]) {
        grouped[meta.key] = { key: meta.key, title: meta.title, subtitle: meta.subtitle, tasks: [], order: meta.order };
      }
      grouped[meta.key].tasks.push(task);
    });

    // Handle frozen tasks in grouped view
    frozenTasks.forEach(({ task: frozenTask, index: originalIndex, group: originalGroup }, taskId) => {
      if (!originalGroup) return;

      // Remove from any group it might have been sorted into
      Object.values(grouped).forEach(g => {
        const idx = g.tasks.findIndex(t => t.id === taskId);
        if (idx !== -1) g.tasks.splice(idx, 1);
      });

      // Ensure original group exists
      if (!grouped[originalGroup.key]) {
        grouped[originalGroup.key] = {
          key: originalGroup.key, title: originalGroup.title, subtitle: originalGroup.subtitle,
          tasks: [], order: originalGroup.order,
        };
      }

      const insertAt = Math.min(originalIndex, grouped[originalGroup.key].tasks.length);
      grouped[originalGroup.key].tasks.splice(insertAt, 0, frozenTask);
    });

    // Add exiting tasks into their natural group
    (exitingTasks || []).forEach(x => {
      if (!x?.task) return;
      const meta = x.group || getGroupMeta(x.task, today);
      if (!grouped[meta.key]) {
        grouped[meta.key] = { key: meta.key, title: meta.title, subtitle: meta.subtitle, tasks: [], order: meta.order };
      }
      if (!grouped[meta.key].tasks.some(t => t.id === x.task.id)) {
        grouped[meta.key].tasks.unshift(x.task);
      }
    });

    return Object.values(grouped).sort((a, b) => a.order - b.order);
  }, [tasks, groupByDate, exitingTasks, frozenTasks]);

  // ── Empty state ──
  if (!(tasks?.length || exitingTasks.length || frozenTasks.size)) {
    const [emptyHeading, ...restLines] = (emptyMessage || 'Nothing here').split('\n');
    const emptyBody = restLines.join(' ').trim()
      || 'Your plate is clear. Create a task, or jump into the board to move work forward.';
    return (
      <div data-testid="task-list-empty" style={emptyStateStyles.wrap}>
        <div style={emptyStateStyles.inner}>
          <div style={emptyStateStyles.tile}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <h3 style={emptyStateStyles.heading}>{emptyHeading}</h3>
          <p style={emptyStateStyles.body}>{emptyBody}</p>
          {(onNewTask || onOpenBoard) && (
            <div style={emptyStateStyles.actions}>
              {onNewTask && !isReadOnly && (
                <button onClick={onNewTask} style={emptyStateStyles.primaryBtn}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  New task
                </button>
              )}
              {onOpenBoard && (
                <button onClick={onOpenBoard} style={emptyStateStyles.secondaryBtn}>
                  Open board
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="task-list" style={styles.taskList}>
      {groups.map(group => (
        <div key={group.key}>
          {group.title && (
            <div style={styles.dateGroup}>
              <span style={{ color: T.textPrimary }}>{group.title}</span>
              {group.subtitle && (
                <span style={{ fontSize: '12px', fontWeight: 500, color: T.textFaint }}>{group.subtitle}</span>
              )}
              <span style={{
                marginLeft: 'auto', fontFamily: T.mono, fontSize: '11px',
                fontWeight: 500, color: T.textFaintest,
              }}>
                {group.tasks.length}
              </span>
            </div>
          )}
          {group.tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              projects={projects}
              tags={tags}
              onComplete={handleComplete}
              onUncomplete={handleUncomplete}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onRestore={onRestore}
              onPermanentDelete={onPermanentDelete}
              isSelected={selectedTaskIds.includes(task.id)}
              isMultiSelect={isMultiSelect}
              showProject={showProject}
              currentViewProjectId={currentViewProjectId}
              isDragging={draggedItem?.id === task.id}
              isDragOver={dragOverItem?.id === task.id}
              dragHandlers={dragHandlers}
              getDisplayName={getDisplayName}
              allUsers={allUsers}
              isReadOnly={isReadOnly}
              isExiting={(exitingTasks || []).some(x => x.task?.id === task.id)}
              isFrozen={frozenTasks.has(task.id)}
              isLogbook={isLogbook}
              showPriorityChip={groupByDate}
            />
          ))}
        </div>
      ))}

      <style>{`
        @keyframes taskCompleteHighlight {
          0% { background-color: rgba(52, 199, 89, 0.12); }
          40% { background-color: rgba(52, 199, 89, 0.08); }
          100% { background-color: transparent; }
        }

        @keyframes taskCompleteFadeOut {
          0% { background-color: rgba(52, 199, 89, 0.12); opacity: 1; }
          30% { background-color: rgba(52, 199, 89, 0.06); opacity: 1; }
          100% { background-color: transparent; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Empty-state styles (Momentum) ──────────────────────
const emptyStateStyles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    padding: '40px 24px',
  },
  inner: {
    textAlign: 'center',
    maxWidth: 380,
  },
  tile: {
    width: 76,
    height: 76,
    borderRadius: 22,
    background: T.accentGradient,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 22px',
    boxShadow: '0 18px 40px -12px rgba(107,76,230,.5)',
  },
  heading: {
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '-0.015em',
    margin: '0 0 8px',
    color: T.textPrimary,
  },
  body: {
    fontSize: '13.5px',
    lineHeight: 1.6,
    color: T.textMuted,
    margin: '0 0 24px',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    border: 'none',
    background: T.accent,
    color: '#fff',
    borderRadius: '10px',
    fontSize: '13.5px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(107,76,230,.35)',
    fontFamily: T.font,
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    border: `1px solid ${T.borderCard}`,
    background: '#fff',
    color: T.textSecondary,
    borderRadius: '10px',
    fontSize: '13.5px',
    fontWeight: 550,
    cursor: 'pointer',
    fontFamily: T.font,
  },
};

export default React.memo(TaskList);
