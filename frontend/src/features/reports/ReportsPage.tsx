import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface ReportRow {
  _id: string;
  requestNumber: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: { name: string };
  };
  leaveType: {
    name: string;
    code: string;
  };
  startDate: string;
  endDate: string;
  workingDays: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  submittedAt: string;
  approver?: {
    firstName: string;
    lastName: string;
  };
}

export const ReportsPage: React.FC = () => {
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['leave-reports', status, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get<{ success: boolean; data: ReportRow[] }>(`/reports/leaves?${params.toString()}`);
      return res.data.data;
    },
  });

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    window.open(`/api/reports/leaves/export?${params.toString()}`, '_blank');
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">Reports & Analytics</h4>
          <p className="text-muted small mb-0">Generate detailed leave audit logs and export authorized CSV spreadsheets.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm"
          onClick={handleExportCsv}
          disabled={rows.length === 0}
        >
          <i className="bi bi-file-earmark-arrow-down-fill" aria-hidden="true" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold text-secondary">Status Filter</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold text-secondary">Start Date From</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold text-secondary">Start Date To</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="card border-0 shadow-sm">
        {isLoading ? (
          <LoadingSpinner message="Generating report..." />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-uppercase text-secondary">
                <tr>
                  <th>Request ID</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Approver</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted small">
                      No records match the selected report criteria.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r._id}>
                      <td className="fw-semibold text-dark small">{r.requestNumber}</td>
                      <td>
                        <div className="fw-semibold text-dark small">
                          {r.employee?.firstName} {r.employee?.lastName}
                        </div>
                        <div className="text-muted small" style={{ fontSize: '11px' }}>
                          {r.employee?.employeeId}
                        </div>
                      </td>
                      <td className="small text-secondary">{r.employee?.department?.name || '-'}</td>
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
                      <td className="small text-muted">
                        {r.approver ? `${r.approver.firstName} ${r.approver.lastName}` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
