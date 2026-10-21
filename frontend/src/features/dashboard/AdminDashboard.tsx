import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { StatCard } from '../../components/common/StatCard.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface AbsentEmployeeItem {
  _id: string;
  requestNumber: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
    department?: { name: string; code: string } | null;
    jobTitle?: string;
  };
  leaveType: {
    name: string;
    code: string;
    color: string;
  };
  startDate: string;
  endDate: string;
  workingDays: number;
  isHalfDay?: boolean;
  halfDayPeriod?: string;
  reason?: string;
}

interface AdminDashboardData {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
  absentEmployees: AbsentEmployeeItem[];
  pendingApprovals: number;
  approvedThisYear: number;
  rejectedThisYear: number;
  onLeaveToday: number;
  byLeaveType: Array<{
    _id: string;
    count: number;
    days: number;
    color?: string;
  }>;
  departmentStats: Array<{
    _id: string;
    employeeCount: number;
  }>;
}

export const AdminDashboard: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: AdminDashboardData }>('/dashboard/admin');
      return res.data.data;
    },
  });

  if (isLoading) return <LoadingSpinner message="Loading company-wide administration metrics..." />;
  if (error || !data) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
        Failed to load admin dashboard.
      </div>
    );
  }

  const {
    totalEmployees = 0,
    presentToday = 0,
    absentToday = 0,
    attendanceRate = 100,
    absentEmployees = [],
    pendingApprovals = 0,
    approvedThisYear = 0,
    byLeaveType = [],
    departmentStats = [],
  } = data;

  return (
    <div className="container-fluid p-0">
      {/* Page Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">Administrator Dashboard</h4>
          <p className="text-muted small mb-0">Real-time workforce attendance, company-wide leave operations, and department utilization.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link to="/holidays" className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 shadow-sm">
            <i className="bi bi-calendar-event" aria-hidden="true" />
            <span>Holiday Calendar</span>
          </Link>
          <Link to="/admin/employees" className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 shadow-sm">
            <i className="bi bi-people" aria-hidden="true" />
            <span>Employees</span>
          </Link>
          <Link to="/admin/reports" className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1 shadow-sm">
            <i className="bi bi-file-earmark-spreadsheet" aria-hidden="true" />
            <span>Generate Report</span>
          </Link>
        </div>
      </div>

      {/* Attendance & Workforce Real-Time StatCards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm p-3 h-100 bg-white border-start border-4 border-success">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase">Present Today</span>
                <h3 className="fw-bold text-success mb-0">{presentToday}</h3>
                <span className="text-secondary small" style={{ fontSize: '12px' }}>
                  {attendanceRate}% workforce attendance
                </span>
              </div>
              <div className="p-3 bg-success-subtle text-success rounded-3">
                <i className="bi bi-person-check-fill fs-3" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm p-3 h-100 bg-white border-start border-4 border-danger">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase">Absent / On Leave</span>
                <h3 className="fw-bold text-danger mb-0">{absentToday}</h3>
                <span className="text-secondary small" style={{ fontSize: '12px' }}>
                  Approved leave today
                </span>
              </div>
              <div className="p-3 bg-danger-subtle text-danger rounded-3">
                <i className="bi bi-person-x-fill fs-3" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Workforce"
            value={totalEmployees}
            subtitle="Active registered staff"
            icon="bi-people-fill"
            colorClass="primary"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Pending Approvals"
            value={pendingApprovals}
            subtitle="Awaiting decision"
            icon="bi-hourglass-split"
            colorClass="warning"
          />
        </div>
      </div>

      {/* Real-time Section: Who is Absent Today */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <span className="p-1 px-2 rounded bg-danger-subtle text-danger fw-bold small">
              <i className="bi bi-broadcast me-1" aria-hidden="true" /> Live
            </span>
            <h6 className="fw-bold mb-0 text-dark">Who is Absent Today ({absentToday})</h6>
          </div>
          <span className="text-muted small">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase text-secondary">
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Leave Category</th>
                <th>Leave Dates</th>
                <th>Duration</th>
                <th>Reason / Purpose</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {absentEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    <div className="d-flex flex-column align-items-center">
                      <div className="p-3 bg-success-subtle text-success rounded-circle mb-2">
                        <i className="bi bi-check-circle-fill fs-3" aria-hidden="true" />
                      </div>
                      <span className="fw-bold text-dark">Full Workforce Present Today</span>
                      <span className="small text-secondary">No approved leave absences recorded for today.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                absentEmployees.map((record) => {
                  const emp = record.employee;
                  const startStr = new Date(record.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                  const endStr = new Date(record.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

                  return (
                    <tr key={record._id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: '34px', height: '34px', fontSize: '13px' }}
                          >
                            {emp?.firstName?.[0] || 'E'}{emp?.lastName?.[0] || ''}
                          </div>
                          <div>
                            <span className="fw-bold text-dark d-block small">
                              {emp?.firstName} {emp?.lastName}
                            </span>
                            <span className="text-muted small" style={{ fontSize: '11px' }}>
                              {emp?.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="small fw-semibold text-secondary">{emp?.employeeId || '—'}</td>
                      <td>
                        <span className="badge bg-light text-dark border small">
                          {emp?.department?.name || 'General'}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge small px-2 py-1 text-white"
                          style={{ backgroundColor: record.leaveType?.color || '#0d6efd' }}
                        >
                          {record.leaveType?.name} ({record.leaveType?.code})
                        </span>
                      </td>
                      <td className="small text-dark fw-semibold">
                        {startStr} {startStr !== endStr ? `→ ${endStr}` : ''}
                      </td>
                      <td>
                        <span className="badge bg-secondary-subtle text-secondary small">
                          {record.workingDays} {record.workingDays === 1 ? 'Day' : 'Days'}
                          {record.isHalfDay && ` (${record.halfDayPeriod || 'Half-Day'})`}
                        </span>
                      </td>
                      <td className="small text-muted" style={{ maxWidth: '250px' }}>
                        {record.reason || '—'}
                      </td>
                      <td>
                        <span className="badge bg-success-subtle text-success small">
                          <i className="bi bi-check-circle me-1" aria-hidden="true" />
                          Approved
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="row g-3">
        {/* Department Overview */}
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-dark">Department Headcount & Allocation</h6>
              <Link to="/admin/departments" className="small text-decoration-none fw-semibold">
                Manage <i className="bi bi-chevron-right" aria-hidden="true" />
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase text-secondary">
                  <tr>
                    <th>Department</th>
                    <th>Headcount</th>
                    <th>Operational Status</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentStats.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-muted small">
                        No department data available.
                      </td>
                    </tr>
                  ) : (
                    departmentStats.map((d, idx) => (
                      <tr key={idx}>
                        <td className="fw-semibold text-dark small">{d._id}</td>
                        <td className="small text-secondary">{d.employeeCount} active staff</td>
                        <td>
                          <span className="badge bg-success-subtle text-success small">Active</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Leave Type Usage Distribution */}
        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h6 className="fw-bold mb-0 text-dark">Leave Type Utilization (Annual)</h6>
            </div>
            <div className="card-body">
              {byLeaveType.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  No leave distribution metrics recorded yet.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {byLeaveType.map((lt, idx) => (
                    <div key={idx} className="p-2 border rounded-2 bg-light">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-semibold small text-dark">{lt._id}</span>
                        <span
                          className="badge text-white"
                          style={{ backgroundColor: lt.color || '#0d6efd' }}
                        >
                          {lt.days} Days Total
                        </span>
                      </div>
                      <div className="d-flex justify-content-between small text-muted" style={{ fontSize: '11px' }}>
                        <span>{lt.count} approved requests</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
