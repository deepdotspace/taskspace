/**
 * Custom Dropdown Component
 * Ported from previous_task_widget/components/CustomDropdown.jsx
 * Fully styled dropdown with click-outside handling, keyboard nav, search
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '../utils/icons';

// Inject global styles to handle focus states (can't be done with inline styles)
const injectStyles = () => {
  const styleId = 'custom-dropdown-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .custom-dropdown-trigger:focus {
      outline: none !important;
      box-shadow: none !important;
    }
    .custom-dropdown-trigger:focus-visible {
      outline: none !important;
      box-shadow: none !important;
    }
    .custom-dropdown-option:focus {
      outline: none !important;
    }
  `;
  document.head.appendChild(style);
};

interface DropdownOption {
  value: string;
  label: string;
  color?: string;
  icon?: string;
  indent?: number;
  isAction?: boolean;
}

interface CustomDropdownProps {
  options?: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  width?: string | number;
  size?: 'sm' | 'md' | 'lg';
  searchable?: boolean;
  emptyText?: string;
}

export default function CustomDropdown({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  width = '100%',
  size = 'md',
  searchable = false,
  emptyText = 'No options available',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Inject styles on mount
  useEffect(() => {
    injectStyles();
  }, []);

  // Find the currently selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Filter options based on search query
  const filteredOptions = searchable && searchQuery
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  }, [isOpen, searchable]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsOpen(prev => !prev);
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  }, [disabled, isOpen]);

  const handleSelect = useCallback((optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        }
        break;
      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
          setSearchQuery('');
        }
        break;
    }
  }, [disabled, isOpen, highlightedIndex, filteredOptions, handleSelect]);

  // Size variants
  const sizeConfig = {
    sm: { py: 6, px: 10, fontSize: 12, iconSize: 12 },
    md: { py: 10, px: 14, fontSize: 13, iconSize: 14 },
    lg: { py: 12, px: 16, fontSize: 14, iconSize: 16 },
  };

  const sz = sizeConfig[size] || sizeConfig.md;

  return (
    <div ref={containerRef} style={{ position: 'relative', width }}>
      {/* Trigger */}
      <div
        className="custom-dropdown-trigger"
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: `${sz.py}px ${sz.px}px`,
          backgroundColor: disabled ? '#fafafa' : '#fff',
          border: '1px solid #f0f0f0',
          borderRadius: 10,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          fontSize: sz.fontSize,
          transition: 'border-color 0.15s ease',
          userSelect: 'none' as const,
        }}
      >
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          minWidth: 0,
        }}>
          {selectedOption ? (
            <>
              {selectedOption.color && (
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: 3,
                  backgroundColor: selectedOption.color,
                  flexShrink: 0,
                }} />
              )}
              {selectedOption.icon && (
                <Icon name={selectedOption.icon} size={sz.iconSize} color="#6b7280" />
              )}
              <span style={{
                color: '#1f2937',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' as const,
              }}>
                {selectedOption.label}
              </span>
            </>
          ) : (
            <span style={{ color: '#9ca3af' }}>{placeholder}</span>
          )}
        </span>
        <svg
          width={sz.iconSize}
          height={sz.iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 6,
          backgroundColor: '#fff',
          border: '1px solid #f0f0f0',
          borderRadius: 12,
          boxShadow: '0 12px 48px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {/* Search Input */}
          {searchable && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderBottom: '1px solid #f0f0f0',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  color: '#1f2937',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                  backgroundColor: 'transparent',
                }}
              />
            </div>
          )}

          {/* Options List */}
          <div ref={listRef} style={{ maxHeight: 240, overflowY: 'auto', padding: 4 }} role="listbox">
            {filteredOptions.length === 0 ? (
              <div style={{
                padding: '16px 14px',
                textAlign: 'center' as const,
                color: '#9ca3af',
                fontSize: 13,
              }}>
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;
                const isAction = option.isAction === true;

                return (
                  <div
                    key={option.value ?? `opt-${index}`}
                    className="custom-dropdown-option"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: `${sz.py}px ${sz.px}px`,
                      paddingLeft: option.indent ? 14 + (option.indent * 16) : sz.px,
                      backgroundColor: isSelected
                        ? 'rgba(99, 102, 241, 0.08)'
                        : isHighlighted
                          ? '#f9fafb'
                          : 'transparent',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      fontSize: sz.fontSize,
                      transition: 'background-color 0.1s ease',
                      ...(isAction ? {
                        borderTop: '1px solid #f0f0f0',
                        marginTop: 4,
                        paddingTop: sz.py + 4,
                        color: '#6366f1',
                        fontWeight: 500,
                      } : {}),
                    }}
                  >
                    {option.color && (
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: 3,
                        backgroundColor: option.color,
                        flexShrink: 0,
                      }} />
                    )}
                    {option.icon && (
                      <Icon
                        name={option.icon}
                        size={sz.iconSize}
                        color={isSelected ? '#6366f1' : '#6b7280'}
                      />
                    )}
                    <span style={{
                      color: isAction ? '#6366f1' : (isSelected ? '#1f2937' : '#4b5563'),
                      fontWeight: isAction ? 500 : (isSelected ? 500 : 400),
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                      flex: 1,
                    }}>
                      {option.label}
                    </span>
                    {isSelected && !isAction && (
                      <svg width={sz.iconSize} height={sz.iconSize} viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
