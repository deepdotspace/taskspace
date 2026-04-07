/**
 * Button Component
 * 
 * Uses semantic theme colors from tailwind.config.js
 */

import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const baseClasses =
    'font-medium rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }

  const variantClasses = {
    primary:
      'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98]',
    secondary:
      'bg-surface-overlay/50 text-content hover:bg-surface-overlay border border-border-strong hover:border-border-strong',
    danger:
      'bg-danger/90 text-white hover:bg-danger shadow-lg shadow-danger/25 hover:shadow-danger/40',
    ghost: 'bg-transparent text-content-secondary hover:bg-surface-overlay/50 hover:text-content',
  }

  return (
    <button className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
