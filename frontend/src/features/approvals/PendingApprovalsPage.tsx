import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface PendingRequest {
  _id: string;
  requestNumber: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    jobTitle: string;
    department?: { name: string };
  };
  leaveType: {
    _id: string;
    name: string;
    code: string;
    color: string;
    isPaid: boolean;
  };
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  halfDayType?: string;
  workingDays: number;
  reason: string;
  submittedAt: string;
}

export const PendingApprovalsPage: React.FC = () => {
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [comments, setComments] = useState('');

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: pendingList = [], isLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: PendingRequest[] }>('/approvals/pending');
      return res.data.data;
    },
  });

  const decisionMutation = useMutation({
    mutationFn: async ({ id, decisionVal, commentsVal }: { id: string; decisionVal: 'approved' | 'rejected'; commentsVal?: string }) => {
      const res = await api.patch(`/approvals/${id}`, {
        decision: decisionVal,
        comments: commentsVal,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-history'] });
      queryClient.invalidateQueries({ queryKey: ['manager-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      addToast(
        variables.decisionVal === 'approved' ? 'success' : 'info',
        `Leave Request ${variables.decisionVal === 'approved' ? 'Approved' : 'Rejected'}`,
        `The leave request has been marked as ${variables.decisionVal}.`
      );
      setSelectedRequest(null);
      setDecision(null);
      setComments('');
    },
    onError: (err: any) => {
      addToast('danger', 'Approval Action Failed', err.message || 'Error processing approval decision');
    },
  });

  const handleOpenDecision = (req: PendingRequest, d: 'approved' | 'rejected') => {
    setSelectedRequest(req);
    setDecision(d);
    setComments('');
  };

  const handleConfirmDecision = () => {
    if (!selectedRequest || !decision) return;
    decisionMutation.mutate({
      id: selectedRequest._id,
      decisionVal: decision,
      commentsVal: comments,
    });
  };

  if (isLoading) return <LoadingSpinner message="Loading pending approval queue..." />;

  return (
    <div className="container-fluid p-0">
      <div className="mb-4">
        <h4 className="fw-bold text-dark mb-1">Pending Approvals Queue</h4>
        <p className="text-muted small mb-0">Review, approve, or reject leave requests submitted by your team members.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase text-secondary">
              <tr>
                <th>Request #</th>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Requested Dates</th>
                <th>Working Days</th>
                <th>Reason</th>
                <th>Submitted</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted small">
                    <i className="bi bi-check2-circle fs-3 d-block mb-2 text-success" aria-hidden="true" />
                    All caught up! No pending leave requests awaiting approval.
                  </td>
                </tr>
              ) : (
                pendingList.map((r) => (
                  <tr key={r._id}>
                    <td className="fw-semibold text-dark small">{r.requestNumber}</td>
                    <td>
                      <div className="fw-semibold text-dark small">
                        {r.employee?.firstName} {r.employee?.lastName}
                      </div>
                      <div className="text-muted small" style={{ fontSize: '11px' }}>
                        ID: {r.employee?.employeeId} • {r.employee?.jobTitle}
                      </div>
                    </td>
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
                    <td className="small text-muted">{new Date(r.submittedAt).toLocaleDateString()}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-outline-success"
                          onClick={() => handleOpenDecision(r, 'approved')}
                          title="Approve request"
                        >
                          <i className="bi bi-check-lg me-1" aria-hidden="true" />
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => handleOpenDecision(r, 'rejected')}
                          title="Reject request"
                        >
                          <i className="bi bi-x-lg me-1" aria-hidden="true" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Modal */}
      {selectedRequest && decision && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-semibold text-capitalize">
                  {decision === 'approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setSelectedRequest(null);
                    setDecision(null);
                  }}
                  disabled={decisionMutation.isPending}
                />
              </div>
              <div className="modal-body py-3">
                <div className="p-3 bg-light rounded-3 mb-3 small">
                  <div>
                    <span className="fw-semibold">Employee:</span> {selectedRequest.employee?.firstName}{' '}
                    {selectedRequest.employee?.lastName} ({selectedRequest.employee?.employeeId})
                  </div>
                  <div>
                    <span className="fw-semibold">Leave Type:</span> {selectedRequest.leaveType?.name} (
                    {selectedRequest.workingDays} working days)
                  </div>
                  <div>
                    <span className="fw-semibold">Dates:</span>{' '}
                    {new Date(selectedRequest.startDate).toLocaleDateString()} to{' '}
                    {new Date(selectedRequest.endDate).toLocaleDateString()}
                  </div>
                  <div className="mt-1">
                    <span className="fw-semibold">Employee Reason:</span> <em>"{selectedRequest.reason}"</em>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label small fw-semibold text-secondary" htmlFor="approverComments">
                    Approver Comments {decision === 'rejected' && <span className="text-danger">*</span>}
                  </label>
                  <textarea
                    id="approverComments"
                    rows={3}
                    className="form-control"
                    placeholder={
                      decision === 'rejected'
                        ? 'Please state the reason for rejecting this leave request...'
                        : 'Optional comments for the employee...'
                    }
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer border-top-0 pt-0">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setSelectedRequest(null);
                    setDecision(null);
                  }}
                  disabled={decisionMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn btn-${decision === 'approved' ? 'success' : 'danger'}`}
                  onClick={handleConfirmDecision}
                  disabled={
                    decisionMutation.isPending || (decision === 'rejected' && comments.trim().length === 0)
                  }
                >
                  {decisionMutation.isPending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Saving...
                    </>
                  ) : decision === 'approved' ? (
                    'Confirm Approval'
                  ) : (
                    'Confirm Rejection'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
