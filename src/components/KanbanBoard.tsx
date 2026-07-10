/**
 * Kanban Board View — "Momentum" restyle
 *
 * Renders 5 columns (Backlog, Ready, In Progress, Review, Done).
 * Cards show priority, title, project chip + assignee avatar.
 * Click opens KanbanCardModal.
 * HTML5 drag-and-drop moves tasks between columns (updates kanbanStatus).
 *
 * UI-only restyle: all props, drag-drop logic, click-to-open and empty
 * states are preserved. DOM hooks (className "kanban-column"/"kanban-card",
 * data-kanban-board, data-kanban-column) kept for mobile CSS.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Flag } from 'lucide-react';
import {
  Task,
  Project,
  KANBAN_STATUS_CONFIG,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_SOFT_COLORS,
  getUserColor,
} from '../constants';
import { T } from '../utils/styles';
import KanbanCardModal from './KanbanCardModal';

interface KanbanBoardProps {
  tasks: Task[];
  projects: Project[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onCompleteTask: (id: string) => void;
  isReadOnly: boolean;
}

/** Up-to-2-letter uppercase initials from a display name. */
function initialsOf(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function KanbanBoard({
  tasks,
  projects,
  onUpdateTask,
  onCompleteTask,
  isReadOnly,
}: KanbanBoardProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const didDragRef = useRef(false);

  // Group tasks by kanban status
  const columns = useMemo(() => {
    return KANBAN_STATUS_CONFIG.map(col => ({
      ...col,
      tasks: tasks.filter(t => (t.kanbanStatus || 'backlog') === col.id),
    }));
  }, [tasks]);

  // Project lookup
  const projectMap = useMemo(() => {
    const map: Record<string, Project> = {};
    (projects || []).forEach(p => { map[p.id] = p; });
    return map;
  }, [projects]);

  // Find selected task (always from the latest tasks array)
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find(t => t.id === selectedTaskId) || null;
  }, [selectedTaskId, tasks]);

  // ── Drag handlers ──────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    if (isReadOnly) return;
    didDragRef.current = false;
    setDraggedTaskId(task.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    // Mark as task drag so sidebar project/user nodes can accept the drop
    e.dataTransfer.setData('application/x-task', task.id);

    // Custom ghost
    const ghost = document.createElement('div');
    ghost.textContent = task.title;
    ghost.style.cssText = `
      position: fixed; top: -1000px; left: -1000px;
      padding: 8px 14px; background: #fff; border-radius: 10px;
      box-shadow: 0 6px 16px -6px rgba(107,76,230,0.28);
      font-family: ${T.font};
      font-size: 12.5px; font-weight: 500; color: #1B1C2E;
      max-width: 200px; overflow: hidden; white-space: nowrap;
      text-overflow: ellipsis;
    `;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    requestAnimationFrame(() => {
      if (ghost.parentNode) document.body.removeChild(ghost);
    });
  }, [isReadOnly]);

  // Suppress browser's native dark drop-target outline on both dragenter and dragover.
  // Without preventDefault on dragenter, Chrome/Safari render a persistent dark border
  // on every column the cursor passes through.
  const handleColumnDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    didDragRef.current = true;
    setDragOverColumn(columnId);
  }, []);

  const handleBoardDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleBoardDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (isReadOnly || !draggedTaskId) return;

    const task = tasks.find(t => t.id === draggedTaskId);
    if (task && task.kanbanStatus !== columnId) {
      const updates: Partial<Task> = { kanbanStatus: columnId };
      // Sync completed state with "done" column
      if (columnId === 'done' && !task.completed) {
        updates.completed = true;
        updates.completedAt = Date.now();
      } else if (columnId !== 'done' && task.completed) {
        updates.completed = false;
        updates.completedAt = null;
      }
      onUpdateTask(draggedTaskId, updates);
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  }, [isReadOnly, draggedTaskId, tasks, onUpdateTask]);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  }, []);

  const handleCardClick = useCallback((taskId: string) => {
    // If the user was dragging, don't open modal
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    setSelectedTaskId(taskId);
  }, []);

  // ── Render ─────────────────────────────────────────

  return (
    <>
      <div data-kanban-board data-testid="kanban-board" style={boardStyles.board} onDragOver={handleBoardDragOver} onDragEnter={handleBoardDragEnter}>
        {columns.map(col => {
          const isOver = dragOverColumn === col.id;
          return (
            <div
              key={col.id}
              className="kanban-column"
              data-kanban-column
              data-testid={`kanban-column-${col.id}`}
              style={{
                ...boardStyles.column,
                ...(isOver ? boardStyles.columnDragOver : {}),
              }}
              onDragEnter={handleColumnDragEnter}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column header */}
              <div style={boardStyles.columnHeader}>
                <span style={{
                  width: 9,
                  height: 9,
                  borderRadius: 3,
                  backgroundColor: col.color,
                  flexShrink: 0,
                }} />
                <span style={boardStyles.columnTitle}>{col.label}</span>
                <span style={boardStyles.columnCount}>{col.tasks.length}</span>
              </div>

              {/* Cards */}
              <div style={boardStyles.cardList}>
                {col.tasks.length === 0 && (
                  <div style={boardStyles.emptyColumn}>No tasks</div>
                )}
                {col.tasks.map(task => {
                  const project = task.projectId ? projectMap[task.projectId] : null;
                  const isDragging = draggedTaskId === task.id;
                  const isDone = task.completed;
                  const hasPriority = task.priority && task.priority !== 'none';
                  const priorityColor = PRIORITY_COLORS[task.priority] || T.gray;
                  const assignee = task.assignedUser;
                  const avatarColor = assignee
                    ? (assignee.color || getUserColor(assignee.id))
                    : T.gray;
                  const showFooter = !isDone && (!!project || !!assignee);

                  return (
                    <div
                      key={task.id}
                      className="kanban-card"
                      data-testid={`kanban-card-${task.id}`}
                      draggable={!isReadOnly}
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleCardClick(task.id)}
                      style={{
                        ...boardStyles.card,
                        ...(isDragging ? boardStyles.cardDragging : {}),
                        ...(isDone ? boardStyles.cardCompleted : {}),
                      }}
                    >
                      {/* Priority row */}
                      {!isDone && hasPriority && (
                        <div style={boardStyles.cardPriorityRow}>
                          <Flag size={11} color={priorityColor} fill={priorityColor} strokeWidth={1} />
                          <span style={{ ...boardStyles.cardPriorityLabel, color: priorityColor }}>
                            {(PRIORITY_LABELS[task.priority] || '').toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Title */}
                      <div style={{
                        ...boardStyles.cardTitle,
                        ...(isDone ? boardStyles.cardTitleCompleted : {}),
                      }}>
                        {task.title}
                      </div>

                      {/* Footer: project chip + assignee avatar */}
                      {showFooter && (
                        <div style={boardStyles.cardFooter}>
                          {project ? (
                            <span style={{
                              ...boardStyles.cardTag,
                              color: project.color || T.accentAvatar,
                              backgroundColor: (project.color || T.accentAvatar) + '1F',
                            }}>
                              {project.title}
                            </span>
                          ) : <span />}
                          {assignee && (
                            <span style={{ ...boardStyles.cardAvatar, backgroundColor: avatarColor }}>
                              {initialsOf(assignee.name)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal — rendered outside the scroll container
          so position:fixed works correctly on Safari */}
      {selectedTask && (
        <KanbanCardModal
          task={selectedTask}
          project={selectedTask.projectId ? projectMap[selectedTask.projectId] || null : null}
          onClose={() => setSelectedTaskId(null)}
          onUpdateTask={onUpdateTask}
          onCompleteTask={onCompleteTask}
          isReadOnly={isReadOnly}
        />
      )}
    </>
  );
}

// ── Board styles ──────────────────────────────────────

const boardStyles: Record<string, React.CSSProperties> = {
  board: {
    display: 'flex',
    gap: 10,
    flex: 1,
    padding: '16px 20px 20px',
    overflow: 'auto',
    minHeight: 0,
    outline: 'none',
    fontFamily: T.font,
  },
  column: {
    flex: '1 1 0%',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: T.bgTertiary,
    borderRadius: 12,
    border: 'none',
    padding: '12px 10px',
    overflow: 'hidden',
    transition: 'box-shadow 0.15s ease, background-color 0.15s ease',
    outline: 'none',
  },
  columnDragOver: {
    boxShadow: 'inset 0 0 0 1.5px #E0DCF5',
    backgroundColor: 'rgba(107,76,230,0.03)',
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '0 4px 8px',
    flexShrink: 0,
  },
  columnTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: T.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  columnCount: {
    fontFamily: T.mono,
    fontSize: 11,
    color: T.textFaint,
    fontWeight: 500,
  },
  cardList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
    paddingRight: 1,
  },
  emptyColumn: {
    textAlign: 'center',
    color: T.textFaintest,
    fontSize: 12,
    padding: '16px 8px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    border: `1px solid #EDEDF3`,
    cursor: 'pointer',
    boxShadow: T.shadowCard,
    transition: 'box-shadow 0.15s ease, border-color 0.15s ease, opacity 0.15s ease',
    userSelect: 'none',
  },
  cardDragging: {
    borderColor: '#E0DCF5',
    boxShadow: T.shadowCardRaised,
  },
  cardCompleted: {
    opacity: 0.7,
  },
  cardPriorityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  cardPriorityLabel: {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  cardTitle: {
    fontSize: 12.5,
    fontWeight: 500,
    color: T.textPrimary,
    lineHeight: 1.4,
    wordBreak: 'break-word' as const,
  },
  cardTitleCompleted: {
    textDecoration: 'line-through',
    color: T.textMuted,
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
    paddingTop: 9,
    borderTop: `1px solid ${T.borderRow}`,
  },
  cardTag: {
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 5,
    maxWidth: '70%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  cardAvatar: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    color: '#fff',
    fontSize: 9,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};

export default React.memo(KanbanBoard);
