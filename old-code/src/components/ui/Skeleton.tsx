import React, { ReactNode, JSX } from 'react';

// ============================================================================
// Skeleton - Base skeleton component
// ============================================================================

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'md',
}: SkeletonProps): JSX.Element {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div
      className={`animate-pulse bg-muted ${roundedClasses[rounded]} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}

// ============================================================================
// SkeletonText - Text line skeleton
// ============================================================================

interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: string;
  className?: string;
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
  className = '',
}: SkeletonTextProps): JSX.Element {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

// ============================================================================
// SkeletonCard - Card skeleton
// ============================================================================

interface SkeletonCardProps {
  hasImage?: boolean;
  className?: string;
}

export function SkeletonCard({ hasImage = false, className = '' }: SkeletonCardProps): JSX.Element {
  return (
    <div className={`border border-border rounded-lg overflow-hidden ${className}`}>
      {hasImage && <Skeleton className="w-full h-32" rounded="none" />}
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <SkeletonText lines={2} />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

// ============================================================================
// SkeletonList - List skeleton
// ============================================================================

interface SkeletonListProps {
  items?: number;
  className?: string;
}

export function SkeletonList({ items = 5, className = '' }: SkeletonListProps): JSX.Element {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-lg">
          <Skeleton className="w-10 h-10" rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="w-16 h-6" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// SkeletonTable - Table skeleton
// ============================================================================

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
}: SkeletonTableProps): JSX.Element {
  return (
    <div className={`border border-border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex gap-4 p-4 bg-muted/50 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-border last:border-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className="h-4 flex-1"
              width={colIndex === 0 ? '40%' : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// SkeletonAvatar - Avatar skeleton
// ============================================================================

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SkeletonAvatar({ size = 'md', className = '' }: SkeletonAvatarProps): JSX.Element {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return <Skeleton className={`${sizes[size]} ${className}`} rounded="full" />;
}

// ============================================================================
// LoadingSpinner - Simple spinner
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps): JSX.Element {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={`${sizes[size]} border-2 border-muted border-t-primary rounded-full animate-spin ${className}`}
    />
  );
}

// ============================================================================
// LoadingOverlay - Full-page or container loading
// ============================================================================

interface LoadingOverlayProps {
  children?: ReactNode;
  message?: string;
  className?: string;
}

export function LoadingOverlay({
  children,
  message,
  className = '',
}: LoadingOverlayProps): JSX.Element {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
      <LoadingSpinner size="lg" />
      {message && <p className="mt-4 text-muted-foreground">{message}</p>}
      {children}
    </div>
  );
}

export default Skeleton;
