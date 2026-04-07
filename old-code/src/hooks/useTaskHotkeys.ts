/**
 * Keyboard shortcuts for task management
 */
import { useEffect } from 'react';
import { Task } from '../constants';

interface UseTaskHotkeysOptions {
  selectedTaskIds: string[];
  displayedTasks: Task[];
  clearSelection: () => void;
  setSelectedTaskIds: (ids: string[]) => void;
  onDeleteSelected: () => void;
}

export function useTaskHotkeys(options: UseTaskHotkeysOptions) {
  const { selectedTaskIds, displayedTasks, clearSelection, setSelectedTaskIds, onDeleteSelected } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // Escape → clear selection
      if (e.key === 'Escape') {
        clearSelection();
        return;
      }

      // Delete / Backspace → delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTaskIds.length > 0) {
        e.preventDefault();
        onDeleteSelected();
        return;
      }

      // Cmd/Ctrl+A → select all displayed
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedTaskIds(displayedTasks.map(t => t.id));
        return;
      }

      // Arrow keys → navigate
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (displayedTasks.length === 0) return;
        e.preventDefault();

        const currentId = selectedTaskIds.length === 1 ? selectedTaskIds[0] : null;
        const currentIdx = currentId ? displayedTasks.findIndex(t => t.id === currentId) : -1;

        let nextIdx: number;
        if (e.key === 'ArrowUp') {
          nextIdx = currentIdx > 0 ? currentIdx - 1 : 0;
        } else {
          nextIdx = currentIdx < displayedTasks.length - 1 ? currentIdx + 1 : displayedTasks.length - 1;
        }

        setSelectedTaskIds([displayedTasks[nextIdx].id]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskIds, displayedTasks, clearSelection, setSelectedTaskIds, onDeleteSelected]);
}

