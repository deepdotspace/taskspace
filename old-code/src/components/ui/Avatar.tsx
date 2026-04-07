/**
 * Avatar Component
 * 
 * Uses semantic theme colors from tailwind.config.js
 */

import React from 'react'

export type AvatarColor = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

export interface AvatarProps {
  name?: string
  imageUrl?: string
  color?: AvatarColor
  size?: 'sm' | 'md' | 'lg'
}

const colorClasses: Record<AvatarColor, string> = {
  primary: 'bg-primary shadow-primary/40',
  success: 'bg-success shadow-success/40',
  warning: 'bg-warning shadow-warning/40',
  danger: 'bg-danger shadow-danger/40',
  info: 'bg-info shadow-info/40',
  muted: 'bg-surface-overlay shadow-none',
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
}

export function Avatar({ name = '', imageUrl, color = 'primary', size = 'md' }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase() || '?'

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-border`}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-medium shadow-lg ${colorClasses[color]}`}
    >
      {initial}
    </div>
  )
}
