import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow">
          <div className="modal-header border-bottom-0 pb-0">
            <h5 className="modal-title fw-semibold">{title}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onCancel}
              disabled={isLoading}
              aria-label="Close"
            />
          </div>
          <div className="modal-body py-3">
            <p className="text-secondary mb-0">{message}</p>
          </div>
          <div className="modal-footer border-top-0 pt-0">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={`btn btn-${variant}`}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
