/**
 * Quick Add Task Input with professional styling
 * Supports multi-line paste to create multiple tasks at once
 */

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../utils/icons';
import { styles, T } from '../utils/styles';

interface QuickAddProps {
  onAdd: (data: { title: string }) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Increment to programmatically focus the input (e.g. from a "New task" button). */
  focusToken?: number;
}

function QuickAdd({ onAdd, placeholder, autoFocus, focusToken }: QuickAddProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Programmatic focus when focusToken changes
  useEffect(() => {
    if (focusToken === undefined) return;
    inputRef.current?.focus();
  }, [focusToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    // Check if value contains newlines (multiple tasks)
    const lines = value.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length > 1) {
      // Create multiple tasks
      lines.forEach((line, index) => {
        // Use setTimeout to ensure tasks are created in sequence
        setTimeout(() => {
          onAdd({ title: line });
        }, index * 10); // Small delay to ensure proper ordering
      });
    } else {
      // Single task
      onAdd({ title: lines[0] });
    }

    setValue('');
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');

    // Check if pasted text contains newlines
    if (pastedText.includes('\n') || pastedText.includes('\r')) {
      // Split by newlines and filter out empty lines
      const lines = pastedText.split(/\r?\n/).map((line: string) => line.trim()).filter((line: string) => line.length > 0);

      if (lines.length > 1) {
        // Multiple tasks - prevent default paste and create tasks
        e.preventDefault();
        lines.forEach((line: string, index: number) => {
          setTimeout(() => {
            onAdd({ title: line });
          }, index * 10);
        });
        setValue('');
      }
      // If only one line after filtering, let default paste behavior happen
    }
    // If no newlines, let default paste behavior happen
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim()) {
        const lines = value.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        lines.forEach((line, index) => {
          setTimeout(() => onAdd({ title: line }), index * 10);
        });
        setValue('');
      }
      return;
    }
    if (e.key === 'Escape') {
      setValue('');
      inputRef.current?.blur();
    }
  };

  const hasValue = value.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      data-quick-add
      style={{
        ...styles.quickAdd,
        boxShadow: isFocused ? `inset 0 0 0 1px ${T.accent}22` : 'none',
      }}
    >
      <Icon name="plus" size={17} color={isFocused ? T.accent : T.textFaint} />
      <input
        ref={inputRef}
        data-testid="quick-add-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder || 'New To-Do'}
        style={styles.quickAddInput}
      />
      <button
        type="submit"
        data-testid="quick-add-submit"
        style={{
          ...localStyles.addButton,
          ...(hasValue ? localStyles.addButtonActive : {}),
        }}
        disabled={!hasValue}
      >
        <Icon name="circle-plus" size={20} color="currentColor" />
      </button>
    </form>
  );
}

const localStyles: Record<string, React.CSSProperties> = {
  addButton: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: T.textFaintest,
    cursor: 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    flexShrink: 0,
    padding: 0,
  },
  addButtonActive: {
    color: T.accent,
    cursor: 'pointer',
  },
};

export default React.memo(QuickAdd);
