/**
 * Drag and drop with custom drag image
 * Matches previous_task_widget/utils/dragDrop.js
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { Task } from '../constants';

export function useDragDrop(
  items: Task[],
  onReorder: (draggedId: string, targetId: string) => void,
  clearSort?: () => void,
  selectedTaskIds: string[] = []
) {
  const [dragState, setDragState] = useState<{
    dragging: Task | null;
    over: Task | null;
  }>({ dragging: null, over: null });

  const dragRef = useRef<{ dragging: Task | null; over: Task | null }>({
    dragging: null,
    over: null,
  });

  // Keep a ref of selectedTaskIds so callbacks always read the latest value
  // (avoids stale closure when the hook is called before useTaskSelection in render order)
  const selectedIdsRef = useRef<string[]>(selectedTaskIds);
  selectedIdsRef.current = selectedTaskIds;

  const handleDragStart = useCallback(
    (e: React.DragEvent, item: Task) => {
      dragRef.current.dragging = item;
      setDragState(prev => ({ ...prev, dragging: item }));

      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.id);
      // Mark as task drag so project/user nodes in sidebar can detect it
      e.dataTransfer.setData('application/x-task', item.id);

      // Read from ref to always get the latest selection
      const ids = selectedIdsRef.current;
      const isMultiDrag = ids.includes(item.id) && ids.length > 1;
      const dragCount = isMultiDrag ? ids.length : 1;

      // Create custom drag image
      const ghost = document.createElement('div');
      ghost.style.cssText = `
        position: fixed;
        top: -1000px;
        left: -1000px;
        padding: 8px 12px;
        background: #6366f1;
        color: white;
        border-radius: 8px;
        font: 13px -apple-system, system-ui, sans-serif;
        font-weight: 500;
        box-shadow: 0 8px 24px rgba(99,102,241,0.35);
        pointer-events: none;
        white-space: nowrap;
      `;

      // Show count for multi-drag, otherwise show task title
      if (isMultiDrag) {
        ghost.textContent = `${dragCount} tasks`;
      } else {
        ghost.textContent = (item.title || 'Task').slice(0, 25);
      }

      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);

      // Clean up after browser captures the image
      setTimeout(() => {
        if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
      }, 0);
    },
    [] // stable — reads from ref
  );

  const handleDragOver = useCallback((e: React.DragEvent, item: Task) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (
      dragRef.current.over?.id !== item.id &&
      dragRef.current.dragging?.id !== item.id
    ) {
      dragRef.current.over = item;
      setDragState(prev => ({ ...prev, over: item }));
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    dragRef.current.over = null;
    setDragState(prev => ({ ...prev, over: null }));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropTarget: Task) => {
      e.preventDefault();

      const draggedItem = dragRef.current.dragging;

      dragRef.current = { dragging: null, over: null };
      setDragState({ dragging: null, over: null });

      if (!draggedItem || !dropTarget || draggedItem.id === dropTarget.id) {
        return;
      }

      // If the dragged item is part of a multi-selection, skip in-list reorder.
      // Multi-drag reordering individual items is confusing; sidebar drops
      // (project/user assignment) are handled separately by Sidebar event handlers.
      const ids = selectedIdsRef.current;
      const isMultiDrag = ids.includes(draggedItem.id) && ids.length > 1;
      if (isMultiDrag) {
        return;
      }

      // Clear sort when reordering
      if (clearSort) clearSort();

      // Use the onReorder callback to persist the new order
      onReorder(draggedItem.id, dropTarget.id);
    },
    [onReorder, clearSort]
  );

  const handleDragEnd = useCallback(() => {
    dragRef.current = { dragging: null, over: null };
    setDragState({ dragging: null, over: null });
  }, []);

  // Memoize the handlers object so downstream React.memo components
  // (e.g. TaskItem) see a stable reference and skip unnecessary re-renders.
  const handlers = useMemo(() => ({
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onDragEnd: handleDragEnd,
  }), [handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd]);

  return {
    draggedItem: dragState.dragging,
    dragOverItem: dragState.over,
    handlers,
  };
}
