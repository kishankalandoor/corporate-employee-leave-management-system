// Shared TypeScript types for the Leave Management System

export type UserRole = 'employee' | 'manager' | 'admin';
export type UserStatus = 'active' | 'inactive';
export type EmploymentStatus = 'full-time' | 'part-time' | 'contract' | 'on-notice';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type HalfDayType = 'first-half' | 'second-half';

export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  head?: User | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: Department | string;
  manager?: User | string | null;
  jobTitle: string;
  joiningDate: string;
  status: UserStatus;
  employmentStatus: EmploymentStatus;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveType {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isPaid: boolean;
  requiresApproval: boolean;
  allowHalfDay: boolean;
  color: string;
  isActive: boolean;
}

export interface LeavePolicy {
  _id: string;
  leaveType: LeaveType | string;
  department?: Department | string | null;
  employmentStatus: string;
  annualEntitlement: number;
  carryForwardAllowed: boolean;
  maxCarryForwardDays: number;
  minAdvanceNoticeDays: number;
  maxConsecutiveDays?: number;
  allowPastDating: boolean;
  policyYear: number;
}

export interface LeaveRequest {
  _id: string;
  requestNumber: string;
  employee: User | string;
  leaveType: LeaveType | string;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  halfDayType?: HalfDayType;
  workingDays: number;
  reason: string;
  status: LeaveRequestStatus;
  approver?: User | string | null;
  approvedAt?: string;
  approverComments?: string;
  cancelledAt?: string;
  cancelledBy?: User | string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  _id: string;
  employee: User | string;
  leaveType: LeaveType;
  policyYear: number;
  entitlement: number;
  carryForward: number;
  adjustments: number;
  usedDays: number;
  pendingDays: number;
  available: number;
}

export interface Notification {
  _id: string;
  recipient: string;
  type: string;
  title: string;
  message: string;
  relatedEntity?: {
    entityType: string;
    entityId: string;
  };
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  actor?: User | null;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Dashboard types
export interface EmployeeDashboard {
  balances: LeaveBalance[];
  recentRequests: LeaveRequest[];
  pendingCount: number;
  upcomingLeaves: LeaveRequest[];
  usageByType: Array<{ _id: string; totalDays: number; color: string }>;
}

export interface ManagerDashboard {
  teamSize: number;
  pendingCount: number;
  teamOnLeave: LeaveRequest[];
  upcomingAbsences: LeaveRequest[];
  recentDecisions: LeaveRequest[];
  teamUtilization: Array<{ _id: string; totalDays: number; color: string }>;
}

export interface AdminDashboard {
  totalEmployees: number;
  pendingApprovals: number;
  approvedThisYear: number;
  rejectedThisYear: number;
  onLeaveToday: number;
  byLeaveType: Array<{ _id: string; count: number; days: number; color: string }>;
  monthlyTrend: Array<{ _id: { month: number; status: string }; count: number }>;
  departmentStats: Array<{ _id: string; employeeCount: number }>;
}
