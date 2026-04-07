/**
 * Icon utilities — Tree-shaken Lucide React icons
 *
 * Renders icons as pure React components via lucide-react.
 * Only the icons actually used are bundled (~35 icons vs ~4000+ from CDN).
 *
 * MIGRATION: Replaced the old CDN-based approach (https://unpkg.com/lucide@latest)
 * which loaded the ENTIRE icon library (~4MB+), caused raw DOM manipulation
 * memory leaks, and made the site unresponsive over time.
 */
import React from 'react';
import type { LucideProps } from 'lucide-react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CirclePlus,
  Clock,
  Columns2,
  Copy,
  Eye,
  Folder,
  Inbox,
  LogIn,
  LogOut,
  Mail,
  Pencil,
  Plus,
  PlusCircle,
  RotateCcw,
  Settings,
  Star,
  Tag,
  Trash2,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
  Users,
  X,
} from 'lucide-react';

/**
 * Map from kebab-case icon name → React component.
 *
 * To add a new icon:
 * 1. Import it from 'lucide-react' above
 * 2. Add the kebab-case → Component mapping below
 */
const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  'arrow-left': ArrowLeft,
  'calendar': Calendar,
  'check': Check,
  'check-circle': CheckCircle,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'circle-plus': CirclePlus,
  'clock': Clock,
  'columns': Columns2,
  'copy': Copy,
  'eye': Eye,
  'folder': Folder,
  'inbox': Inbox,
  'log-in': LogIn,
  'log-out': LogOut,
  'mail': Mail,
  'pencil': Pencil,
  'plus': Plus,
  'plus-circle': PlusCircle,
  'rotate-ccw': RotateCcw,
  'settings': Settings,
  'star': Star,
  'tag': Tag,
  'trash-2': Trash2,
  'user': User,
  'user-check': UserCheck,
  'user-minus': UserMinus,
  'user-plus': UserPlus,
  'user-x': UserX,
  'users': Users,
  'x': X,
};

/**
 * Icon component — renders a Lucide icon by kebab-case name.
 *
 * Drop-in replacement for the old CDN-based Icon component.
 * Same props interface so no call-site changes needed.
 */
export function Icon({
  name,
  size = 18,
  color = 'currentColor',
  strokeWidth = 2,
  style = {},
  className,
  onClick,
}: {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const IconComponent = ICON_MAP[name];

  if (!IconComponent) {
    if (import.meta.env?.DEV) {
      console.warn(`[Icon] Unknown icon name: "${name}". Add it to ICON_MAP in icons.tsx.`);
    }
    return (
      <span
        className={className}
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${size}px`,
          height: `${size}px`,
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  return (
    <span
      className={className}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        ...style,
      }}
    >
      <IconComponent
        size={size}
        color={color}
        strokeWidth={strokeWidth}
      />
    </span>
  );
}

export default Icon;
