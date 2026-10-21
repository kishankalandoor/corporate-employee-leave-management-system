import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  fullPage?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  fullPage = false,
}) => {
  const content = (
    <div className="d-flex flex-column align-items-center justify-content-center p-5">
      <div className="spinner-border text-primary" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      {message && <p className="text-muted mt-3 mb-0 fw-medium small">{message}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        {content}
      </div>
    );
  }

  return content;
};
