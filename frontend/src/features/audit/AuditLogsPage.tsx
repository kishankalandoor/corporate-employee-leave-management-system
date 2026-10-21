import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface AuditLogItem {
  _id: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  ipAddress?: string;
  createdAt: string;
}

export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (actionFilter) params.append('action', actionFilter);

      const res = await api.get<{
        success: boolean;
        data: AuditLogItem[];
        pagination: { total: number; pages: number; page: number };
      }>(`/admin/audit-logs?${params.toString()}`);
      return res.data;
    },
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="container-fluid p-0">
      <div className="mb-4">
        <h4 className="fw-bold text-dark mb-1">System Audit Trail</h4>
        <p className="text-muted small mb-0">Immutable compliance log of authentication, balance changes, and administrative actions.</p>
      </div>

      <div className="card border-0 shadow-sm">
        {isLoading ? (
          <LoadingSpinner message="Loading audit trail records..." />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase text-secondary">
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Description</th>
                    <th>Client IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted small">
                        No audit events recorded.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log._id}>
                        <td className="small text-muted" style={{ whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="small fw-semibold text-dark">{log.actorEmail || 'System'}</td>
                        <td>
                          <span className="badge bg-light text-dark border font-monospace small">
                            {log.action}
                          </span>
                        </td>
                        <td className="small text-secondary">{log.entityType}</td>
                        <td className="small text-dark text-truncate" style={{ maxWidth: '300px' }} title={log.description}>
                          {log.description}
                        </td>
                        <td className="small text-muted font-monospace">{log.ipAddress || 'internal'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.pages > 1 && (
              <div className="card-footer bg-white border-top d-flex justify-content-between align-items-center py-3">
                <span className="small text-muted">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total events)
                </span>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={page >= pagination.pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
