import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '../utils/icons';

interface DatePickerProps {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (value: string | null) => void;
  style?: React.CSSProperties;
  disabled?: boolean;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseYMD(ymd: string): { year: number; month: number; day: number } | null {
  if (!ymd) return null;
  const parts = ymd.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return { year: parts[0], month: parts[1], day: parts[2] };
}

function toYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function formatDisplayDate(ymd: string): string {
  const parsed = parseYMD(ymd);
  if (!parsed) return '';
  const d = new Date(parsed.year, parsed.month - 1, parsed.day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DatePicker({ value, onChange, style, disabled }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calendar navigation state
  const parsed = parseYMD(value);
  const today = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }, []);

  const [viewYear, setViewYear] = useState(parsed?.year || today.year);
  const [viewMonth, setViewMonth] = useState(parsed?.month || today.month);

  // Sync view to selected date when value changes
  useEffect(() => {
    const p = parseYMD(value);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handlePrevMonth = useCallback(() => {
    setViewMonth(prev => {
      if (prev === 1) { setViewYear(y => y - 1); return 12; }
      return prev - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth(prev => {
      if (prev === 12) { setViewYear(y => y + 1); return 1; }
      return prev + 1;
    });
  }, []);

  const handleSelectDay = useCallback((day: number) => {
    const newValue = toYMD(viewYear, viewMonth, day);
    onChange(newValue);
    setIsOpen(false);
  }, [viewYear, viewMonth, onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setIsOpen(false);
  }, [onChange]);

  const handleToday = useCallback(() => {
    const todayStr = toYMD(today.year, today.month, today.day);
    onChange(todayStr);
    setIsOpen(false);
  }, [today, onChange]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
    const daysInPrevMonth = getDaysInMonth(
      viewMonth === 1 ? viewYear - 1 : viewYear,
      viewMonth === 1 ? 12 : viewMonth - 1
    );

    const cells: Array<{ day: number; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }> = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.day && viewMonth === today.month && viewYear === today.year;
      const isSelected = parsed ? d === parsed.day && viewMonth === parsed.month && viewYear === parsed.year : false;
      cells.push({ day: d, isCurrentMonth: true, isToday, isSelected });
    }

    // Next month padding (fill to 42 = 6 rows)
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, isCurrentMonth: false, isToday: false, isSelected: false });
    }

    return cells;
  }, [viewYear, viewMonth, today, parsed]);

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={dpStyles.trigger}
      >
        <Icon name="calendar" size={14} color={value ? '#1f2937' : '#9ca3af'} />
        <span style={{ flex: 1, textAlign: 'left', color: value ? '#1f2937' : '#9ca3af' }}>
          {value ? formatDisplayDate(value) : 'No date'}
        </span>
        {value && !disabled && (
          <span
            onClick={handleClear}
            style={dpStyles.clearBtn}
            title="Clear date"
          >
            ×
          </span>
        )}
      </button>

      {/* Calendar dropdown */}
      {isOpen && (
        <div style={dpStyles.dropdown}>
          {/* Navigation header */}
          <div style={dpStyles.navRow}>
            <button type="button" onClick={handlePrevMonth} style={dpStyles.navBtn}>
              <Icon name="chevron-left" size={14} color="#6b7280" />
            </button>
            <span style={dpStyles.monthLabel}>
              {MONTHS[viewMonth - 1]} {viewYear}
            </span>
            <button type="button" onClick={handleNextMonth} style={dpStyles.navBtn}>
              <Icon name="chevron-right" size={14} color="#6b7280" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div style={dpStyles.grid}>
            {DAYS.map(d => (
              <div key={d} style={dpStyles.dayHeader}>{d}</div>
            ))}

            {/* Calendar cells */}
            {calendarDays.map((cell, idx) => (
              <button
                key={idx}
                type="button"
                disabled={!cell.isCurrentMonth}
                onClick={() => cell.isCurrentMonth && handleSelectDay(cell.day)}
                style={{
                  ...dpStyles.dayCell,
                  ...(cell.isCurrentMonth ? {} : dpStyles.dayCellOtherMonth),
                  ...(cell.isToday ? dpStyles.dayCellToday : {}),
                  ...(cell.isSelected ? dpStyles.dayCellSelected : {}),
                }}
              >
                {cell.day}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div style={dpStyles.footer}>
            <button type="button" onClick={handleToday} style={dpStyles.todayBtn}>
              Today
            </button>
            {value && (
              <button type="button" onClick={handleClear} style={dpStyles.clearFooterBtn}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const dpStyles: Record<string, React.CSSProperties> = {
  trigger: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    fontSize: 13,
    border: '1px solid #f0f0f0',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    transition: 'border-color 0.15s ease',
    boxSizing: 'border-box',
    color: '#1f2937',
  },
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: '1',
    cursor: 'pointer',
    border: 'none',
    flexShrink: 0,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
    zIndex: 100,
    padding: '12px',
    userSelect: 'none',
  },
  navRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    outline: 'none',
    transition: 'background-color 0.15s ease',
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1f2937',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 2,
  },
  dayHeader: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 500,
    color: '#9ca3af',
    padding: '4px 0',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  dayCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    aspectRatio: '1',
    fontSize: 12,
    fontWeight: 400,
    color: '#374151',
    border: 'none',
    borderRadius: 6,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.1s ease',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  dayCellOtherMonth: {
    color: '#d1d5db',
    cursor: 'default',
  },
  dayCellToday: {
    fontWeight: 600,
    color: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  dayCellSelected: {
    backgroundColor: '#007AFF',
    color: '#ffffff',
    fontWeight: 600,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid #f0f0f0',
  },
  todayBtn: {
    fontSize: 12,
    fontWeight: 500,
    color: '#007AFF',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 6,
    outline: 'none',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  clearFooterBtn: {
    fontSize: 12,
    fontWeight: 500,
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 6,
    outline: 'none',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
};

