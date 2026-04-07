import { useState, useMemo, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from './utils'
import { getMonthGrid, getMonthName, isSameDay, isToday, toDateString } from './date-utils'

export interface CalendarProps {
  selected?: Date | null
  onSelect?: (date: Date) => void
  /** Controlled month view */
  month?: Date
  onMonthChange?: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  disabledDates?: (date: Date) => boolean
  /** Custom day rendering — receives the date and default element, return a replacement */
  renderDay?: (date: Date, defaultEl: ReactNode) => ReactNode
  className?: string
}

export function Calendar({
  selected,
  onSelect,
  month: controlledMonth,
  onMonthChange,
  minDate,
  maxDate,
  disabledDates,
  renderDay,
  className,
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = useState(() => {
    if (controlledMonth) return controlledMonth
    if (selected) return new Date(selected.getFullYear(), selected.getMonth(), 1)
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const displayMonth = controlledMonth ?? internalMonth
  const year = displayMonth.getFullYear()
  const monthIdx = displayMonth.getMonth()

  const setMonth = useCallback((d: Date) => {
    if (onMonthChange) onMonthChange(d)
    else setInternalMonth(d)
  }, [onMonthChange])

  const days = useMemo(() => getMonthGrid(year, monthIdx), [year, monthIdx])

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Sync internal month when controlledMonth changes
  useEffect(() => {
    if (controlledMonth) setInternalMonth(controlledMonth)
  }, [controlledMonth])

  const isDisabled = useCallback((date: Date): boolean => {
    if (minDate) {
      const min = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
      if (date < min) return true
    }
    if (maxDate) {
      const max = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
      if (date > max) return true
    }
    if (disabledDates) return disabledDates(date)
    return false
  }, [minDate, maxDate, disabledDates])

  function prevMonth() {
    setMonth(new Date(year, monthIdx - 1, 1))
  }

  function nextMonth() {
    setMonth(new Date(year, monthIdx + 1, 1))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const idx = focusedIndex ?? days.findIndex(d => selected && isSameDay(d, selected))
    if (idx === -1) return

    let next = idx
    switch (e.key) {
      case 'ArrowRight': next = Math.min(idx + 1, 41); break
      case 'ArrowLeft': next = Math.max(idx - 1, 0); break
      case 'ArrowDown': next = Math.min(idx + 7, 41); break
      case 'ArrowUp': next = Math.max(idx - 7, 0); break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!isDisabled(days[idx])) onSelect?.(days[idx])
        return
      default: return
    }
    e.preventDefault()
    setFocusedIndex(next)

    // If moved to a different month, navigate
    const nextDate = days[next]
    if (nextDate.getMonth() !== monthIdx) {
      setMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1))
    }
  }

  return (
    <div className={cn('p-3', className)} data-testid="calendar">
      {/* Month/Year header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {getMonthName(monthIdx)} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div
        ref={gridRef}
        className="grid grid-cols-7"
        role="grid"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {days.map((day, i) => {
          const inMonth = day.getMonth() === monthIdx
          const sel = selected ? isSameDay(day, selected) : false
          const today = isToday(day)
          const disabled = isDisabled(day)
          const focused = focusedIndex === i

          const defaultEl = (
            <button
              key={toDateString(day)}
              type="button"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => {
                if (!disabled) {
                  onSelect?.(day)
                  setFocusedIndex(i)
                }
              }}
              className={cn(
                'relative w-8 h-8 rounded-md flex items-center justify-center text-sm transition-colors mx-auto',
                sel && 'bg-primary text-primary-foreground font-semibold',
                !sel && today && 'ring-1 ring-primary text-primary font-semibold',
                !sel && !today && inMonth && !disabled && 'text-foreground hover:bg-accent',
                !inMonth && 'text-muted-foreground/40',
                disabled && inMonth && 'text-muted-foreground/40 cursor-not-allowed',
                focused && !sel && 'ring-1 ring-ring',
              )}
              aria-selected={sel}
              aria-disabled={disabled}
              data-date={toDateString(day)}
            >
              {day.getDate()}
            </button>
          )

          return renderDay ? (
            <span key={toDateString(day)}>{renderDay(day, defaultEl)}</span>
          ) : (
            defaultEl
          )
        })}
      </div>
    </div>
  )
}
