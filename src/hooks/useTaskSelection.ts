/**
 * Multi-selection support with shift-click range selection
 * Matches old widget: onSelect(task, { metaKey, shiftKey, forceSelect })
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import { Task } from '../constants';

interface SelectOpts {
  metaKey: boolean;
  shiftKey: boolean;
  forceSelect?: boolean;
}

export function useTaskSelection(tasks: Task[], displayedTasks: Task[]) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [lastClickedTaskId, setLastClickedTaskId] = useState<string | null>(null);
  const lastClickedRef = useRef<string | null>(null);

  // Keep ref in sync
  lastClickedRef.current = lastClickedTaskId;

  const selectedTasks = useMemo(() => {
    return tasks.filter(t => selectedTaskIds.includes(t.id));
  }, [tasks, selectedTaskIds]);

  const selectedTask = useMemo(() => {
    if (selectedTaskIds.length !== 1) return null;
    return tasks.find(t => t.id === selectedTaskIds[0]) || null;
  }, [tasks, selectedTaskIds]);

  const clearSelection = useCallback(() => {
    setSelectedTaskIds([]);
    setLastClickedTaskId(null);
  }, []);

  const handleSelectTask = useCallback(
    (task: Task, opts: SelectOpts) => {
      const taskId = task.id;
      const { metaKey, shiftKey, forceSelect } = opts;

      if (forceSelect) {
        // Force select just this one (used by double-click to open detail)
        setSelectedTaskIds([taskId]);
        setLastClickedTaskId(taskId);
        return;
      }

      if (shiftKey && lastClickedRef.current) {
        // Shift-click on an already-selected item → toggle it off
        setSelectedTaskIds(prev => {
          if (prev.includes(taskId)) {
            const next = prev.filter(id => id !== taskId);
            // If nothing left, clear lastClicked too
            if (next.length === 0) setLastClickedTaskId(null);
            return next;
          }
          // Shift-click on an unselected item → range select from last clicked
          const lastIdx = displayedTasks.findIndex(t => t.id === lastClickedRef.current);
          const currIdx = displayedTasks.findIndex(t => t.id === taskId);
          if (lastIdx !== -1 && currIdx !== -1) {
            const start = Math.min(lastIdx, currIdx);
            const end = Math.max(lastIdx, currIdx);
            const rangeIds = displayedTasks.slice(start, end + 1).map(t => t.id);
            const merged = new Set([...prev, ...rangeIds]);
            return Array.from(merged);
          }
          return [...prev, taskId];
        });
      } else if (metaKey) {
        // Cmd/Ctrl-click: toggle individual
        setSelectedTaskIds(prev => {
          if (prev.includes(taskId)) {
            return prev.filter(id => id !== taskId);
          }
          return [...prev, taskId];
        });
        setLastClickedTaskId(taskId);
      } else {
        // Simple click: toggle (deselect if already selected, otherwise select only this)
        setSelectedTaskIds(prev => {
          if (prev.length === 1 && prev[0] === taskId) {
            return []; // deselect
          }
          return [taskId];
        });
        setLastClickedTaskId(taskId);
      }
    },
    [displayedTasks]
  );

  return {
    selectedTaskIds,
    setSelectedTaskIds,
    setLastClickedTaskId,
    selectedTasks,
    selectedTask,
    clearSelection,
    handleSelectTask,
  };
}
