import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications-all'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: NotificationItem[] }>('/notifications');
      return res.data.data;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/notifications/${id}/read`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-all'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/notifications/read-all');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-all'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      addToast('success', 'Updated', 'All notifications marked as read');
    },
  });

  if (isLoading) return <LoadingSpinner message="Loading notifications..." />;

  const unreadExist = notifications.some((n) => !n.isRead);

  return (
    <div className="container-fluid p-0" style={{ maxWidth: '800px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Notifications</h4>
          <p className="text-muted small mb-0">System alerts regarding your leave requests and approval decisions.</p>
        </div>
        {unreadExist && (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            <i className="bi bi-check2-all me-1" aria-hidden="true" />
            Mark All as Read
          </button>
        )}
      </div>

      <div className="card border-0 shadow-sm">
        {notifications.length === 0 ? (
          <div className="text-center py-5 text-muted small">
            <i className="bi bi-bell-slash fs-3 d-block mb-2 text-secondary" aria-hidden="true" />
            You have no notifications at this time.
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`list-group-item p-3 d-flex justify-content-between align-items-center ${
                  !n.isRead ? 'bg-primary-subtle bg-opacity-10' : ''
                }`}
              >
                <div className="d-flex align-items-start gap-3">
                  <div
                    className={`p-2 rounded-circle mt-1 ${
                      !n.isRead ? 'bg-primary text-white' : 'bg-light text-secondary'
                    }`}
                  >
                    <i className="bi bi-bell" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-semibold text-dark small">{n.title}</span>
                      {!n.isRead && <span className="badge bg-primary rounded-pill small">New</span>}
                    </div>
                    <p className="text-secondary small mb-1">{n.message}</p>
                    <span className="text-muted" style={{ fontSize: '11px' }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-secondary p-0 text-decoration-none"
                    onClick={() => markAsReadMutation.mutate(n._id)}
                    title="Mark as read"
                  >
                    <i className="bi bi-check2 fs-5" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
