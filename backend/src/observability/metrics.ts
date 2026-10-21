import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry, prefix: 'lms_' });

// HTTP metrics
export const httpRequestsTotal = new Counter({
  name: 'lms_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'lms_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const httpRequestsInFlight = new Gauge({
  name: 'lms_http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
  registers: [registry],
});

// Business metrics
export const leaveRequestsTotal = new Counter({
  name: 'lms_leave_requests_total',
  help: 'Total number of leave requests submitted',
  labelNames: ['leave_type', 'status'],
  registers: [registry],
});

export const leaveApprovalsTotal = new Counter({
  name: 'lms_leave_approvals_total',
  help: 'Total number of leave approval decisions',
  labelNames: ['decision'],
  registers: [registry],
});

export const pendingApprovalsGauge = new Gauge({
  name: 'lms_pending_approvals_count',
  help: 'Current number of pending leave approval requests',
  registers: [registry],
});

export const activeUsersGauge = new Gauge({
  name: 'lms_active_users_count',
  help: 'Number of active users in the system',
  registers: [registry],
});

// Auth metrics
export const authAttemptsTotal = new Counter({
  name: 'lms_auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['result'],
  registers: [registry],
});
