import React from 'react';
import { Icon } from '../utils/icons';
import { styles } from '../utils/styles';

interface ReadOnlyBannerProps {
  onClose: () => void;
}

export default function ReadOnlyBanner({ onClose }: ReadOnlyBannerProps) {
  return (
    <div style={styles.readOnlyBanner}>
      <Icon name="eye" size={14} color="#856404" />
      <span>You're viewing in read-only mode. Sign in to make changes.</span>
      <button onClick={onClose} style={styles.readOnlyBannerClose}>
        ×
      </button>
    </div>
  );
}

