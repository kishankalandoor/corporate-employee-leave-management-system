import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { useToast } from '../../context/ToastContext.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
  department?: { _id: string; name: string };
  manager?: { _id: string; firstName: string; lastName: string };
  jobTitle: string;
  status: 'active' | 'inactive';
  employmentStatus: string;
  joiningDate: string;
}

export const EmployeeDirectoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states for creating employee
  const [newEmp, setNewEmp] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'employee' as 'employee' | 'manager' | 'admin',
    department: '',
    manager: '',
    jobTitle: '',
    joiningDate: new Date().toISOString().split('T')[0],
  });

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Employee[] }>('/employees');
      return res.data.data;
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>('/departments');
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof newEmp) => {
      const res = await api.post('/employees', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      addToast('success', 'Employee Created', 'New employee profile and credentials have been created.');
      setShowCreateModal(false);
      setNewEmp({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'employee',
        department: '',
        manager: '',
        jobTitle: '',
        joiningDate: new Date().toISOString().split('T')[0],
      });
    },
    onError: (err: any) => {
      addToast('danger', 'Creation Failed', err.message || 'Could not create employee profile');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: 'active' | 'inactive' }) => {
      const res = await api.patch(`/employees/${id}/status`, { status: newStatus });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      addToast('success', 'Status Updated', 'Employee status has been updated.');
    },
    onError: (err: any) => {
      addToast('danger', 'Update Failed', err.message || 'Could not update employee status');
    },
  });

  const filtered = employees.filter((e) => {
    const matchesSearch =
      e.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'all' || e.department?._id === selectedDept;
    return matchesSearch && matchesDept;
  });

  if (isLoading) return <LoadingSpinner message="Loading employee directory..." />;

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">Employee Directory</h4>
          <p className="text-muted small mb-0">Manage personnel, role assignments, department allocation, and account statuses.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm"
          onClick={() => setShowCreateModal(true)}
        >
          <i className="bi bi-person-plus-fill" aria-hidden="true" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-secondary">
                  <i className="bi bi-search" aria-hidden="true" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search by name, ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-6">
              <select
                className="form-select"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map((d: any) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase text-secondary">
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Role</th>
                <th>Reporting Manager</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted small">
                    No employees matching the criteria found.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e._id}>
                    <td>
                      <div className="fw-semibold text-dark small">{e.fullName}</div>
                      <div className="text-muted small" style={{ fontSize: '11px' }}>
                        {e.email}
                      </div>
                    </td>
                    <td className="small fw-semibold">{e.employeeId}</td>
                    <td className="small text-secondary">{e.department?.name || 'Unassigned'}</td>
                    <td>
                      <span
                        className={`badge ${
                          e.role === 'admin'
                            ? 'bg-danger-subtle text-danger'
                            : e.role === 'manager'
                            ? 'bg-info-subtle text-info'
                            : 'bg-primary-subtle text-primary'
                        } text-capitalize`}
                      >
                        {e.role}
                      </span>
                    </td>
                    <td className="small text-secondary">
                      {e.manager ? `${e.manager.firstName} ${e.manager.lastName}` : 'None'}
                    </td>
                    <td>
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          e.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success'
                        } py-1 px-2`}
                        onClick={() =>
                          toggleStatusMutation.mutate({
                            id: e._id,
                            newStatus: e.status === 'active' ? 'inactive' : 'active',
                          })
                        }
                      >
                        {e.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Employee Modal */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-semibold">Add New Employee</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createMutation.isPending}
                />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate(newEmp);
                }}
              >
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">First Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={newEmp.firstName}
                        onChange={(e) => setNewEmp({ ...newEmp, firstName: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Last Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={newEmp.lastName}
                        onChange={(e) => setNewEmp({ ...newEmp, lastName: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Work Email *</label>
                      <input
                        type="email"
                        className="form-control"
                        required
                        value={newEmp.email}
                        onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Initial Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        required
                        minLength={8}
                        value={newEmp.password}
                        onChange={(e) => setNewEmp({ ...newEmp, password: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Role *</label>
                      <select
                        className="form-select"
                        value={newEmp.role}
                        onChange={(e) =>
                          setNewEmp({ ...newEmp, role: e.target.value as 'employee' | 'manager' | 'admin' })
                        }
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Department *</label>
                      <select
                        className="form-select"
                        required
                        value={newEmp.department}
                        onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                      >
                        <option value="">-- Select Department --</option>
                        {departments.map((d: any) => (
                          <option key={d._id} value={d._id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Reporting Manager</label>
                      <select
                        className="form-select"
                        value={newEmp.manager}
                        onChange={(e) => setNewEmp({ ...newEmp, manager: e.target.value })}
                      >
                        <option value="">-- No Manager (Top Level) --</option>
                        {employees
                          .filter((emp) => emp.role === 'manager' || emp.role === 'admin')
                          .map((m) => (
                            <option key={m._id} value={m._id}>
                              {m.fullName} ({m.role})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Job Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g. Senior Software Engineer"
                        value={newEmp.jobTitle}
                        onChange={(e) => setNewEmp({ ...newEmp, jobTitle: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowCreateModal(false)}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Employee Profile'}
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
