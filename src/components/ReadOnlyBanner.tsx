import React from 'react';
import { Icon } from '../utils/icons';
import { styles } from '../utils/styles';

type ReadOnlyBannerProps =
  | {
      mode: 'anonymous';
      onClose: () => void;
      onSignIn: () => void;
    }
  | {
      mode: 'viewer';
      onClose: () => void;
    };

export default function ReadOnlyBanner(props: ReadOnlyBannerProps) {
  const { onClose } = props;
  return (
    <div style={styles.readOnlyBanner}>
      <Icon name="eye" size={14} color="#856404" />
      <span style={styles.readOnlyBannerMessage}>
        {props.mode === 'anonymous'
          ? "You're viewing in read-only mode. Sign in to make changes."
          : 'You have view-only access. Ask a team admin if you need to edit tasks.'}
      </span>
      {props.mode === 'anonymous' && (
        <button
          type="button"
          data-testid="read-only-sign-in-button"
          onClick={props.onSignIn}
          style={styles.readOnlyBannerSignIn}
        >
          Sign in
        </button>
      )}
      <button type="button" onClick={onClose} style={styles.readOnlyBannerClose} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
