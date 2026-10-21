import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAuth } from '../auth/AuthContext.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { ConfirmModal } from '../../components/common/ConfirmModal.js';
import { useToast } from '../../context/ToastContext.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface LeaveRequestItem {
  _id: string;
  requestNumber: string;
  employee?: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    email: string;
  };
  leaveType: { name: string; code: string; color: string; isPaid: boolean };
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  halfDayType?: string;
  workingDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  submittedAt: string;
  approverComments?: string;
}

export const MyLeavesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedToCancel, setSelectedToCancel] = useState<LeaveRequestItem | null>(null);

  // Admin Override Modal State
  const [overrideItem, setOverrideItem] = useState<LeaveRequestItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<'approved' | 'rejected' | 'cancelled' | 'pending'>('approved');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ['my-leaves', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'all' ? '/leaves' : `/leaves?status=${statusFilter}`;
      const res = await api.get<{ success: boolean; data: LeaveRequestItem[] }>(url);
      return res.data.data;
    },
  });

  // Employee/Admin cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/leaves/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['my-balances'] });
      queryClient.invalidateQueries({ queryKey: ['employee-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      addToast('success', 'Leave Cancelled', 'The leave request has been cancelled and balances restored.');
      setSelectedToCancel(null);
    },
    onError: (err: any) => {
      addToast('danger', 'Cancellation Failed', err.response?.data?.message || err.message || 'Could not cancel request');
    },
  });

  // Admin status override / revocation mutation
  const overrideMutation = useMutation({
    mutationFn: async () => {
      if (!overrideItem) return;
      const res = await api.patch(`/leaves/${overrideItem._id}/override`, {
        targetStatus,
        reason: overrideReason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['my-balances'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['manager-dashboard'] });
      addToast(
        'success',
        'Status Overridden',
        `Request ${overrideItem?.requestNumber} successfully transitioned to '${targetStatus}'. Balances and audit trail updated.`
      );
      setOverrideItem(null);
      setOverrideReason('');
      setOverrideError(null);
    },
    onError: (err: any) => {
      setOverrideError(err.response?.data?.message || err.message || 'Failed to override status');
    },
  });

  const handleOpenOverride = (item: LeaveRequestItem) => {
    setOverrideItem(item);
    // Suggest a smart opposite default
    if (item.status === 'cancelled' || item.status === 'rejected') {
      setTargetStatus('approved');
    } else if (item.status === 'approved') {
      setTargetStatus('cancelled');
    } else {
      setTargetStatus('approved');
    }
    setOverrideReason('');
    setOverrideError(null);
  };

  if (isLoading) return <LoadingSpinner message="Loading leave applications..." />;

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold text-dark mb-0">My Leave Requests</h4>
            {isAdmin && (
              <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                Super Admin Mode
              </span>
            )}
          </div>
          <p className="text-muted small mb-0">Track all your submitted leave applications, approvals, and decisions.</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/holidays" className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 shadow-sm">
            <i className="bi bi-calendar-event" aria-hidden="true" />
            <span>Holiday Calendar</span>
          </Link>
          <Link to="/leaves/apply" className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2 shadow-sm">
            <i className="bi bi-plus-lg" aria-hidden="true" />
            <span>Apply for Leave</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="d-flex flex-wrap gap-2">
            {['all', 'pending', 'approved', 'rejected', 'cancelled'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`btn btn-sm text-capitalize ${
                  statusFilter === tab ? 'btn-primary' : 'btn-light border'
                }`}
                onClick={() => setStatusFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase text-secondary">
              <tr>
                <th>Request ID</th>
                {isAdmin && <th>Employee</th>}
                <th>Type</th>
                <th>Dates</th>
                <th>Duration</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Submitted</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="text-center py-5 text-muted small">
                    <i className="bi bi-calendar-x fs-3 d-block mb-2 text-secondary" aria-hidden="true" />
                    No leave requests found for this filter.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r._id}>
                    <td className="fw-semibold text-dark small">{r.requestNumber}</td>
                    {isAdmin && (
                      <td className="small">
                        <span className="fw-semibold text-dark d-block">
                          {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : 'You'}
                        </span>
                        {r.employee?.employeeId && (
                          <span className="text-muted" style={{ fontSize: '11px' }}>
                            {r.employee.employeeId}
                          </span>
                        )}
                      </td>
                    )}
                    <td>
                      <span className="badge bg-light text-dark border">{r.leaveType?.name}</span>
                    </td>
                    <td className="small text-secondary">
                      {new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()}
                      {r.isHalfDay && (
                        <span className="badge bg-info-subtle text-info ms-2 small">
                          Half Day ({r.halfDayType === 'first-half' ? 'Morning' : 'Afternoon'})
                        </span>
                      )}
                    </td>
                    <td className="small fw-semibold">{r.workingDays}d</td>
                    <td className="small text-muted text-truncate" style={{ maxWidth: '200px' }} title={r.reason}>
                      {r.reason}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="small text-muted">{new Date(r.submittedAt).toLocaleDateString()}</td>
                    <td className="text-end">
                      <div className="d-inline-flex align-items-center gap-1">
                        {/* Employee regular cancel for pending */}
                        {r.status === 'pending' && !isAdmin && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-1 px-2"
                            onClick={() => setSelectedToCancel(r)}
                          >
                            <i className="bi bi-x-circle me-1" aria-hidden="true" />
                            Cancel
                          </button>
                        )}

                        {/* Super Admin Override / Revoke Button */}
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary py-1 px-2 d-inline-flex align-items-center gap-1 shadow-sm"
                            title="Super Admin Status Override / Revocation"
                            onClick={() => handleOpenOverride(r)}
                          >
                            <i className="bi bi-arrow-repeat" aria-hidden="true" />
                            <span>Override / Revoke</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Employee Cancellation */}
      <ConfirmModal
        isOpen={Boolean(selectedToCancel)}
        title="Cancel Leave Request"
        message={`Are you sure you want to cancel request ${selectedToCancel?.requestNumber}? Reserved days will be refunded to your balance.`}
        confirmText="Confirm Cancellation"
        variant="danger"
        isLoading={cancelMutation.isPending}
        onConfirm={() => selectedToCancel && cancelMutation.mutate(selectedToCancel._id)}
        onCancel={() => setSelectedToCancel(null)}
      />

      {/* Super Admin Status Override Modal */}
      {overrideItem && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="bi bi-shield-lock-fill text-primary me-2" aria-hidden="true" />
                  Admin Leave Status Override
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setOverrideItem(null)}
                />
              </div>

              <div className="modal-body p-4">
                {overrideError && (
                  <div className="alert alert-danger py-2 small" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
                    {overrideError}
                  </div>
                )}

                <div className="card bg-light border-0 p-3 mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-muted">Request Number:</span>
                    <span className="fw-bold text-dark">{overrideItem.requestNumber}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-muted">Current Status:</span>
                    <StatusBadge status={overrideItem.status} />
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-muted">Leave Type:</span>
                    <span className="badge bg-light text-dark border">{overrideItem.leaveType?.name}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="small text-muted">Duration:</span>
                    <span className="fw-semibold text-dark">{overrideItem.workingDays} working days</span>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-dark">
                    Target Decision / Overridden Status <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as any)}
                  >
                    <option value="approved">Approved (Change mind to approve / grant leave)</option>
                    <option value="cancelled">Cancelled (Revoke leave & refund employee balance)</option>
                    <option value="rejected">Rejected (Deny leave request)</option>
                    <option value="pending">Pending (Reset to pending approval queue)</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-dark">
                    Reason / Justification for Override <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Provide mandatory administrative rationale (e.g., 'Employee reconsidered cancellation request; project deadlines rescheduled; approving leave.')"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    required
                  />
                </div>

                <div className="alert alert-info py-2 small mb-0" role="alert">
                  <i className="bi bi-info-circle-fill me-1" aria-hidden="true" />
                  <strong>Automated Balance Synchronization:</strong> Transitioning this status will atomically adjust the employee's used and pending leave quotas, log an immutable audit record, and notify the employee.
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setOverrideItem(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1"
                  disabled={overrideMutation.isPending || !overrideReason.trim()}
                  onClick={() => overrideMutation.mutate()}
                >
                  <i className="bi bi-check2-circle" aria-hidden="true" />
                  <span>{overrideMutation.isPending ? 'Processing Override...' : 'Confirm Status Override'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
