import React from 'react';
import { Icon } from '../utils/icons';
import { styles } from '../utils/styles';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmStyle?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmStyle = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div style={styles.modal} onClick={onCancel}>
      <div data-modal-content style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>{title}</h3>
          <button onClick={onCancel} style={styles.modalClose}>
            <Icon name="x" size={18} color="#9CA0B8" />
          </button>
        </div>
        <div style={styles.confirmModalBody}>{message}</div>
        <div style={styles.confirmModalActions}>
          <button onClick={onCancel} style={styles.btnCancel}>
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={confirmStyle === 'danger' ? styles.btnDelete : styles.btnSave}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

