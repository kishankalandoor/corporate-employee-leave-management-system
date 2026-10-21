import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export const DepartmentsPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Department[] }>('/departments');
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof deptForm) => {
      const res = await api.post('/departments', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments-list'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      addToast('success', 'Department Created', 'The department was added successfully.');
      setShowModal(false);
      setDeptForm({ name: '', code: '', description: '' });
    },
    onError: (err: any) => {
      addToast('danger', 'Error', err.message || 'Failed to create department');
    },
  });

  if (isLoading) return <LoadingSpinner message="Loading departments..." />;

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">Departments</h4>
          <p className="text-muted small mb-0">Organize organizational units, cost centers, and departmental hierarchy.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm"
          onClick={() => setShowModal(true)}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" />
          <span>New Department</span>
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase text-secondary">
              <tr>
                <th>Department Name</th>
                <th>Code</th>
                <th>Description</th>
                <th>Status</th>
                <th>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted small">
                    No departments found.
                  </td>
                </tr>
              ) : (
                departments.map((d) => (
                  <tr key={d._id}>
                    <td className="fw-semibold text-dark small">{d.name}</td>
                    <td>
                      <span className="badge bg-secondary-subtle text-secondary fw-bold">{d.code}</span>
                    </td>
                    <td className="small text-muted">{d.description || '-'}</td>
                    <td>
                      <span className={`badge ${d.isActive ? 'bg-success-subtle text-success' : 'bg-secondary'}`}>
                        {d.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="small text-muted">{new Date(d.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Dept Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-semibold">Create New Department</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate(deptForm);
                }}
              >
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Department Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. Quality Assurance"
                      value={deptForm.name}
                      onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Department Code *</label>
                    <input
                      type="text"
                      className="form-control text-uppercase"
                      required
                      placeholder="e.g. QA"
                      value={deptForm.code}
                      onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Description</label>
                    <textarea
                      rows={3}
                      className="form-control"
                      placeholder="Optional details..."
                      value={deptForm.description}
                      onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowModal(false)}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Saving...' : 'Create Department'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
