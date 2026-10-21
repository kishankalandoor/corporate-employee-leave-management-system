import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { StatCard } from '../../components/common/StatCard.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface AbsentTeamMember {
  _id: string;
  requestNumber: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: string;
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
  reason?: string;
}

interface ManagerDashboardData {
  teamSize: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
  absentEmployees: AbsentTeamMember[];
  pendingCount: number;
  teamOnLeave: AbsentTeamMember[];
  upcomingAbsences: Array<{
    _id: string;
    employee: { firstName: string; lastName: string; employeeId: string };
    leaveType: { name: string; color: string };
    startDate: string;
    endDate: string;
    workingDays: number;
  }>;
}

export const ManagerDashboard: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['manager-dashboard'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ManagerDashboardData }>('/dashboard/manager');
      return res.data.data;
    },
  });

  if (isLoading) return <LoadingSpinner message="Loading team management dashboard..." />;
  if (error || !data) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
        Failed to load manager dashboard.
      </div>
    );
  }

  const {
    teamSize = 0,
    presentToday = 0,
    absentToday = 0,
    attendanceRate = 100,
    absentEmployees = [],
    pendingCount = 0,
    upcomingAbsences = [],
  } = data;

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">Manager Dashboard</h4>
          <p className="text-muted small mb-0">Live team attendance, pending leave approval backlog, and scheduled absences.</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/holidays" className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 shadow-sm">
            <i className="bi bi-calendar-event" aria-hidden="true" />
            <span>Holiday Calendar</span>
          </Link>
          <Link to="/approvals" className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2 shadow-sm">
            <i className="bi bi-check2-circle" aria-hidden="true" />
            <span>Review Approvals ({pendingCount})</span>
          </Link>
        </div>
      </div>

      {/* Attendance & Team StatCards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm p-3 h-100 bg-white border-start border-4 border-success">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase">Present Today</span>
                <h3 className="fw-bold text-success mb-0">{presentToday}</h3>
                <span className="text-secondary small" style={{ fontSize: '12px' }}>
                  {attendanceRate}% team attendance
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
                  Team absences today
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
            title="Team Size"
            value={teamSize}
            subtitle="Direct reportees"
            icon="bi-people"
            colorClass="primary"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Pending Approvals"
            value={pendingCount}
            subtitle="Requires your action"
            icon="bi-hourglass-split"
            colorClass="warning"
          />
        </div>
      </div>

      {/* Who is Absent Today (Team) */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <span className="p-1 px-2 rounded bg-danger-subtle text-danger fw-bold small">
              <i className="bi bi-broadcast me-1" aria-hidden="true" /> Live
            </span>
            <h6 className="fw-bold mb-0 text-dark">Who is Absent Today (Team Members: {absentToday})</h6>
          </div>
          <span className="text-muted small">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase text-secondary">
              <tr>
                <th>Team Member</th>
                <th>Employee ID</th>
                <th>Leave Type</th>
                <th>Absence Dates</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {absentEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    <div className="d-flex flex-column align-items-center">
                      <div className="p-3 bg-success-subtle text-success rounded-circle mb-2">
                        <i className="bi bi-check-circle-fill fs-3" aria-hidden="true" />
                      </div>
                      <span className="fw-bold text-dark">100% Team Attendance</span>
                      <span className="small text-secondary">All your reportees are marked present today.</span>
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
                            style={{ width: '32px', height: '32px', fontSize: '12px' }}
                          >
                            {emp?.firstName?.[0] || 'E'}{emp?.lastName?.[0] || ''}
                          </div>
                          <div>
                            <span className="fw-bold text-dark d-block small">
                              {emp?.firstName} {emp?.lastName}
                            </span>
                            <span className="text-muted small" style={{ fontSize: '11px' }}>
                              {emp?.jobTitle || 'Team Member'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="small fw-semibold text-secondary">{emp?.employeeId || '—'}</td>
                      <td>
                        <span
                          className="badge small px-2 py-1 text-white"
                          style={{ backgroundColor: record.leaveType?.color || '#0d6efd' }}
                        >
                          {record.leaveType?.name}
                        </span>
                      </td>
                      <td className="small text-dark fw-semibold">
                        {startStr} {startStr !== endStr ? `→ ${endStr}` : ''}
                      </td>
                      <td className="small fw-bold">{record.workingDays}d</td>
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

      {/* Upcoming Absences in Team */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3">
          <h6 className="fw-bold mb-0 text-dark">Upcoming Scheduled Absences (Next 30 Days)</h6>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase text-secondary">
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Scheduled Dates</th>
                <th>Days Off</th>
              </tr>
            </thead>
            <tbody>
              {upcomingAbsences.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted small">
                    No upcoming leave scheduled for team members.
                  </td>
                </tr>
              ) : (
                upcomingAbsences.map((u) => (
                  <tr key={u._id}>
                    <td className="small fw-semibold text-dark">
                      {u.employee?.firstName} {u.employee?.lastName}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border small">{u.leaveType?.name}</span>
                    </td>
                    <td className="small text-secondary">
                      {new Date(u.startDate).toLocaleDateString()} → {new Date(u.endDate).toLocaleDateString()}
                    </td>
                    <td className="small fw-bold">{u.workingDays} Days</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
