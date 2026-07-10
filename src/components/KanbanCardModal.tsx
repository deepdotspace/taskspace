/**
 * Kanban Card Detail Modal — "Momentum" restyle
 *
 * Shown when a user clicks a task card on the kanban board.
 * Displays: title, kanban status, project, priority.
 * Actions: mark complete, move to previous/next stage.
 *
 * UI-only restyle: all controls/mechanisms (prev/next stage nav, complete,
 * Escape-to-close, scrim-click-to-close) are preserved, as are the DOM
 * hooks that the mobile stylesheet targets:
 *   data-kanban-modal-overlay, data-kanban-modal, and the trailing footer
 *   div (nav-button group as its first child), plus the className hooks
 *   "kanban-nav-btn", "kanban-complete-btn", "kanban-modal-button".
 */

import React, { useEffect } from 'react';
import {
  Task,
  Project,
  KANBAN_STATUS_CONFIG,
  KANBAN_STATUS_LABELS,
  KANBAN_STATUS_COLORS,
  KANBAN_STATUS_SOFT_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_SOFT_COLORS,
} from '../constants';
import { T, monoLabel } from '../utils/styles';
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

  const statusColor = KANBAN_STATUS_COLORS[task.kanbanStatus] || T.gray;
  const statusSoft = KANBAN_STATUS_SOFT_COLORS[task.kanbanStatus] || T.graySoft;
  const statusLabel = KANBAN_STATUS_LABELS[task.kanbanStatus] || task.kanbanStatus;
  const priorityColor = PRIORITY_COLORS[task.priority] || T.gray;
  const prioritySoft = PRIORITY_SOFT_COLORS[task.priority] || T.graySoft;
  const priorityLabel = PRIORITY_LABELS[task.priority] || 'None';

  const nextStatus = canGoNext ? KANBAN_STATUS_CONFIG[currentIndex + 1] : null;
  const nextBtnColor = nextStatus
    ? KANBAN_STATUS_COLORS[nextStatus.id] || T.accent
    : T.gray;

  return (
    <div data-kanban-modal-overlay style={modalStyles.overlay} onClick={onClose}>
      <div data-kanban-modal style={modalStyles.container} onClick={e => e.stopPropagation()}>
        {/* ── Header: title + status pill ── */}
        <div style={modalStyles.header}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={modalStyles.title}>{task.title}</h3>
            <span style={{
              ...modalStyles.statusPill,
              backgroundColor: statusSoft,
              color: statusColor,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: 3,
                backgroundColor: statusColor,
                flexShrink: 0,
              }} />
              {statusLabel}
            </span>
          </div>
          <button onClick={onClose} style={modalStyles.closeBtn} aria-label="Close">
            <Icon name="x" size={16} color={T.textMuted} />
          </button>
        </div>

        {/* ── Body: project + priority side by side ── */}
        <div style={modalStyles.body}>
          <div style={modalStyles.fieldGrid}>
            {/* Project */}
            <div style={modalStyles.fieldCol}>
              <span style={modalStyles.fieldLabel}>PROJECT</span>
              {project ? (
                <span style={modalStyles.fieldPill}>
                  <span style={{
                    width: 9, height: 9, borderRadius: 3,
                    backgroundColor: project.color || T.accentAvatar,
                    flexShrink: 0,
                  }} />
                  {project.title}
                </span>
              ) : (
                <span style={{ ...modalStyles.fieldPill, color: T.textFaint }}>None</span>
              )}
            </div>

            {/* Priority */}
            <div style={modalStyles.fieldCol}>
              <span style={modalStyles.fieldLabel}>PRIORITY</span>
              <span style={{
                ...modalStyles.priorityPill,
                backgroundColor: task.priority && task.priority !== 'none' ? prioritySoft : T.graySoft,
                color: task.priority && task.priority !== 'none' ? priorityColor : T.textFaint,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  backgroundColor: priorityColor,
                  flexShrink: 0,
                }} />
                {priorityLabel}
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer: nav buttons + complete ── */}
        {!isReadOnly && (
          <div style={modalStyles.footer}>
            {/* Left: nav buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              {canGoPrev && (
                <button
                  onClick={handlePrev}
                  className="kanban-nav-btn kanban-modal-button"
                  style={modalStyles.prevBtn}
                >
                  <Icon name="chevron-left" size={14} color={T.textSecondary} />
                  {KANBAN_STATUS_CONFIG[currentIndex - 1].label}
                </button>
              )}

              {canGoNext && nextStatus && (
                <button
                  onClick={handleNext}
                  className="kanban-modal-button"
                  style={{
                    ...modalStyles.nextBtn,
                    backgroundColor: nextBtnColor,
                    boxShadow: `0 2px 8px -2px ${nextBtnColor}66`,
                  }}
                >
                  {nextStatus.label}
                  <Icon name="chevron-right" size={14} color="#fff" />
                </button>
              )}
            </div>

            {/* Right: complete button */}
            {!task.completed && (
              <button
                onClick={handleComplete}
                className="kanban-complete-btn kanban-modal-button"
                style={modalStyles.completeBtn}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
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
    backgroundColor: T.scrim,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    fontFamily: T.font,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 18,
    width: '100%',
    maxWidth: 470,
    boxShadow: T.shadowModal,
    animation: 'modalFadeIn 0.18s ease',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: T.font,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '22px 22px 18px',
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 650,
    letterSpacing: '-0.01em',
    color: T.textPrimary,
    lineHeight: 1.35,
    margin: '0 0 12px 0',
    wordBreak: 'break-word' as const,
  },
  closeBtn: {
    border: 'none',
    background: T.graySoft,
    cursor: 'pointer',
    width: 30,
    height: 30,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.15s ease',
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 11px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  body: {
    padding: '4px 22px 22px',
  },
  fieldGrid: {
    display: 'flex',
    gap: 28,
  },
  fieldCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    minWidth: 0,
  },
  fieldLabel: {
    ...monoLabel,
    fontSize: '11px',
  },
  fieldPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 12px',
    borderRadius: 9,
    fontSize: 13,
    fontWeight: 500,
    color: T.textPrimary,
    backgroundColor: T.bgTertiary,
    border: `1px solid ${T.border}`,
  },
  priorityPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 12px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '16px 22px 20px',
    borderTop: `1px solid ${T.borderRowLight}`,
    backgroundColor: T.bgSecondary,
  },
  prevBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '9px 15px',
    border: `1px solid ${T.borderBtn}`,
    borderRadius: 10,
    background: '#fff',
    fontSize: 13,
    fontWeight: 500,
    color: T.textSecondary,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
    fontFamily: T.font,
  },
  nextBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '9px 15px',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
    fontFamily: T.font,
  },
  completeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: '9px 15px',
    border: 'none',
    borderRadius: 10,
    background: T.green,
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 2px 8px -2px rgba(34,192,139,0.5)',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
    fontFamily: T.font,
  },
};
