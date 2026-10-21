import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface ApprovalHistoryItem {
  _id: string;
  requestNumber: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeId: string;
    jobTitle: string;
  };
  leaveType: {
    name: string;
    color: string;
  };
  startDate: string;
  endDate: string;
  workingDays: number;
  status: 'approved' | 'rejected';
  approverComments?: string;
  approvedAt?: string;
  approver?: {
    firstName: string;
    lastName: string;
  };
}

export const ApprovalHistoryPage: React.FC = () => {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['approval-history'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ApprovalHistoryItem[] }>('/approvals/history');
      return res.data.data;
    },
  });

  if (isLoading) return <LoadingSpinner message="Loading approval records..." />;

  return (
    <div className="container-fluid p-0">
      <div className="mb-4">
        <h4 className="fw-bold text-dark mb-1">Approval History</h4>
        <p className="text-muted small mb-0">Audit record of all past leave decisions made for team members.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase text-secondary">
              <tr>
                <th>Request #</th>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Decision</th>
                <th>Decided At</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted small">
                    No approval decisions recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h._id}>
                    <td className="fw-semibold text-dark small">{h.requestNumber}</td>
                    <td>
                      <div className="fw-semibold text-dark small">
                        {h.employee?.firstName} {h.employee?.lastName}
                      </div>
                      <div className="text-muted small" style={{ fontSize: '11px' }}>
                        ID: {h.employee?.employeeId}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">{h.leaveType?.name}</span>
                    </td>
                    <td className="small text-secondary">
                      {new Date(h.startDate).toLocaleDateString()} - {new Date(h.endDate).toLocaleDateString()}
                    </td>
                    <td className="small fw-semibold">{h.workingDays}d</td>
                    <td>
                      <StatusBadge status={h.status} />
                    </td>
                    <td className="small text-muted">
                      {h.approvedAt ? new Date(h.approvedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="small text-muted text-truncate" style={{ maxWidth: '220px' }}>
                      {h.approverComments || '-'}
                    </td>
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
