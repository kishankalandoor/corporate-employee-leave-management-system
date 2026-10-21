import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  colorClass?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  colorClass = 'primary',
  trend,
}) => {
  return (
    <div className="card shadow-sm border-0 h-100 stat-card">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="text-muted text-uppercase fw-semibold small tracking-wide">{title}</span>
          <div
            className={`p-2 rounded-3 bg-${colorClass}-subtle text-${colorClass} d-flex align-items-center justify-content-center`}
            style={{ width: '40px', height: '40px' }}
          >
            <i className={`bi ${icon} fs-5`} aria-hidden="true" />
          </div>
        </div>
        <div className="d-flex align-items-baseline gap-2">
          <h3 className="fw-bold mb-0 text-dark">{value}</h3>
          {trend && (
            <span
              className={`small fw-medium ${
                trend.isPositive ? 'text-success' : 'text-danger'
              }`}
            >
              <i
                className={`bi ${trend.isPositive ? 'bi-arrow-up-short' : 'bi-arrow-down-short'}`}
                aria-hidden="true"
              />
              {trend.value}
            </span>
          )}
        </div>
        {subtitle && <p className="text-muted small mb-0 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};
