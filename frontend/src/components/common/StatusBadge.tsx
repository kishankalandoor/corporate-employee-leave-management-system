import React from 'react';

interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'active' | 'inactive';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'pending':
        return {
          bg: 'warning text-dark',
          icon: 'bi-hourglass-split',
          label: 'Pending',
        };
      case 'approved':
        return {
          bg: 'success text-white',
          icon: 'bi-check-circle-fill',
          label: 'Approved',
        };
      case 'rejected':
        return {
          bg: 'danger text-white',
          icon: 'bi-x-circle-fill',
          label: 'Rejected',
        };
      case 'cancelled':
        return {
          bg: 'secondary text-white',
          icon: 'bi-dash-circle-fill',
          label: 'Cancelled',
        };
      case 'active':
        return {
          bg: 'success text-white',
          icon: 'bi-record-circle',
          label: 'Active',
        };
      case 'inactive':
        return {
          bg: 'secondary text-white',
          icon: 'bi-slash-circle',
          label: 'Inactive',
        };
      default:
        return {
          bg: 'light text-dark',
          icon: 'bi-info-circle',
          label: status,
        };
    }
  };

  const { bg, icon, label } = getBadgeConfig();

  return (
    <span className={`badge bg-${bg} d-inline-flex align-items-center gap-1 px-2 py-1`}>
      <i className={`bi ${icon}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
