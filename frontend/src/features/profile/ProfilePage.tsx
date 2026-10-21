import React from 'react';
import { useAuth } from '../auth/AuthContext.js';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="container-fluid p-0" style={{ maxWidth: '720px' }}>
      <div className="mb-4">
        <h4 className="fw-bold text-dark mb-1">My Profile</h4>
        <p className="text-muted small mb-0">Your employee credentials and organizational assignments.</p>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-3 mb-4 pb-4 border-bottom">
            <div
              className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold fs-4"
              style={{ width: '64px', height: '64px' }}
            >
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>
            <div>
              <h5 className="fw-bold text-dark mb-1">{user.fullName}</h5>
              <div className="d-flex gap-2 align-items-center">
                <span className="badge bg-primary-subtle text-primary text-uppercase">{user.role}</span>
                <span className="text-muted small">• {user.jobTitle}</span>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <label className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '11px' }}>
                Employee ID
              </label>
              <div className="fw-semibold text-dark">{user.employeeId}</div>
            </div>
            <div className="col-12 col-sm-6">
              <label className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '11px' }}>
                Email Address
              </label>
              <div className="fw-semibold text-dark">{user.email}</div>
            </div>
            <div className="col-12 col-sm-6">
              <label className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '11px' }}>
                Department
              </label>
              <div className="fw-semibold text-dark">
                {typeof user.department === 'object' && user.department ? user.department.name : 'Unassigned'}
              </div>
            </div>
            <div className="col-12 col-sm-6">
              <label className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '11px' }}>
                Account Status
              </label>
              <div>
                <span className="badge bg-success-subtle text-success text-capitalize">{user.status}</span>
              </div>
            </div>
            <div className="col-12 col-sm-6">
              <label className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '11px' }}>
                Employment Type
              </label>
              <div className="fw-semibold text-dark text-capitalize">{user.employmentStatus || 'Full-time'}</div>
            </div>
            <div className="col-12 col-sm-6">
              <label className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '11px' }}>
                Joining Date
              </label>
              <div className="fw-semibold text-dark">
                {user.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
