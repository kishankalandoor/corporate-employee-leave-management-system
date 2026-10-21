import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { StatCard } from '../../components/common/StatCard.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface EmployeeDashboardData {
  balances: Array<{
    _id: string;
    leaveType: { name: string; code: string; color: string };
    entitlement: number;
    usedDays: number;
    pendingDays: number;
    available: number;
  }>;
  recentRequests: Array<{
    _id: string;
    requestNumber: string;
    leaveType: { name: string; color: string };
    startDate: string;
    endDate: string;
    workingDays: number;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    submittedAt: string;
  }>;
  upcomingLeaves: Array<{
    _id: string;
    requestNumber: string;
    leaveType: { name: string };
    startDate: string;
    endDate: string;
    workingDays: number;
  }>;
  pendingCount: number;
}

export const EmployeeDashboard: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-dashboard'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: EmployeeDashboardData }>('/dashboard/employee');
      return res.data.data;
    },
  });

  if (isLoading) return <LoadingSpinner message="Loading employee dashboard..." />;
  if (error || !data) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
        Failed to load dashboard data. Please try refreshing.
      </div>
    );
  }

  const { balances = [], recentRequests = [], upcomingLeaves = [], pendingCount = 0 } = data;

  const totalAvailable = balances.reduce((sum, b) => sum + (b.available ?? 0), 0);
  const totalUsed = balances.reduce((sum, b) => sum + (b.usedDays ?? 0), 0);

  return (
    <div className="container-fluid p-0">
      {/* Header with Quick Action */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">Employee Dashboard</h4>
          <p className="text-muted small mb-0">Overview of your leave balances, active applications, and upcoming time off.</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/holidays" className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 shadow-sm">
            <i className="bi bi-calendar-event" aria-hidden="true" />
            <span>Holiday Calendar</span>
          </Link>
          <Link to="/leaves/apply" className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2 shadow-sm">
            <i className="bi bi-plus-lg" aria-hidden="true" />
            <span>Apply for Leave</span>
          </Link>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            title="Available Balance"
            value={`${totalAvailable} Days`}
            subtitle="Combined paid annual leaves"
            icon="bi-calendar-check"
            colorClass="primary"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            title="Leaves Consumed"
            value={`${totalUsed} Days`}
            subtitle="Approved time off this year"
            icon="bi-clock-history"
            colorClass="info"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            title="Pending Requests"
            value={pendingCount}
            subtitle="Awaiting manager approval"
            icon="bi-hourglass-split"
            colorClass="warning"
          />
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-dark">Leave Balances by Type</h6>
              <Link to="/leaves/balances" className="small text-decoration-none fw-semibold">
                View Details <i className="bi bi-chevron-right" aria-hidden="true" />
              </Link>
            </div>
            <div className="card-body">
              {balances.length === 0 ? (
                <p className="text-muted small mb-0">No leave policies assigned for this calendar year.</p>
              ) : (
                <div className="row g-3">
                  {balances.map((b) => (
                    <div key={b._id} className="col-12 col-md-6 col-lg-3">
                      <div className="p-3 border rounded-3 bg-light">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-semibold text-dark small">{b.leaveType?.name}</span>
                          <span className="badge bg-secondary-subtle text-secondary">{b.leaveType?.code}</span>
                        </div>
                        <div className="d-flex align-items-baseline justify-content-between">
                          <span className="fs-4 fw-bold text-primary">{b.available}</span>
                          <span className="small text-muted">of {b.entitlement} days left</span>
                        </div>
                        <div className="progress mt-2" style={{ height: '6px' }}>
                          <div
                            className="progress-bar bg-primary"
                            role="progressbar"
                            style={{
                              width: `${b.entitlement > 0 ? (b.usedDays / b.entitlement) * 100 : 0}%`,
                            }}
                            aria-valuenow={b.usedDays}
                            aria-valuemin={0}
                            aria-valuemax={b.entitlement}
                          />
                        </div>
                        <div className="d-flex justify-content-between small text-muted mt-2" style={{ fontSize: '11px' }}>
                          <span>Used: {b.usedDays}d</span>
                          <span>Pending: {b.pendingDays}d</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tables: Recent Requests & Upcoming Leaves */}
      <div className="row g-3">
        {/* Recent Applications */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-dark">Recent Leave Applications</h6>
              <Link to="/leaves/my-requests" className="small text-decoration-none fw-semibold">
                View All <i className="bi bi-chevron-right" aria-hidden="true" />
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase text-secondary">
                  <tr>
                    <th>Ref #</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted small">
                        No recent leave requests found.
                      </td>
                    </tr>
                  ) : (
                    recentRequests.map((r) => (
                      <tr key={r._id}>
                        <td className="fw-semibold text-dark small">{r.requestNumber}</td>
                        <td>
                          <span className="badge bg-light text-dark border">{r.leaveType?.name}</span>
                        </td>
                        <td className="small text-secondary">
                          {new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()}
                        </td>
                        <td className="small fw-semibold">{r.workingDays}d</td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Upcoming Approved Leaves */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h6 className="fw-bold mb-0 text-dark">Upcoming Approved Time Off</h6>
            </div>
            <div className="card-body">
              {upcomingLeaves.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  <i className="bi bi-calendar-event fs-3 d-block mb-2 text-secondary" aria-hidden="true" />
                  No upcoming scheduled leaves.
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {upcomingLeaves.map((u) => (
                    <li key={u._id} className="list-group-item px-0 py-3 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold text-dark small">{u.leaveType?.name}</div>
                        <div className="text-muted small">
                          {new Date(u.startDate).toLocaleDateString()} to {new Date(u.endDate).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="badge bg-primary-subtle text-primary fw-bold px-2 py-1">
                        {u.workingDays} {u.workingDays === 1 ? 'day' : 'days'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
