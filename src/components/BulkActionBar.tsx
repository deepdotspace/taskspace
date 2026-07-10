/**
 * Bulk Action Bar - Shows when multiple tasks are selected
 * Ported from previous_task_widget/components/BulkActionBar.jsx
 */

import React from 'react';
import { Task } from '../constants';
import { styles } from '../utils/styles';

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
    <div data-bulk-bar style={{ ...styles.bulkBar, justifyContent: 'space-between', gap: '16px' }}>
      <div style={barStyles.leftSection}>
        <span style={styles.bulkBarCount}>
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
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  clearButton: {
    ...styles.bulkClearBtn,
    marginLeft: 0,
    padding: '4px 10px',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: '6px',
    fontWeight: 500,
    color: '#fff',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  actionButton: {
    ...styles.bulkBtn,
  },
  deleteButton: {
    ...styles.bulkBtnDanger,
  },
  restoreButton: {
    backgroundColor: 'rgba(52,199,89,0.25)',
    border: '1px solid rgba(52,199,89,0.5)',
    color: '#DDF6E7',
  },
};

export default React.memo(BulkActionBar);
