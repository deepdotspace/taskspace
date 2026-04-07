/**
 * Kanban Card Detail Modal
 *
 * Shown when a user clicks a task card on the kanban board.
 * Displays: title, kanban status, project, priority.
 * Actions: mark complete, move to previous/next stage.
 */

import React, { useEffect } from 'react';
import {
  Task,
  Project,
  KANBAN_STATUS_CONFIG,
  KANBAN_STATUS_LABELS,
  KANBAN_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '../constants';
import { Icon } from '../utils/icons';

interface KanbanCardModalProps {
  task: Task;
  project: Project | null;
  onClose: () => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onCompleteTask: (id: string) => void;
  isReadOnly: boolean;
}

export default function KanbanCardModal({
  task,
  project,
  onClose,
  onUpdateTask,
  onCompleteTask,
  isReadOnly,
}: KanbanCardModalProps) {
  // Find current status index for navigation
  const currentIndex = KANBAN_STATUS_CONFIG.findIndex(s => s.id === task.kanbanStatus);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < KANBAN_STATUS_CONFIG.length - 1;

  const handlePrev = () => {
    if (canGoPrev && !isReadOnly) {
      const prevStatus = KANBAN_STATUS_CONFIG[currentIndex - 1];
      const updates: Record<string, any> = { kanbanStatus: prevStatus.id };
      // Moving away from "done" → mark incomplete
      if (task.kanbanStatus === 'done' && task.completed) {
        updates.completed = false;
        updates.completedAt = null;
      }
      onUpdateTask(task.id, updates);
    }
  };

  const handleNext = () => {
    if (canGoNext && !isReadOnly) {
      const nextStatus = KANBAN_STATUS_CONFIG[currentIndex + 1];
      const updates: Record<string, any> = { kanbanStatus: nextStatus.id };
      // Moving to "done" → mark complete
      if (nextStatus.id === 'done' && !task.completed) {
        updates.completed = true;
        updates.completedAt = Date.now();
      }
      onUpdateTask(task.id, updates);
    }
  };

  const handleComplete = () => {
    if (!isReadOnly) {
      onCompleteTask(task.id);
      onClose();
    }
  };

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const statusColor = KANBAN_STATUS_COLORS[task.kanbanStatus] || '#8E8E93';
  const statusLabel = KANBAN_STATUS_LABELS[task.kanbanStatus] || task.kanbanStatus;
  const priorityColor = PRIORITY_COLORS[task.priority] || '#8E8E93';
  const priorityLabel = PRIORITY_LABELS[task.priority] || 'None';

  const nextBtnColor = canGoNext
    ? KANBAN_STATUS_COLORS[KANBAN_STATUS_CONFIG[currentIndex + 1].id] || '#007AFF'
    : '#8E8E93';

  return (
    <div data-kanban-modal-overlay style={modalStyles.overlay} onClick={onClose}>
      <div data-kanban-modal style={modalStyles.container} onClick={e => e.stopPropagation()}>
        {/* ── Header: title + status badge ── */}
        <div style={modalStyles.header}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={modalStyles.title}>{task.title}</h3>
            <span style={{
              ...modalStyles.statusBadge,
              backgroundColor: statusColor + '14',
              color: statusColor,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                backgroundColor: statusColor,
                flexShrink: 0,
              }} />
              {statusLabel}
            </span>
          </div>
          <button onClick={onClose} style={modalStyles.closeBtn}>
            <Icon name="x" size={16} color="#8E8E93" />
          </button>
        </div>

        {/* Divider */}
        <div style={modalStyles.divider} />

        {/* ── Body: project + priority side by side ── */}
        <div style={modalStyles.body}>
          <div style={modalStyles.fieldGrid}>
            {/* Project */}
            <div style={modalStyles.fieldCol}>
              <span style={modalStyles.fieldLabel}>PROJECT</span>
              {project ? (
                <span style={modalStyles.fieldPill}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    backgroundColor: project.color || '#007AFF',
                    flexShrink: 0,
                  }} />
                  {project.title}
                </span>
              ) : (
                <span style={{ ...modalStyles.fieldPill, color: '#8E8E93' }}>None</span>
              )}
            </div>

            {/* Priority */}
            <div style={modalStyles.fieldCol}>
              <span style={modalStyles.fieldLabel}>PRIORITY</span>
              <span style={modalStyles.fieldPill}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  backgroundColor: priorityColor,
                  flexShrink: 0,
                }} />
                {priorityLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={modalStyles.divider} />

        {/* ── Footer: nav buttons + complete ── */}
        {!isReadOnly && (
          <div style={modalStyles.footer}>
            {/* Left: nav buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              {canGoPrev && (
                <button
                  onClick={handlePrev}
                  className="kanban-modal-button"
                  style={modalStyles.prevBtn}
                >
                  <Icon name="chevron-left" size={14} color="#3C3C43" />
                  {KANBAN_STATUS_CONFIG[currentIndex - 1].label}
                </button>
              )}

              {canGoNext && (
                <button
                  onClick={handleNext}
                  className="kanban-modal-button"
                  style={{
                    ...modalStyles.nextBtn,
                    backgroundColor: nextBtnColor,
                  }}
                >
                  {KANBAN_STATUS_CONFIG[currentIndex + 1].label}
                  <Icon name="chevron-right" size={14} color="#fff" />
                </button>
              )}
            </div>

            {/* Right: complete button */}
            {!task.completed && (
              <button
                onClick={handleComplete}
                className="kanban-modal-button"
                style={modalStyles.completeBtn}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3C3C43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Mark Complete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal styles ──────────────────────────────────────

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    backdropFilter: 'blur(4px)',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 18,
    width: '100%',
    maxWidth: 470,
    boxShadow: '0 24px 80px rgba(0,0,0,0.14), 0 8px 24px rgba(0,0,0,0.08)',
    animation: 'modalFadeIn 0.2s ease-out',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '24px 24px 20px',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1D1D1F',
    lineHeight: '1.3',
    margin: '0 0 10px 0',
    wordBreak: 'break-word' as const,
  },
  closeBtn: {
    border: 'none',
    background: '#F2F2F7',
    cursor: 'pointer',
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.15s ease',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    margin: '0',
  },
  body: {
    padding: '24px 24px',
  },
  fieldGrid: {
    display: 'flex',
    gap: 32,
  },
  fieldCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#8E8E93',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
  fieldPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    color: '#1D1D1F',
    backgroundColor: '#F9F9FB',
    border: '1px solid #F0F0F0',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '20px 24px 24px',
    backgroundColor: '#FAFAFA',
  },
  prevBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: '10px 18px',
    border: '1px solid #E5E5EA',
    borderRadius: 12,
    background: '#fff',
    fontSize: 14,
    fontWeight: 500,
    color: '#3C3C43',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
  },
  nextBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: '10px 18px',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
  },
  completeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 18px',
    border: '1px solid #E5E5EA',
    borderRadius: 12,
    background: '#fff',
    fontSize: 14,
    fontWeight: 500,
    color: '#3C3C43',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
  },
};

