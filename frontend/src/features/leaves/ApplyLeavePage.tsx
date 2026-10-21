import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import { LeaveType } from '../../types/index.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

const applyLeaveSchema = z
  .object({
    leaveTypeId: z.string().min(1, 'Please select a leave type'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    isHalfDay: z.boolean().default(false),
    halfDayType: z.enum(['first-half', 'second-half']).optional(),
    reason: z.string().min(5, 'Please provide a reason with at least 5 characters').max(500),
  })
  .refine(
    (data) => {
      if (data.isHalfDay && data.startDate !== data.endDate) {
        return false;
      }
      return true;
    },
    {
      message: 'Half-day leave must have the same start and end date',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end >= start;
    },
    {
      message: 'End date cannot be earlier than start date',
      path: ['endDate'],
    }
  );

type ApplyLeaveFormValues = z.infer<typeof applyLeaveSchema>;

export const ApplyLeavePage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Fetch active leave types
  const { data: leaveTypes = [], isLoading: isLoadingTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: LeaveType[] }>('/leave-types');
      return res.data.data;
    },
  });

  // Fetch user's current balances
  const { data: balances = [] } = useQuery({
    queryKey: ['my-balances'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>('/leave-balances/me');
      return res.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ApplyLeaveFormValues>({
    resolver: zodResolver(applyLeaveSchema),
    defaultValues: {
      isHalfDay: false,
      reason: '',
    },
  });

  const selectedLeaveTypeId = watch('leaveTypeId');
  const isHalfDay = watch('isHalfDay');
  const selectedType = leaveTypes.find((lt) => lt._id === selectedLeaveTypeId);
  const selectedBalance = balances.find((b) => b.leaveType?._id === selectedLeaveTypeId);

  const applyMutation = useMutation({
    mutationFn: async (values: ApplyLeaveFormValues) => {
      const payload = {
        leaveTypeId: values.leaveTypeId,
        startDate: values.startDate,
        endDate: values.isHalfDay ? values.startDate : values.endDate,
        isHalfDay: values.isHalfDay,
        halfDayType: values.isHalfDay ? values.halfDayType : undefined,
        reason: values.reason,
      };
      const res = await api.post('/leaves', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['my-balances'] });
      queryClient.invalidateQueries({ queryKey: ['employee-dashboard'] });
      addToast('success', 'Leave Submitted', 'Your leave request has been submitted for approval.');
      navigate('/leaves/my-requests');
    },
    onError: (err: any) => {
      setSubmissionError(err.message || 'Failed to submit leave request');
    },
  });

  const onSubmit = (values: ApplyLeaveFormValues) => {
    setSubmissionError(null);
    applyMutation.mutate(values);
  };

  if (isLoadingTypes) return <LoadingSpinner message="Loading leave application form..." />;

  return (
    <div className="container-fluid p-0" style={{ maxWidth: '800px' }}>
      <div className="mb-4">
        <h4 className="fw-bold text-dark mb-1">Apply for Leave</h4>
        <p className="text-muted small mb-0">Submit a new leave request. Working days and balances will be validated automatically.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          {submissionError && (
            <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-4" role="alert">
              <i className="bi bi-exclamation-octagon-fill flex-shrink-0" aria-hidden="true" />
              <div>{submissionError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Leave Type Selector */}
            <div className="mb-4">
              <label className="form-label small fw-semibold text-secondary" htmlFor="leaveTypeIdSelect">
                Leave Type <span className="text-danger">*</span>
              </label>
              <select
                id="leaveTypeIdSelect"
                className={`form-select ${errors.leaveTypeId ? 'is-invalid' : ''}`}
                {...register('leaveTypeId')}
              >
                <option value="">-- Select Leave Category --</option>
                {leaveTypes.map((lt) => (
                  <option key={lt._id} value={lt._id}>
                    {lt.name} ({lt.code}) — {lt.isPaid ? 'Paid Leave' : 'Unpaid Leave'}
                  </option>
                ))}
              </select>
              {errors.leaveTypeId && <div className="invalid-feedback">{errors.leaveTypeId.message}</div>}

              {selectedBalance && (
                <div className="mt-2 p-2 bg-light rounded-2 border d-flex justify-content-between align-items-center small">
                  <span className="text-muted">Available Balance:</span>
                  <span className="fw-bold text-primary">{selectedBalance.available} Days</span>
                </div>
              )}
            </div>

            {/* Date Range Inputs */}
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold text-secondary" htmlFor="startDateInput">
                  Start Date <span className="text-danger">*</span>
                </label>
                <input
                  id="startDateInput"
                  type="date"
                  className={`form-control ${errors.startDate ? 'is-invalid' : ''}`}
                  {...register('startDate')}
                />
                {errors.startDate && <div className="invalid-feedback">{errors.startDate.message}</div>}
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold text-secondary" htmlFor="endDateInput">
                  End Date <span className="text-danger">*</span>
                </label>
                <input
                  id="endDateInput"
                  type="date"
                  className={`form-control ${errors.endDate ? 'is-invalid' : ''}`}
                  disabled={isHalfDay}
                  {...register('endDate')}
                />
                {errors.endDate && <div className="invalid-feedback">{errors.endDate.message}</div>}
              </div>
            </div>

            {/* Half Day Checkbox */}
            {selectedType?.allowHalfDay && (
              <div className="mb-3 p-3 bg-light rounded-3 border">
                <div className="form-check form-switch mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="isHalfDaySwitch"
                    {...register('isHalfDay')}
                  />
                  <label className="form-check-label fw-semibold small text-dark" htmlFor="isHalfDaySwitch">
                    Half-Day Leave
                  </label>
                </div>

                {isHalfDay && (
                  <div className="mt-2">
                    <label className="form-label small fw-semibold text-secondary">Select Session</label>
                    <div className="d-flex gap-4">
                      <div className="form-check">
                        <input
                          type="radio"
                          className="form-check-input"
                          id="firstHalfRadio"
                          value="first-half"
                          defaultChecked
                          {...register('halfDayType')}
                        />
                        <label className="form-check-label small" htmlFor="firstHalfRadio">
                          First Half (Morning)
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          type="radio"
                          className="form-check-input"
                          id="secondHalfRadio"
                          value="second-half"
                          {...register('halfDayType')}
                        />
                        <label className="form-check-label small" htmlFor="secondHalfRadio">
                          Second Half (Afternoon)
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reason Textarea */}
            <div className="mb-4">
              <label className="form-label small fw-semibold text-secondary" htmlFor="reasonInput">
                Reason for Leave <span className="text-danger">*</span>
              </label>
              <textarea
                id="reasonInput"
                rows={4}
                className={`form-control ${errors.reason ? 'is-invalid' : ''}`}
                placeholder="Explain the reason for taking leave (e.g., medical appointment, personal commitment)..."
                {...register('reason')}
              />
              {errors.reason && <div className="invalid-feedback">{errors.reason.message}</div>}
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-end gap-2 pt-2 border-top">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate('/leaves/my-requests')}
                disabled={applyMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary d-inline-flex align-items-center gap-2"
                disabled={applyMutation.isPending}
              >
                {applyMutation.isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill" aria-hidden="true" />
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
