import React, { useState } from 'react';
import { styles } from '../utils/styles';
import { WidgetUser } from '../constants';

interface UserIdentityProps {
  currentUser: WidgetUser;
  getDisplayName: (user: WidgetUser | null) => string;
}

export default function UserIdentity({ currentUser, getDisplayName }: UserIdentityProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name[0] || '?').toUpperCase();
  };

  return (
    <div
      style={{
        ...styles.userIdentity,
        ...(isHovered ? { backgroundColor: 'rgba(0,0,0,0.08)' } : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span style={{
        ...styles.userIdentityAvatar,
        backgroundColor: currentUser.color || '#007AFF',
      }}>
        {getInitials(currentUser.name || 'U')}
      </span>
      <span>{getDisplayName(currentUser)}</span>
      {currentUser.role && (
        <span style={{
          fontSize: '10px',
          color: '#8E8E93',
          textTransform: 'uppercase',
        }}>
          {currentUser.role}
        </span>
      )}
    </div>
  );
}

