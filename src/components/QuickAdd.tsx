/**
 * Quick Add Task Input with professional styling
 * Supports multi-line paste to create multiple tasks at once
 */

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../utils/icons';

interface QuickAddProps {
  onAdd: (data: { title: string }) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function QuickAdd({ onAdd, placeholder, autoFocus }: QuickAddProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

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
    <form onSubmit={handleSubmit} data-quick-add style={localStyles.container}>
      <div style={localStyles.inputRow}>
        <div style={{
          ...localStyles.inputWrapper,
          ...(isFocused ? localStyles.inputWrapperFocused : {})
        }}>
          <Icon name="plus" size={18} color={isFocused ? '#6366f1' : '#9ca3af'} />
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
            style={localStyles.input}
          />
        </div>
        <button
          type="submit"
          data-testid="quick-add-submit"
          style={{
            ...localStyles.addButton,
            ...(hasValue ? localStyles.addButtonActive : {})
          }}
          disabled={!hasValue}
        >
          <Icon name="circle-plus" size={20} color="currentColor" />
        </button>
      </div>
    </form>
  );
}

const localStyles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px 20px 20px',
    borderTop: '1px solid #f0f0f0',
    backgroundColor: '#ffffff'
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  inputWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #f0f0f0',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
  },
  inputWrapperFocused: {
    border: '1px solid #6366f1',
    boxShadow: '0 0 0 3px rgba(99,102,241,0.12)'
  },
  input: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontSize: '14px',
    color: '#1f2937',
    outline: 'none',
    fontFamily: 'inherit'
  },
  addButton: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#f5f5f5',
    color: '#9ca3af',
    cursor: 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0
  },
  addButtonActive: {
    backgroundColor: '#6366f1',
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(99,102,241,0.25)'
  }
};

export default React.memo(QuickAdd);
