/**
 * Badge Component
 * 
 * Uses semantic theme colors from tailwind.config.js
 */

import React from 'react'

export type BadgeColor = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

export interface BadgeProps {
  children: React.ReactNode
  color?: BadgeColor
  variant?: 'solid' | 'subtle'
  size?: 'sm' | 'md'
}

const colorClasses: Record<BadgeColor, { subtle: string; solid: string }> = {
  primary: {
    subtle: 'bg-primary-muted text-primary border-primary-border',
    solid: 'bg-primary text-white',
  },
  success: {
    subtle: 'bg-success-muted text-success border-success-border',
    solid: 'bg-success text-white',
  },
  warning: {
    subtle: 'bg-warning-muted text-warning border-warning-border',
    solid: 'bg-warning text-white',
  },
  danger: {
    subtle: 'bg-danger-muted text-danger border-danger-border',
    solid: 'bg-danger text-white',
  },
  info: {
    subtle: 'bg-info-muted text-info border-info-border',
    solid: 'bg-info text-white',
  },
  muted: {
    subtle: 'bg-surface-overlay/50 text-content-secondary border-border',
    solid: 'bg-surface-overlay text-content',
  },
}

export function Badge({ children, color = 'primary', variant = 'subtle', size = 'sm' }: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
  const colors = colorClasses[color]

  if (variant === 'solid') {
    return (
      <span className={`${sizeClasses} font-medium rounded inline-flex items-center shadow-sm ${colors.solid}`}>
        {children}
      </span>
    )
  }

  return (
    <span className={`${sizeClasses} font-medium rounded inline-flex items-center border ${colors.subtle}`}>
      {children}
    </span>
  )
}
