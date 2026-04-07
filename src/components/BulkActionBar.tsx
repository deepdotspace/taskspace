/**
 * Bulk Action Bar - Shows when multiple tasks are selected
 * Ported from previous_task_widget/components/BulkActionBar.jsx
 */

import React from 'react';
import { Task } from '../constants';

interface BulkActionBarProps {
  selectedCount: number;
  selectedTasks: Task[];
  onDelete: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  onComplete: () => void;
  onUncomplete: () => void;
  onClearSelection: () => void;
  isTrashView: boolean;
}

function BulkActionBar({
  selectedCount,
  selectedTasks,
  onDelete,
  onRestore,
  onPermanentDelete,
  onComplete,
  onUncomplete,
  onClearSelection,
  isTrashView,
}: BulkActionBarProps) {
  // Determine if all selected tasks are completed
  const allCompleted = selectedTasks?.length > 0 && selectedTasks.every(t => t.completed);

  return (
    <div data-bulk-bar style={barStyles.container}>
      <div style={barStyles.leftSection}>
        <span style={barStyles.selectionCount}>
          {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
        </span>
        <button onClick={onClearSelection} style={barStyles.clearButton}>
          Clear
        </button>
      </div>

      <div data-bulk-actions style={barStyles.actions}>
        {isTrashView ? (
          <>
            <button onClick={onRestore} style={{ ...barStyles.actionButton, ...barStyles.restoreButton }} title="Restore">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" />
              </svg>
              <span>Restore</span>
            </button>
            <button onClick={onPermanentDelete} style={{ ...barStyles.actionButton, ...barStyles.deleteButton }} title="Delete Permanently">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              <span>Delete Permanently</span>
            </button>
          </>
        ) : (
          <>
            {allCompleted ? (
              <button onClick={onUncomplete} style={barStyles.actionButton} title="Mark Incomplete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 9l6 6m0-6l-6 6" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span>Uncomplete</span>
              </button>
            ) : (
              <button onClick={onComplete} style={barStyles.actionButton} title="Mark Complete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Complete</span>
              </button>
            )}

            {/* Delete */}
            <button onClick={onDelete} style={{ ...barStyles.actionButton, ...barStyles.deleteButton }} title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              <span>Delete</span>
            </button>

          </>
        )}
      </div>
    </div>
  );
}

const barStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 24px',
    backgroundColor: '#007AFF',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    gap: '16px',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  selectionCount: {
    fontSize: '14px',
    fontWeight: 600,
  },
  clearButton: {
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  deleteButton: {
    backgroundColor: 'rgba(255,59,48,0.3)',
    border: '1px solid rgba(255,59,48,0.5)',
  },
  restoreButton: {
    backgroundColor: 'rgba(52,199,89,0.3)',
    border: '1px solid rgba(52,199,89,0.5)',
  },
};

export default React.memo(BulkActionBar);
