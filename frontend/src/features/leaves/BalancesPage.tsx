import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface BalanceDetail {
  _id: string;
  leaveType: {
    name: string;
    code: string;
    color: string;
    isPaid: boolean;
    allowHalfDay: boolean;
  };
  policyYear: number;
  entitlement: number;
  carryForward: number;
  adjustments: number;
  usedDays: number;
  pendingDays: number;
  available: number;
}

export const BalancesPage: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const { data: balances = [], isLoading, error } = useQuery({
    queryKey: ['my-balances-detailed', currentYear],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: BalanceDetail[] }>(`/leave-balances/me?year=${currentYear}`);
      return res.data.data;
    },
  });

  if (isLoading) return <LoadingSpinner message="Calculating your leave balances..." />;

  return (
    <div className="container-fluid p-0">
      <div className="mb-4">
        <h4 className="fw-bold text-dark mb-1">Leave Balances — {currentYear}</h4>
        <p className="text-muted small mb-0">
          Formula: <span className="fw-semibold">Available = Entitlement + Carry Forward + Adjustments - Used</span>. Pending days are held in reservation.
        </p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase text-secondary">
              <tr>
                <th>Leave Category</th>
                <th>Type</th>
                <th className="text-center">Annual Quota</th>
                <th className="text-center">Carry Forward</th>
                <th className="text-center">Adjustments</th>
                <th className="text-center">Consumed</th>
                <th className="text-center">In Review</th>
                <th className="text-end">Available</th>
              </tr>
            </thead>
            <tbody>
              {balances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted small">
                    No balance allocation found for policy year {currentYear}.
                  </td>
                </tr>
              ) : (
                balances.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <div className="fw-semibold text-dark small">{b.leaveType?.name}</div>
                      <div className="text-muted small" style={{ fontSize: '11px' }}>
                        Code: {b.leaveType?.code}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${b.leaveType?.isPaid ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary'}`}>
                        {b.leaveType?.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="text-center small fw-semibold">{b.entitlement}d</td>
                    <td className="text-center small text-secondary">{b.carryForward}d</td>
                    <td className="text-center small text-secondary">
                      {b.adjustments > 0 ? `+${b.adjustments}` : b.adjustments}d
                    </td>
                    <td className="text-center small text-danger fw-semibold">{b.usedDays}d</td>
                    <td className="text-center small text-warning fw-semibold">{b.pendingDays}d</td>
                    <td className="text-end">
                      <span className="badge bg-success fs-6 px-3 py-2">
                        {b.available} Days
                      </span>
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
