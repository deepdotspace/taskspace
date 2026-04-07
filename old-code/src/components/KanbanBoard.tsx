/**
 * Kanban Board View
 *
 * Renders 5 columns (Backlog, Ready, In Progress, Review, Done).
 * Cards show task title + project name. Click opens KanbanCardModal.
 * HTML5 drag-and-drop moves tasks between columns (updates kanbanStatus).
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Task,
  Project,
  KANBAN_STATUS_CONFIG,
} from '../constants';
import KanbanCardModal from './KanbanCardModal';

interface KanbanBoardProps {
  tasks: Task[];
  projects: Project[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onCompleteTask: (id: string) => void;
  isReadOnly: boolean;
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
      padding: 8px 14px; background: #fff; border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      font-size: 13px; font-weight: 500; color: #1D1D1F;
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    backgroundColor: col.color,
                    flexShrink: 0,
                  }} />
                  <span style={boardStyles.columnTitle}>{col.label}</span>
                </div>
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
                        ...(task.completed ? boardStyles.cardCompleted : {}),
                      }}
                    >
                      <div style={{
                        ...boardStyles.cardTitle,
                        ...(task.completed ? boardStyles.cardTitleCompleted : {}),
                      }}>
                        {task.title}
                      </div>
                      {project && (
                        <div style={boardStyles.cardProject}>
                          <span style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            backgroundColor: project.color || '#007AFF',
                            flexShrink: 0,
                          }} />
                          <span style={boardStyles.cardProjectName}>
                            {project.title}
                          </span>
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
    gap: 12,
    flex: 1,
    padding: '16px 20px 20px',
    overflow: 'auto',
    minHeight: 0,
    outline: 'none',
  },
  column: {
    flex: '1 1 0%',
    minWidth: 180,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    border: 'none',
    boxShadow: 'inset 0 0 0 1px #f0f0f0',
    overflow: 'hidden',
    transition: 'box-shadow 0.15s ease, background-color 0.15s ease',
    outline: 'none',
  },
  columnDragOver: {
    boxShadow: 'inset 0 0 0 2px #007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.03)',
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderBottom: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  columnTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1D1D1F',
  },
  columnCount: {
    fontSize: 12,
    fontWeight: 500,
    color: '#8E8E93',
    backgroundColor: '#fff',
    padding: '2px 7px',
    borderRadius: 10,
    border: '1px solid #f0f0f0',
  },
  cardList: {
    flex: 1,
    overflowY: 'auto',
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  emptyColumn: {
    textAlign: 'center',
    color: '#C7C7CC',
    fontSize: 13,
    padding: '24px 8px',
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: '10px 12px',
    border: '1px solid #E5E5EA',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s ease, border-color 0.15s ease, opacity 0.15s ease',
    userSelect: 'none',
  },
  cardDragging: {
    opacity: 0.4,
    boxShadow: 'none',
  },
  cardCompleted: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: '#1D1D1F',
    lineHeight: '1.4',
    wordBreak: 'break-word' as const,
  },
  cardTitleCompleted: {
    textDecoration: 'line-through',
    color: '#8E8E93',
  },
  cardProject: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  cardProjectName: {
    fontSize: 11,
    color: '#8E8E93',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

export default React.memo(KanbanBoard);
