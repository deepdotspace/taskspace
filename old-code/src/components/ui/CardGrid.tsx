/**
 * Card Grid Components
 * 
 * Uses semantic theme colors from tailwind.config.js
 */

import React, { ReactNode, JSX } from 'react'
import { MoreHorizontal, Trash2 } from 'lucide-react'

// ============================================================================
// CardGrid - Responsive grid container
// ============================================================================

interface CardGridProps {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function CardGrid({ children, columns = 3, className = '' }: CardGridProps): JSX.Element {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }

  return (
    <div className={`grid gap-4 ${gridCols[columns]} ${className}`}>
      {children}
    </div>
  )
}

// ============================================================================
// Card - Base card component
// ============================================================================

interface CardProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  hoverable?: boolean
}

export function Card({ children, onClick, className = '', hoverable = true }: CardProps): JSX.Element {
  return (
    <div
      onClick={onClick}
      className={`
        group relative bg-surface-elevated rounded-xl border border-border overflow-hidden
        transition-all duration-200
        ${hoverable ? 'hover:border-border-strong hover:shadow-card-hover hover:-translate-y-0.5' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Card.Image - Optional image header
// ============================================================================

interface CardImageProps {
  src: string
  alt?: string
  height?: 'sm' | 'md' | 'lg'
  className?: string
}

function CardImage({ src, alt = '', height = 'md', className = '' }: CardImageProps): JSX.Element {
  const heights = {
    sm: 'h-24',
    md: 'h-36',
    lg: 'h-48',
  }

  return (
    <div className={`${heights[height]} overflow-hidden bg-surface-overlay ${className}`}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </div>
  )
}

// ============================================================================
// Card.Header - Title area with optional actions
// ============================================================================

interface CardHeaderProps {
  children: ReactNode
  actions?: ReactNode
  className?: string
}

function CardHeader({ children, actions, className = '' }: CardHeaderProps): JSX.Element {
  return (
    <div className={`flex items-start justify-between gap-2 p-4 pb-2 ${className}`}>
      <div className="flex-1 min-w-0">{children}</div>
      {actions && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Card.Title
// ============================================================================

interface CardTitleProps {
  children: ReactNode
  className?: string
}

function CardTitle({ children, className = '' }: CardTitleProps): JSX.Element {
  return (
    <h3 className={`font-semibold text-content truncate ${className}`}>
      {children}
    </h3>
  )
}

// ============================================================================
// Card.Content - Main content area
// ============================================================================

interface CardContentProps {
  children: ReactNode
  className?: string
}

function CardContent({ children, className = '' }: CardContentProps): JSX.Element {
  return (
    <div className={`px-4 pb-4 ${className}`}>
      {children}
    </div>
  )
}

// ============================================================================
// Card.Description - Muted text with line clamp
// ============================================================================

interface CardDescriptionProps {
  children: ReactNode
  lines?: 1 | 2 | 3 | 4
  className?: string
}

function CardDescription({ children, lines = 2, className = '' }: CardDescriptionProps): JSX.Element {
  const lineClamp = {
    1: 'line-clamp-1',
    2: 'line-clamp-2',
    3: 'line-clamp-3',
    4: 'line-clamp-4',
  }

  return (
    <p className={`text-sm text-content-secondary leading-relaxed ${lineClamp[lines]} ${className}`}>
      {children}
    </p>
  )
}

// ============================================================================
// Card.Footer - Bottom area for meta info
// ============================================================================

interface CardFooterProps {
  children: ReactNode
  className?: string
}

function CardFooter({ children, className = '' }: CardFooterProps): JSX.Element {
  return (
    <div className={`px-4 pb-4 pt-2 text-xs text-content-muted ${className}`}>
      {children}
    </div>
  )
}

// ============================================================================
// Card.Badge - Status badge
// ============================================================================

interface CardBadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

function CardBadge({ children, variant = 'default', className = '' }: CardBadgeProps): JSX.Element {
  const variants = {
    default: 'bg-surface-overlay text-content-secondary border-border',
    success: 'bg-success-muted text-success border-success-border',
    warning: 'bg-warning-muted text-warning border-warning-border',
    danger: 'bg-danger-muted text-danger border-danger-border',
  }

  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

// ============================================================================
// Card.Actions - Common action buttons
// ============================================================================

interface CardActionsProps {
  onDelete?: () => void
  onMore?: () => void
}

function CardActions({ onDelete, onMore }: CardActionsProps): JSX.Element {
  const handleClick = (e: React.MouseEvent, handler?: () => void): void => {
    e.stopPropagation()
    handler?.()
  }

  return (
    <div className="flex items-center gap-1">
      {onMore && (
        <button
          onClick={(e) => handleClick(e, onMore)}
          className="p-1.5 rounded-lg bg-surface-overlay/50 hover:bg-surface-overlay text-content-muted hover:text-content transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => handleClick(e, onDelete)}
          className="p-1.5 rounded-lg bg-surface-overlay/50 hover:bg-danger-muted text-content-muted hover:text-danger transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Attach sub-components
// ============================================================================

Card.Image = CardImage
Card.Header = CardHeader
Card.Title = CardTitle
Card.Content = CardContent
Card.Description = CardDescription
Card.Footer = CardFooter
Card.Badge = CardBadge
Card.Actions = CardActions

export default Card
