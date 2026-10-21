import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface LeaveTypeItem {
  _id: string;
  name: string;
  code: string;
  isPaid: boolean;
  requiresApproval: boolean;
  allowHalfDay: boolean;
  color: string;
  isActive: boolean;
}

interface LeavePolicyItem {
  _id: string;
  leaveType: { _id: string; name: string; code: string };
  department?: { _id: string; name: string } | null;
  policyYear: number;
  annualEntitlement: number;
  carryForwardAllowed: boolean;
  maxCarryForwardDays: number;
  minAdvanceNoticeDays: number;
}

export const LeavePoliciesPage: React.FC = () => {
  const { data: types = [], isLoading: loadingTypes } = useQuery({
    queryKey: ['leave-types-admin'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: LeaveTypeItem[] }>('/leave-types');
      return res.data.data;
    },
  });

  const { data: policies = [], isLoading: loadingPolicies } = useQuery({
    queryKey: ['leave-policies-admin'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: LeavePolicyItem[] }>('/leave-types/policies');
      return res.data.data;
    },
  });

  if (loadingTypes || loadingPolicies) return <LoadingSpinner message="Loading policy rules..." />;

  return (
    <div className="container-fluid p-0">
      <div className="mb-4">
        <h4 className="fw-bold text-dark mb-1">Leave Types & Policy Configuration</h4>
        <p className="text-muted small mb-0">Define leave categories, approval gates, annual quotas, and carry-forward limits.</p>
      </div>

      {/* Leave Types Section */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom py-3">
          <h6 className="fw-bold mb-0 text-dark">Configured Leave Categories</h6>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase text-secondary">
              <tr>
                <th>Category Name</th>
                <th>Code</th>
                <th>Paid Status</th>
                <th>Approval Gate</th>
                <th>Half-Day Allowed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t._id}>
                  <td className="fw-semibold text-dark small">{t.name}</td>
                  <td>
                    <span className="badge bg-secondary-subtle text-secondary">{t.code}</span>
                  </td>
                  <td>
                    <span className={`badge ${t.isPaid ? 'bg-primary-subtle text-primary' : 'bg-secondary'}`}>
                      {t.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="small text-secondary">
                    {t.requiresApproval ? (
                      <span className="text-success fw-medium">
                        <i className="bi bi-shield-check me-1" aria-hidden="true" />
                        Manager Required
                      </span>
                    ) : (
                      'Auto-approved'
                    )}
                  </td>
                  <td className="small text-secondary">
                    {t.allowHalfDay ? (
                      <span className="text-primary">
                        <i className="bi bi-check-circle me-1" aria-hidden="true" />
                        Yes
                      </span>
                    ) : (
                      'No'
                    )}
                  </td>
                  <td>
                    <span className={`badge ${t.isActive ? 'bg-success-subtle text-success' : 'bg-secondary'}`}>
                      {t.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Policy Quotas Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3">
          <h6 className="fw-bold mb-0 text-dark">Active Entitlement Policies</h6>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase text-secondary">
              <tr>
                <th>Category</th>
                <th>Scope</th>
                <th>Policy Year</th>
                <th className="text-center">Annual Quota</th>
                <th className="text-center">Carry Forward Limit</th>
                <th className="text-center">Min Advance Notice</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p._id}>
                  <td className="fw-semibold text-dark small">{p.leaveType?.name}</td>
                  <td className="small text-secondary">
                    {p.department ? p.department.name : 'Company-Wide'}
                  </td>
                  <td className="small fw-semibold">{p.policyYear}</td>
                  <td className="text-center small fw-bold text-primary">{p.annualEntitlement} Days</td>
                  <td className="text-center small text-secondary">
                    {p.carryForwardAllowed ? `Up to ${p.maxCarryForwardDays}d` : 'Not Allowed'}
                  </td>
                  <td className="text-center small text-secondary">{p.minAdvanceNoticeDays} Days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
