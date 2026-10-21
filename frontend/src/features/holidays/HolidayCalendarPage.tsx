import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useAuth } from '../auth/AuthContext.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export interface HolidayItem {
  _id: string;
  name: string;
  date: string;
  day?: string;
  holidayType: 'FULL_DAY' | 'HALF_DAY_AFTERNOON' | 'HALF_DAY_MORNING' | 'OPTIONAL' | 'SPECIAL_WORKING_DAY';
  scope: 'COMPANY_WIDE' | 'DEPARTMENT';
  department?: { _id: string; name: string; code: string } | null;
  year: number;
  description?: string;
  isOptional: boolean;
  published: boolean;
}

interface HolidayApiResponse {
  success: boolean;
  data: HolidayItem[];
  stats: {
    total: number;
    fullDay: number;
    halfDay: number;
    optional: number;
    specialWorkingDay: number;
  };
}

export const HolidayCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = Jan
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal State
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('2026-01-15');
  const [formType, setFormType] = useState<HolidayItem['holidayType']>('FULL_DAY');
  const [formScope, setFormScope] = useState<'COMPANY_WIDE' | 'DEPARTMENT'>('COMPANY_WIDE');
  const [formDepartment, setFormDepartment] = useState<string>('');
  const [formDescription, setFormDescription] = useState('');
  const [formPublished, setFormPublished] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  // Fetch departments for manager/admin dropdown
  const { data: departmentsData } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Array<{ _id: string; name: string; code: string }> }>('/departments');
      return res.data.data;
    },
    enabled: canManage,
  });

  // Fetch holidays
  const { data, isLoading, error } = useQuery({
    queryKey: ['holidays', selectedYear],
    queryFn: async () => {
      const res = await api.get<HolidayApiResponse>(`/holidays?year=${selectedYear}`);
      return res.data;
    },
  });

  // Create/Update Mutation
  const saveHolidayMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: formName,
        date: formDate,
        holidayType: formType,
        scope: user?.role === 'manager' ? 'DEPARTMENT' : formScope,
        department: formScope === 'DEPARTMENT' || user?.role === 'manager' ? formDepartment : null,
        description: formDescription,
        published: formPublished,
      };

      if (modalMode === 'edit' && editingId) {
        return api.patch(`/holidays/${editingId}`, payload);
      }
      return api.post('/holidays', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setShowDeclareModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to save holiday');
    },
  });

  // Delete Mutation
  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/holidays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });

  // Seed 2026 Mutation
  const seed2026Mutation = useMutation({
    mutationFn: async () => {
      return api.post('/holidays/seed-2026');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormDate(`${selectedYear}-01-15`);
    setFormType('FULL_DAY');
    setFormScope(user?.role === 'manager' ? 'DEPARTMENT' : 'COMPANY_WIDE');
    setFormDepartment(user?.department?.toString() || '');
    setFormDescription('');
    setFormPublished(true);
    setFormError(null);
    setEditingId(null);
    setModalMode('create');
  };

  const handleEditClick = (h: HolidayItem) => {
    setEditingId(h._id);
    setModalMode('edit');
    setFormName(h.name);
    setFormDate(new Date(h.date).toISOString().split('T')[0]);
    setFormType(h.holidayType);
    setFormScope(h.scope);
    setFormDepartment(h.department?._id || '');
    setFormDescription(h.description || '');
    setFormPublished(h.published);
    setFormError(null);
    setShowDeclareModal(true);
  };

  const holidays = data?.data || [];
  const stats = data?.stats || { total: 0, fullDay: 0, halfDay: 0, optional: 0, specialWorkingDay: 0 };

  // Filtered list
  const filteredHolidays = holidays.filter((h) => {
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.description && h.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || h.holidayType === typeFilter;
    return matchesSearch && matchesType;
  });

  const getBadgeClass = (type: HolidayItem['holidayType']) => {
    switch (type) {
      case 'FULL_DAY':
        return 'bg-primary text-white';
      case 'HALF_DAY_AFTERNOON':
      case 'HALF_DAY_MORNING':
        return 'bg-warning text-dark';
      case 'SPECIAL_WORKING_DAY':
        return 'bg-info text-dark';
      case 'OPTIONAL':
        return 'bg-secondary text-white';
      default:
        return 'bg-primary text-white';
    }
  };

  const formatHolidayType = (type: HolidayItem['holidayType']) => {
    switch (type) {
      case 'FULL_DAY':
        return 'Full Day Holiday';
      case 'HALF_DAY_AFTERNOON':
        return 'Afternoon Off (Half Day)';
      case 'HALF_DAY_MORNING':
        return 'Morning Off (Half Day)';
      case 'SPECIAL_WORKING_DAY':
        return 'Special Working Day';
      case 'OPTIONAL':
        return 'Optional / Restricted';
      default:
        return type;
    }
  };

  // Month-by-month helper
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 = Sun
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) return <LoadingSpinner message="Loading holiday calendar & schedules..." />;
  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
        Failed to load company holiday calendar.
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold text-dark mb-0">Company Holiday & Working Day Calendar</h4>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
              Year {selectedYear}
            </span>
          </div>
          <p className="text-muted small mb-0">
            Single source of truth for official holidays, working-day deductions, and attendance tracking.
          </p>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Year selector */}
          <select
            className="form-select form-select-sm shadow-sm"
            style={{ width: '110px' }}
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>

          {/* Print button */}
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 shadow-sm"
            onClick={handlePrint}
          >
            <i className="bi bi-printer" aria-hidden="true" />
            <span>Print</span>
          </button>

          {/* Seed 2026 Official List (Admin only) */}
          {isAdmin && selectedYear === 2026 && (
            <button
              type="button"
              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 shadow-sm"
              disabled={seed2026Mutation.isPending}
              onClick={() => seed2026Mutation.mutate()}
              title="Ensure all 10 official 2026 holidays are configured"
            >
              <i className="bi bi-arrow-clockwise" aria-hidden="true" />
              <span>{seed2026Mutation.isPending ? 'Seeding...' : 'Seed 2026 Holidays'}</span>
            </button>
          )}

          {/* Declare Holiday Button (Admin / Manager) */}
          {canManage && (
            <button
              type="button"
              className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1 shadow-sm"
              onClick={() => {
                resetForm();
                setShowDeclareModal(true);
              }}
            >
              <i className="bi bi-plus-circle" aria-hidden="true" />
              <span>Declare Holiday</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm p-3 h-100 bg-white">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase">Official Holidays</span>
                <h3 className="fw-bold text-primary mb-0">{stats.fullDay}</h3>
                <span className="text-secondary small" style={{ fontSize: '12px' }}>Full-day scheduled off</span>
              </div>
              <div className="p-3 bg-primary-subtle text-primary rounded-3">
                <i className="bi bi-calendar-check fs-4" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm p-3 h-100 bg-white">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase">Half-Day Holidays</span>
                <h3 className="fw-bold text-warning mb-0">{stats.halfDay}</h3>
                <span className="text-secondary small" style={{ fontSize: '12px' }}>Afternoon/Morning off</span>
              </div>
              <div className="p-3 bg-warning-subtle text-warning rounded-3">
                <i className="bi bi-clock-history fs-4" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm p-3 h-100 bg-white">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase">Special Working Days</span>
                <h3 className="fw-bold text-info mb-0">{stats.specialWorkingDay}</h3>
                <span className="text-secondary small" style={{ fontSize: '12px' }}>Weekend overrides</span>
              </div>
              <div className="p-3 bg-info-subtle text-info rounded-3">
                <i className="bi bi-briefcase fs-4" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm p-3 h-100 bg-white">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase">Optional / Restricted</span>
                <h3 className="fw-bold text-secondary mb-0">{stats.optional}</h3>
                <span className="text-secondary small" style={{ fontSize: '12px' }}>Employee choice entitlement</span>
              </div>
              <div className="p-3 bg-secondary-subtle text-secondary rounded-3">
                <i className="bi bi-calendar-range fs-4" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card with Dual Views */}
      <div className="card border-0 shadow-sm mb-4">
        {/* Card Header & Controls */}
        <div className="card-header bg-white border-bottom py-3">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            {/* View Mode Tabs */}
            <div className="btn-group btn-group-sm" role="group">
              <button
                type="button"
                className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('table')}
              >
                <i className="bi bi-table me-1" aria-hidden="true" />
                Annual Schedule List
              </button>
              <button
                type="button"
                className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('calendar')}
              >
                <i className="bi bi-calendar3 me-1" aria-hidden="true" />
                Month View
              </button>
            </div>

            {/* Filters */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="input-group input-group-sm" style={{ width: '220px' }}>
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted" aria-hidden="true" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search occasion..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="form-select form-select-sm"
                style={{ width: '180px' }}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="ALL">All Day Types</option>
                <option value="FULL_DAY">Full Day Holiday</option>
                <option value="HALF_DAY_AFTERNOON">Afternoon Off (Half Day)</option>
                <option value="HALF_DAY_MORNING">Morning Off (Half Day)</option>
                <option value="SPECIAL_WORKING_DAY">Special Working Day</option>
                <option value="OPTIONAL">Optional / Restricted</option>
              </select>
            </div>
          </div>
        </div>

        {/* View Mode 1: Annual Table View */}
        {viewMode === 'table' && (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-uppercase text-secondary">
                <tr>
                  <th style={{ width: '70px' }}>Sl No.</th>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Occasion</th>
                  <th>Holiday Type</th>
                  <th>Scope</th>
                  <th>Notes / Description</th>
                  {canManage && <th style={{ width: '110px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredHolidays.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 8 : 7} className="text-center py-5 text-muted">
                      <i className="bi bi-calendar-x fs-2 d-block mb-2 text-secondary" aria-hidden="true" />
                      <span>No holidays found matching your criteria.</span>
                    </td>
                  </tr>
                ) : (
                  filteredHolidays.map((h, idx) => {
                    const formattedDate = new Date(h.date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    });
                    return (
                      <tr key={h._id}>
                        <td className="fw-semibold text-secondary small">{idx + 1}</td>
                        <td className="fw-bold text-dark small">{formattedDate}</td>
                        <td className="small text-muted">{h.day || '—'}</td>
                        <td>
                          <span className="fw-bold text-dark d-block">{h.name}</span>
                          {!h.published && (
                            <span className="badge bg-secondary-subtle text-secondary small" style={{ fontSize: '10px' }}>
                              Draft (Unpublished)
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${getBadgeClass(h.holidayType)} small px-2 py-1`}>
                            {formatHolidayType(h.holidayType)}
                          </span>
                        </td>
                        <td>
                          {h.scope === 'COMPANY_WIDE' ? (
                            <span className="badge bg-success-subtle text-success small">Company Wide</span>
                          ) : (
                            <span className="badge bg-info-subtle text-info small">
                              {h.department?.name || 'Department'}
                            </span>
                          )}
                        </td>
                        <td className="small text-muted" style={{ maxWidth: '280px' }}>
                          {h.description || '—'}
                        </td>
                        {canManage && (
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary py-0 px-2"
                                title="Edit Holiday"
                                onClick={() => handleEditClick(h)}
                              >
                                <i className="bi bi-pencil" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger py-0 px-2"
                                title="Delete Holiday"
                                onClick={() => {
                                  if (window.confirm(`Delete holiday "${h.name}"?`)) {
                                    deleteHolidayMutation.mutate(h._id);
                                  }
                                }}
                              >
                                <i className="bi bi-trash" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* View Mode 2: Month-by-Month Calendar Grid */}
        {viewMode === 'calendar' && (
          <div className="p-4">
            {/* Month Navigator */}
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h5 className="fw-bold mb-0 text-dark">
                {months[selectedMonth]} {selectedYear}
              </h5>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={selectedMonth === 0}
                  onClick={() => setSelectedMonth((m) => Math.max(0, m - 1))}
                >
                  <i className="bi bi-chevron-left me-1" aria-hidden="true" />
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={selectedMonth === 11}
                  onClick={() => setSelectedMonth((m) => Math.min(11, m + 1))}
                >
                  Next
                  <i className="bi bi-chevron-right ms-1" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Calendar Days Table */}
            <div className="table-responsive">
              <table className="table table-bordered text-center align-middle mb-0" style={{ tableLayout: 'fixed' }}>
                <thead className="table-light">
                  <tr className="small text-uppercase">
                    <th className="text-danger" style={{ width: '14.28%' }}>Sun</th>
                    <th style={{ width: '14.28%' }}>Mon</th>
                    <th style={{ width: '14.28%' }}>Tue</th>
                    <th style={{ width: '14.28%' }}>Wed</th>
                    <th style={{ width: '14.28%' }}>Thu</th>
                    <th style={{ width: '14.28%' }}>Fri</th>
                    <th className="text-danger" style={{ width: '14.28%' }}>Sat</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
                    const firstDay = getFirstDayOfWeek(selectedYear, selectedMonth);
                    const rows: React.ReactNode[] = [];
                    let cells: React.ReactNode[] = [];

                    // Leading empty cells
                    for (let i = 0; i < firstDay; i++) {
                      cells.push(
                        <td key={`empty-${i}`} className="bg-light bg-opacity-50 text-muted p-3"></td>
                      );
                    }

                    for (let day = 1; day <= daysInMonth; day++) {
                      const dayOfWeek = (firstDay + day - 1) % 7;
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                      // Check if holiday falls on this date
                      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayHolidays = holidays.filter((h) => {
                        const hDate = new Date(h.date).toISOString().split('T')[0];
                        return hDate === dateStr;
                      });

                      const hasHoliday = dayHolidays.length > 0;
                      const primaryHoliday = dayHolidays[0];

                      cells.push(
                        <td
                          key={`day-${day}`}
                          className={`p-2 position-relative align-top ${
                            isWeekend ? 'bg-light' : 'bg-white'
                          } ${hasHoliday ? 'border-primary' : ''}`}
                          style={{ height: '95px' }}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span
                              className={`fw-bold small ${
                                hasHoliday
                                  ? 'badge bg-primary text-white rounded-circle p-1'
                                  : isWeekend
                                  ? 'text-danger'
                                  : 'text-dark'
                              }`}
                              style={{ width: '24px', height: '24px', lineHeight: '18px' }}
                            >
                              {day}
                            </span>
                            {isWeekend && !hasHoliday && (
                              <span className="small text-muted" style={{ fontSize: '10px' }}>
                                Weekend Off
                              </span>
                            )}
                          </div>

                          {/* Holiday info pill */}
                          {hasHoliday && (
                            <div className="d-flex flex-column gap-1">
                              {dayHolidays.map((dh) => (
                                <div
                                  key={dh._id}
                                  className={`small text-truncate rounded px-1 py-0 fw-semibold text-start ${getBadgeClass(
                                    dh.holidayType
                                  )}`}
                                  style={{ fontSize: '11px', lineHeight: '1.4' }}
                                  title={`${dh.name} - ${formatHolidayType(dh.holidayType)}`}
                                >
                                  {dh.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );

                      if (cells.length === 7) {
                        rows.push(<tr key={`row-${rows.length}`}>{cells}</tr>);
                        cells = [];
                      }
                    }

                    // Trailing empty cells
                    if (cells.length > 0) {
                      while (cells.length < 7) {
                        cells.push(
                          <td key={`empty-end-${cells.length}`} className="bg-light bg-opacity-50 text-muted p-3"></td>
                        );
                      }
                      rows.push(<tr key={`row-${rows.length}`}>{cells}</tr>);
                    }

                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Declare / Edit Holiday Modal */}
      {showDeclareModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="bi bi-calendar-plus me-2 text-primary" aria-hidden="true" />
                  {modalMode === 'create' ? 'Declare Company Holiday / Working Day' : 'Edit Calendar Holiday'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowDeclareModal(false)}
                />
              </div>

              <div className="modal-body p-4">
                {formError && (
                  <div className="alert alert-danger py-2 small" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
                    {formError}
                  </div>
                )}

                <div className="row g-3">
                  {/* Occasion Name */}
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      Occasion / Festival Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Makara Sankranti, Ugadi, Ayudha Pooja"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Date */}
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      Holiday Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                    />
                  </div>

                  {/* Holiday Type */}
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold text-dark">
                      Holiday / Day Type <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as any)}
                    >
                      <option value="FULL_DAY">Full-day holiday (Entire workday off)</option>
                      <option value="HALF_DAY_AFTERNOON">Afternoon onwards — half-day holiday (Morning worked)</option>
                      <option value="HALF_DAY_MORNING">Morning onwards — half-day holiday (Afternoon worked)</option>
                      <option value="SPECIAL_WORKING_DAY">Special working day (Override normally off day)</option>
                      <option value="OPTIONAL">Restricted / optional holiday</option>
                    </select>
                  </div>

                  {/* Scope */}
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold text-dark">Applicable Scope</label>
                    <select
                      className="form-select"
                      value={formScope}
                      disabled={user?.role === 'manager'}
                      onChange={(e) => setFormScope(e.target.value as any)}
                    >
                      <option value="COMPANY_WIDE">Company-wide (All Employees)</option>
                      <option value="DEPARTMENT">Department Specific</option>
                    </select>
                    {user?.role === 'manager' && (
                      <span className="text-muted small" style={{ fontSize: '11px' }}>
                        Managers can declare holidays within their assigned department.
                      </span>
                    )}
                  </div>

                  {/* Department (if Scope === DEPARTMENT) */}
                  {(formScope === 'DEPARTMENT' || user?.role === 'manager') && (
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold text-dark">Target Department</label>
                      <select
                        className="form-select"
                        value={formDepartment}
                        onChange={(e) => setFormDepartment(e.target.value)}
                      >
                        <option value="">Select Department...</option>
                        {departmentsData?.map((dept) => (
                          <option key={dept._id} value={dept._id}>
                            {dept.name} ({dept.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Description / Notes */}
                  <div className="col-12">
                    <label className="form-label small fw-semibold text-dark">Description & Timings</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="e.g. Traditional harvest festival celebration. Afternoon session off from 1:00 PM onwards."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>

                  {/* Published Checkbox */}
                  <div className="col-12">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="publishSwitch"
                        checked={formPublished}
                        onChange={(e) => setFormPublished(e.target.checked)}
                      />
                      <label className="form-check-label small fw-semibold text-dark" htmlFor="publishSwitch">
                        Publish immediately (Send in-app notification to affected employees)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowDeclareModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1"
                  disabled={saveHolidayMutation.isPending || !formName || !formDate}
                  onClick={() => saveHolidayMutation.mutate()}
                >
                  <i className="bi bi-check2" aria-hidden="true" />
                  <span>{saveHolidayMutation.isPending ? 'Saving...' : 'Confirm & Save'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
