import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface CalendarEvent {
  _id: string;
  type: 'leave' | 'holiday';
  title: string;
  startDate: string;
  endDate: string;
  workingDays?: number;
  category?: string;
  isOptional?: boolean;
}

export const LeaveCalendarPage: React.FC = () => {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['leave-calendar-events'],
    queryFn: async () => {
      // Fetch upcoming leaves and holidays
      const [leavesRes, holidaysRes] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>('/leaves?status=approved'),
        api.get<{ success: boolean; data: any[] }>('/holidays').catch(() => ({ data: { data: [] } })),
      ]);

      const leaveEvents: CalendarEvent[] = (leavesRes.data.data || []).map((l: any) => ({
        _id: l._id,
        type: 'leave',
        title: `${l.leaveType?.name || 'Leave'} (${l.workingDays}d)`,
        startDate: l.startDate,
        endDate: l.endDate,
        workingDays: l.workingDays,
        category: l.leaveType?.name,
      }));

      const holidayEvents: CalendarEvent[] = (holidaysRes.data.data || []).map((h: any) => ({
        _id: h._id,
        type: 'holiday',
        title: `Holiday: ${h.name}`,
        startDate: h.date,
        endDate: h.date,
        isOptional: h.isOptional,
      }));

      return [...leaveEvents, ...holidayEvents].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
    },
  });

  if (isLoading) return <LoadingSpinner message="Loading leave schedule..." />;

  return (
    <div className="container-fluid p-0">
      <div className="mb-4">
        <h4 className="fw-bold text-dark mb-1">Company Leave & Holiday Schedule</h4>
        <p className="text-muted small mb-0">Overview of scheduled team leaves and company-wide public holidays.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3">
          <h6 className="fw-bold mb-0 text-dark">Chronological Schedule</h6>
        </div>
        <div className="card-body p-0">
          {events.length === 0 ? (
            <div className="text-center py-5 text-muted small">
              <i className="bi bi-calendar-check fs-3 d-block mb-2 text-secondary" aria-hidden="true" />
              No scheduled leaves or holidays found.
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {events.map((e) => (
                <div key={e._id} className="list-group-item p-3 d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className={`p-2 rounded-3 text-white d-flex align-items-center justify-content-center ${
                        e.type === 'holiday' ? 'bg-info' : 'bg-primary'
                      }`}
                      style={{ width: '38px', height: '38px' }}
                    >
                      <i className={`bi ${e.type === 'holiday' ? 'bi-star-fill' : 'bi-airplane-fill'}`} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="fw-semibold text-dark small">{e.title}</div>
                      <div className="text-muted small" style={{ fontSize: '11px' }}>
                        {new Date(e.startDate).toLocaleDateString()}
                        {e.startDate !== e.endDate && ` to ${new Date(e.endDate).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      e.type === 'holiday' ? 'bg-info-subtle text-info' : 'bg-primary-subtle text-primary'
                    }`}
                  >
                    {e.type === 'holiday' ? 'Company Holiday' : 'Approved Leave'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
