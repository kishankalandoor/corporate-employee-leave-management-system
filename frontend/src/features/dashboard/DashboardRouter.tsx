import React from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { EmployeeDashboard } from './EmployeeDashboard.js';
import { ManagerDashboard } from './ManagerDashboard.js';
import { AdminDashboard } from './AdminDashboard.js';

export const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  if (user?.role === 'manager') {
    return <ManagerDashboard />;
  }

  return <EmployeeDashboard />;
};
