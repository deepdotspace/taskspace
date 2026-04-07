/**
 * Modal Components
 * 
 * Uses semantic theme colors from tailwind.config.js
 */

import React, { ReactNode, useEffect, useRef, JSX } from 'react'
import { X } from 'lucide-react'

// ============================================================================
// Modal - Accessible modal dialog
// ============================================================================

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
}

export function Modal({
  open,
  onClose,
  children,
  size = 'md',
  closeOnOverlay = true,
  closeOnEscape = true,
}: ModalProps): JSX.Element | null {
  const contentRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  useEffect(() => {
    if (!open || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose, closeOnEscape])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Focus trap - focus first focusable element
  useEffect(() => {
    if (open && contentRef.current) {
      const focusable = contentRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      focusable?.focus()
    }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  const handleOverlayClick = (e: React.MouseEvent): void => {
    if (closeOnOverlay && e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={contentRef}
        className={`
          w-full ${sizes[size]} bg-surface-elevated border border-border rounded-xl shadow-card
          animate-in zoom-in-95 slide-in-from-bottom-2 duration-200
          flex flex-col max-h-[85vh]
        `}
      >
        {children}
      </div>
    </div>
  )
}

// ============================================================================
// Modal.Header
// ============================================================================

interface ModalHeaderProps {
  children: ReactNode
  onClose?: () => void
  className?: string
}

function ModalHeader({ children, onClose, className = '' }: ModalHeaderProps): JSX.Element {
  return (
    <div className={`flex items-start justify-between gap-4 p-5 border-b border-border ${className}`}>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-surface-overlay text-content-muted hover:text-content transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Modal.Title
// ============================================================================

interface ModalTitleProps {
  children: ReactNode
  className?: string
}

function ModalTitle({ children, className = '' }: ModalTitleProps): JSX.Element {
  return (
    <h2 className={`text-lg font-semibold text-content ${className}`}>
      {children}
    </h2>
  )
}

// ============================================================================
// Modal.Description
// ============================================================================

interface ModalDescriptionProps {
  children: ReactNode
  className?: string
}

function ModalDescription({ children, className = '' }: ModalDescriptionProps): JSX.Element {
  return (
    <p className={`text-sm text-content-secondary mt-1 ${className}`}>
      {children}
    </p>
  )
}

// ============================================================================
// Modal.Body - Scrollable content area
// ============================================================================

interface ModalBodyProps {
  children: ReactNode
  className?: string
}

function ModalBody({ children, className = '' }: ModalBodyProps): JSX.Element {
  return (
    <div className={`flex-1 overflow-y-auto p-5 ${className}`}>
      {children}
    </div>
  )
}

// ============================================================================
// Modal.Footer - Action buttons area
// ============================================================================

interface ModalFooterProps {
  children: ReactNode
  className?: string
}

function ModalFooter({ children, className = '' }: ModalFooterProps): JSX.Element {
  return (
    <div className={`flex items-center justify-end gap-3 p-5 border-t border-border ${className}`}>
      {children}
    </div>
  )
}

// ============================================================================
// Button - Simple button component for modals
// ============================================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps): JSX.Element {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/25',
    secondary: 'bg-surface-overlay/50 text-content hover:bg-surface-overlay border border-border',
    danger: 'bg-danger text-white hover:bg-danger/80 shadow-lg shadow-danger/25',
    ghost: 'hover:bg-surface-overlay text-content-secondary hover:text-content',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}

// ============================================================================
// ConfirmModal - Pre-built confirmation dialog
// ============================================================================

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps): JSX.Element {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <Modal.Header onClose={onClose}>
        <Modal.Title>{title}</Modal.Title>
        {description && <Modal.Description>{description}</Modal.Description>}
      </Modal.Header>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

// ============================================================================
// Attach sub-components
// ============================================================================

Modal.Header = ModalHeader
Modal.Title = ModalTitle
Modal.Description = ModalDescription
Modal.Body = ModalBody
Modal.Footer = ModalFooter

export default Modal
