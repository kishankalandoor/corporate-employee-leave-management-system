import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.js';
import { Shell } from '../components/layout/Shell.js';
import { LoginPage } from '../features/auth/LoginPage.js';
import { DashboardRouter } from '../features/dashboard/DashboardRouter.js';
import { ApplyLeavePage } from '../features/leaves/ApplyLeavePage.js';
import { MyLeavesPage } from '../features/leaves/MyLeavesPage.js';
import { BalancesPage } from '../features/leaves/BalancesPage.js';
import { LeaveCalendarPage } from '../features/leaves/LeaveCalendarPage.js';
import { HolidayCalendarPage } from '../features/holidays/HolidayCalendarPage.js';
import { PendingApprovalsPage } from '../features/approvals/PendingApprovalsPage.js';
import { ApprovalHistoryPage } from '../features/approvals/ApprovalHistoryPage.js';
import { EmployeeDirectoryPage } from '../features/employees/EmployeeDirectoryPage.js';
import { DepartmentsPage } from '../features/departments/DepartmentsPage.js';
import { LeavePoliciesPage } from '../features/policies/LeavePoliciesPage.js';
import { ReportsPage } from '../features/reports/ReportsPage.js';
import { AuditLogsPage } from '../features/audit/AuditLogsPage.js';
import { NotificationsPage } from '../features/notifications/NotificationsPage.js';
import { ProfilePage } from '../features/profile/ProfilePage.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import { UserRole } from '../types/index.js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner fullPage message="Authenticating session..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="container py-5 text-center">
        <div className="card shadow-sm border-0 p-5 mx-auto" style={{ maxWidth: '500px' }}>
          <i className="bi bi-shield-slash fs-1 text-danger mb-3" aria-hidden="true" />
          <h4 className="fw-bold text-dark">Access Denied</h4>
          <p className="text-secondary small mb-4">
            You do not have administrative permission to view this section.
          </p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardRouter />} />

        {/* Employee */}
        <Route path="leaves/apply" element={<ApplyLeavePage />} />
        <Route path="leaves/my-requests" element={<MyLeavesPage />} />
        <Route path="leaves/balances" element={<BalancesPage />} />
        <Route path="leaves/calendar" element={<LeaveCalendarPage />} />
        <Route path="holidays" element={<HolidayCalendarPage />} />

        {/* Manager & Admin */}
        <Route
          path="approvals"
          element={
            <ProtectedRoute allowedRoles={['manager', 'admin']}>
              <PendingApprovalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="approvals/history"
          element={
            <ProtectedRoute allowedRoles={['manager', 'admin']}>
              <ApprovalHistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Admin only */}
        <Route
          path="admin/employees"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <EmployeeDirectoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/departments"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DepartmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/policies"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <LeavePoliciesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/reports"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/audit"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />

        {/* Shared */}
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
